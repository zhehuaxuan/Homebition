# [REQ-023] task-breakdown AI 分析优化：数据增强 + Prompt 返回格式重构

**提出日期**: 2026-07-15
**状态**: 设计稿
**关联需求**: REQ-021（订阅任务执行引擎）、REQ-022（任务管理增强）

## 1. 原始需求

现有 `internal://ai/task-breakdown` 接口的查询数据量不足、Prompt 返回格式不够实用，需要从两方面优化：

1. **数据查询层增强**：把 taskdetail 进展、标签、进度、工作量等信息带入 prompt，让 AI 分析更有依据
2. **返回格式重构**：返回结构需要包含三个部分：
   - `groups`：AI 分析后的优先级分组建议（含 taskId、进度、reason 等字段）
   - `todaySchedule`：AI 按 45 分钟工作/15 分钟休息编排的今日时间表（9:30-11:30 下午 14:00-17:30）
   - `allTasks`：按优先级排序的未完成任务清单（代码生成，不经过 AI）
3. `summary` 字段改为对今日工作清单（todaySchedule）的安排总结

## 2. 验收标准

- [ ] SQL 查询修复 status 字段 INT vs 中文比较的 bug
- [ ] SQL 查询增加 id、workload、progress、tag_names、recent_progress 字段
- [ ] SQL 查询 LEFT JOIN taskdetail 取最近 3 条进展、LEFT JOIN tag 取标签名
- [ ] prompt 返回结构包含 `groups` + `todaySchedule` + `allTasks`
- [ ] `groups` 中 task 包含 taskId、title（原样）、currentStatus、progress、remainDays、priority（4级）、estimatedMinutes（数字）、reason、suggestion
- [ ] `todaySchedule` 按 45min 工作 + 15min 休息编排，5 个工作 slot，含 taskId 和 note
- [ ] `allTasks` 由代码生成（不调 AI），按进行中 > 待启动 > 挂起中排序，同状态超期在前
- [ ] `summary` 改为对今日安排（todaySchedule）的时间段总结
- [ ] EJS 模板适配新结构

## 3. 设计方案

### 3.1 后端改动

**`server/services/ai.js`** — `generateTaskBreakdown` 重写：
- SQL 重构：LEFT JOIN taskdetail（取最近 3 条）、LEFT JOIN tag（标签名聚合）
- status 用 INT 值比较修复 bug
- prompt 模板优化：传入更丰富的任务上下文（进展摘要、进度、工作量、剩余天数）
- 返回格式变为含 groups、todaySchedule、allTasks、summary 的新结构
- 新增代码排序 `allTasks` 的逻辑（不经过 AI）

**`server/templates/task-breakdown.ejs`** — 适配新返回结构渲染

**`server/services/pipeline.js`** — 无需改动，接口路由不变

### 3.2 数据表改动

无。

### 3.3 返回结构定义

```json
{
  "date": "2026-07-15",
  "subject": "今日工作安排 - 2026-07-15",
  "summary": "今日安排了4个任务：上午处理...下午推进...",
  "groups": [
    {
      "name": "紧急优先",
      "description": "已超期或临近截止日的任务",
      "tasks": [
        {
          "taskId": 1,
          "title": "原任务标题（不重写）",
          "currentStatus": "进行中",
          "progress": 60,
          "remainDays": -2,
          "priority": "urgent|high|medium|low",
          "estimatedMinutes": 120,
          "reason": "为什么今天优先做这个",
          "suggestion": "具体执行建议"
        }
      ]
    }
  ],
  "suspendedAdvice": "对挂起任务的建议（AI生成）",
  "todaySchedule": [
    { "timeSlot": "09:30-10:15", "taskId": 1, "title": "原任务名", "note": "..." },
    { "timeSlot": "10:15-10:30", "type": "break", "title": "休息" },
    { "timeSlot": "10:30-11:15", "taskId": 2, "title": "原任务名", "note": "..." },
    { "timeSlot": "11:15-11:30", "type": "break", "title": "缓冲" },
    { "timeSlot": "14:00-14:45", "taskId": 3, "title": "原任务名", "note": "..." },
    { "timeSlot": "14:45-15:00", "type": "break", "title": "休息" },
    { "timeSlot": "15:00-15:45", "taskId": 4, "title": "原任务名", "note": "..." },
    { "timeSlot": "15:45-16:00", "type": "break", "title": "休息" },
    { "timeSlot": "16:00-16:45", "taskId": 5, "title": "原任务名", "note": "..." },
    { "timeSlot": "16:45-17:30", "type": "buffer", "title": "缓冲收尾" }
  ],
  "allTasks": [
    { "taskId": 1, "title": "...", "status": "进行中", "priority": "urgent", "progress": 60, "remainDays": -2 }
  ]
}
```

`allTasks` 排序规则（代码实现）：
- 优先级：进行中(0) > 待启动(1) > 挂起中(2)
- 同状态内按 `remainDays` 升序（超期最严重的排最前）

## 4. 实现计划

按执行顺序：

### Task 1: 重构 SQL 查询
- 修复 status 中文比较 bug
- 增加 id、workload、progress、close_time
- LEFT JOIN taskdetail 取最近 3 条进展摘要
- LEFT JOIN tag 聚合标签名
- 加 LIMIT 30

### Task 2: 增加代码级 allTasks 生成逻辑
- 独立函数 `generateAllTasks(tasks)`，纯代码排序
- 不经过 AI 调用

### Task 3: 重写 Prompt 模板
- 传入丰富字段（进展、进度、工作量、标签、剩余天数）
- 明确 AI 产出 groups 和 todaySchedule 的格式要求
- summary 改为对时间表的总结

### Task 4: JSON 返回解析适配新结构
- 支持 groups、todaySchedule、allTasks 字段
- fallback 逻辑

### Task 5: EJS 模板适配
- 渲染 groups（分组展示）
- 渲染 todaySchedule（时间表）
- 渲染 allTasks（完整列表）
- 适配 4 级优先级颜色

## 5. 变更清单

（实现后自动填充）
