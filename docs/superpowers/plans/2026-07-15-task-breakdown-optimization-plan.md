# task-breakdown 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 `internal://ai/task-breakdown` 的数据查询层和 Prompt 返回格式：增强 SQL 查询丰富度（含进展、标签、进度等）、重构返回结构（groups + todaySchedule + allTasks + summary）、修复 status 中文比较 bug。

**Architecture:** 不改动接口路由和调用链路，只改动 `server/services/ai.js` 中的 `generateTaskBreakdown` 函数逻辑和 `server/templates/task-breakdown.ejs` 模板渲染。

**Tech Stack:** Node.js (Express + mysql2), EJS, DeepSeek API

## Global Constraints

- Node.js v18+ (existing project)
- API 响应格式不变，仍通过 `pipeline.js` → `executeHandler` 返回
- `internal://ai/task-breakdown` 接口路径不变
- 不自动重启前后端服务、不自动 git 操作（用户偏好）

---

### Task 1: 重构 SQL 查询（数据增强 + bug 修复）

**Files:**
- Modify: `E:/Homebition/server/services/ai.js` — `generateTaskBreakdown` 函数

**Changes:**
1. 修复 status 字段用 INT 值比较（`!= 2` 替代 `!= '已完成'`）
2. 修复 status 排序用 INT 值（`WHEN 1 THEN 0` 替代 `WHEN '进行中' THEN 0`）
3. 增加查询字段：`t.id`, `t.workload`, `t.progress`, `t.close_time`, `t.tags`
4. LEFT JOIN `taskdetail` 聚合最近 3 条进展摘要（按 `create_time DESC` 取）
5. LEFT JOIN `tag` 用 `FIND_IN_SET` 聚合标签中文名
6. 加 `LIMIT 30` 防止 prompt 超长

- [ ] **Step 1: 重写 SQL 查询语句**

```sql
SELECT
  t.id, t.title, t.target, t.status, t.importance,
  t.workload, t.progress, t.close_time,
  DATEDIFF(t.close_time, NOW()) AS remain_days,
  GROUP_CONCAT(DISTINCT tg.name ORDER BY tg.id SEPARATOR '、') AS tag_names,
  SUBSTRING_INDEX(
    GROUP_CONCAT(td.content ORDER BY td.create_time DESC SEPARATOR ' ||| '),
    ' ||| ', 3
  ) AS recent_progress
FROM task t
LEFT JOIN taskdetail td ON td.task_id = t.id
LEFT JOIN tag tg ON FIND_IN_SET(tg.id, t.tags)
WHERE t.status != 2
GROUP BY t.id
ORDER BY
  CASE t.status
    WHEN 1 THEN 0
    WHEN 0 THEN 1
    WHEN 3 THEN 2
  END,
  remain_days ASC
LIMIT 30
```

- [ ] **Step 2: 更新 prompt 中任务列表的展示方式**

将每条任务格式化为包含完整上下文：

```
### 任务ID: {id}
- 标题：{title}
- 目标：{target}
- 状态：{statusText}
- 重要性：{importance}/5
- 预估工作量：{workload} 人天
- 当前进度：{progress}%
- 截止日期：{close_time}（剩余 {remainDays} 天）
- 标签：{tag_names}
- 最近进展：
  > {recentProgressLines}
```

---

### Task 2: 增加 allTasks 代码生成逻辑

**Files:**
- Modify: `E:/Homebition/server/services/ai.js`

**Changes:**
- 新增独立函数 `buildAllTasks(tasks)`，纯代码排序，不调 AI
- 返回所有未完成任务，按状态 + 剩余天数排序

- [ ] **Step 1: 实现 `buildAllTasks(tasks)` 函数**

```javascript
function buildAllTasks(tasks) {
  const statusMap = { 0: '待启动', 1: '进行中', 3: '挂起中' };
  const sorted = [...tasks].sort((a, b) => {
    const statusOrder = { 1: 0, 0: 1, 3: 2 };
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return (a.remain_days ?? 999) - (b.remain_days ?? 999);
  });
  return sorted.map(t => ({
    taskId: t.id,
    title: t.title,
    status: statusMap[t.status] || '未知',
    priority: calcPriority(t.remain_days, t.importance),
    progress: t.progress || 0,
    remainDays: t.remain_days
  }));
}
```

- [ ] **Step 2: 计算优先级函数 `calcPriority`**

```javascript
function calcPriority(remainDays, importance) {
  if (remainDays < 0) return 'urgent';
  if (remainDays <= 3 || importance >= 5) return 'high';
  if (importance >= 3) return 'medium';
  return 'low';
}
```

---

### Task 3: 重写 Prompt 模板

**Files:**
- Modify: `E:/Homebition/server/services/ai.js`

**Changes:**
- prompt 中传入丰富任务上下文
- 明确定义 groups 和 todaySchedule 的返回格式要求
- summary 改为对 todaySchedule 的时间安排总结

- [ ] **Step 1: 编写新 prompt**

```
你是一个任务管理助手。请分析以下任务列表，生成今日重点工作安排。

当前日期：{dateStr}

## 任务列表

共 {count} 个未完成任务：

{formattedTasks}

## 输出要求

请返回 JSON，包含以下三个部分：

### 1. groups — 今日推荐任务分组
- 建议今日推进 2-5 个任务，按场景分组（如「紧急优先」「今日推进」「可暂缓」）
- 每个任务必须包含所有字段
- title 使用原任务标题，不要改写
- priority 取值 urgent(已超期) / high(3天内到期或重要性5) / medium / low
- estimatedMinutes 单位为分钟

### 2. suspendedAdvice — 对挂起中的任务的建议（一句话）

### 3. todaySchedule — 今日时间安排
- 排入今日要做的任务，最多 5 个
- 上午 09:30-11:30（2小时），下午 14:00-17:30（3.5小时）
- 每 45 分钟一个 slot，中间休息 15 分钟
- 最后一个 slot 16:00-16:45，16:45-17:30 为缓冲收尾
- type=break 为休息，type=buffer 为缓冲
- note 字段写该时段做什么的具体说明

### 4. summary — 今日安排总结
- 一句话总结今天的时间安排，如「今日共安排3个任务：上午处理A和B，下午推进C」
```

- [ ] **Step 2: JSON 返回格式定义（在 prompt 中附上）**

```json
{
  "date": "{dateStr}",
  "subject": "今日工作安排 - {dateStr}",
  "summary": "今日安排总结（一句话）",
  "groups": [
    {
      "name": "分组名称",
      "description": "分组说明",
      "tasks": [
        {
          "taskId": 1,
          "title": "原任务标题",
          "currentStatus": "进行中",
          "progress": 60,
          "remainDays": -2,
          "priority": "urgent|high|medium|low",
          "estimatedMinutes": 120,
          "reason": "为什么今天优先",
          "suggestion": "具体执行建议"
        }
      ]
    }
  ],
  "suspendedAdvice": "对挂起任务的建议",
  "todaySchedule": [
    { "timeSlot": "09:30-10:15", "taskId": 1, "title": "原任务名", "note": "说明" },
    { "timeSlot": "10:15-10:30", "type": "break", "title": "休息" },
    { "timeSlot": "10:30-11:15", "taskId": 2, "title": "原任务名", "note": "说明" },
    { "timeSlot": "11:15-11:30", "type": "break", "title": "缓冲" },
    { "timeSlot": "14:00-14:45", "taskId": 3, "title": "原任务名", "note": "说明" },
    { "timeSlot": "14:45-15:00", "type": "break", "title": "休息" },
    { "timeSlot": "15:00-15:45", "taskId": 4, "title": "原任务名", "note": "说明" },
    { "timeSlot": "15:45-16:00", "type": "break", "title": "休息" },
    { "timeSlot": "16:00-16:45", "taskId": 5, "title": "原任务名", "note": "说明" },
    { "timeSlot": "16:45-17:30", "type": "buffer", "title": "缓冲收尾" }
  ]
}
```

---

### Task 4: JSON 解析适配新结构 + fallback

**Files:**
- Modify: `E:/Homebition/server/services/ai.js`

**Changes:**
- 解析后合并 AI 生成内容 + 代码生成的 `allTasks`
- 合并返回最终的完整 JSON

- [ ] **Step 1: 解析和合并逻辑**

```javascript
// AI 返回的 JSON
const result = JSON.parse(jsonMatch[0]);
// 附加代码生成的 allTasks
result.allTasks = buildAllTasks(tasks);
// 返回合并结果
return result;
```

---

### Task 5: EJS 模板适配新结构

**Files:**
- Modify: `E:/Homebition/server/templates/task-breakdown.ejs`

**Changes:**
- 新增 groups 分组渲染区域（带 4 级优先级颜色：urgent=深红、high=橙、medium=蓝、low=绿）
- 新增 todaySchedule 时间表渲染（用表格或时间轴布局）
- 新增 allTasks 完整任务清单（折叠/展开或置底列表）
- 保留原 summary 字段但内容已改为时间安排总结

- [ ] **Step 1: 模板结构示意**

```
┌─ Header ──────────────────────────┐
│  今日工作安排                      │
│  <summary>                         │
├─ Today Schedule ──────────────────┤
│  [09:30-10:15] 任务A              │
│  [10:15-10:30] ☕ 休息             │
│  [10:30-11:15] 任务B              │
│  ...                               │
├─ Priority Groups ────────────────┤
│  🔴 紧急优先                       │
│   任务1 (进度60%) → 建议...        │
│  🟠 今日推进                       │
│   任务3 (进度30%) → 建议...        │
├─ Suspended Advice ───────────────┤
│  对挂起任务的建议                   │
├─ All Tasks ──────────────────────┤
│  [urgent] 任务1 (超期2天)          │
│  [high]   任务2 (剩余3天)          │
│  ...                               │
└────────────────────────────────────┘
```

---

### 完整变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/services/ai.js` | 修改 | 重构 SQL、新增 buildAllTasks、重写 prompt、解析合并 |
| `server/templates/task-breakdown.ejs` | 修改 | 适配新返回结构渲染 |
