# 邮件订阅模块设计文档

> **日期**: 2026-07-14
> **版本**: 2.0（REQ-021 加入执行引擎）
> **文件**: server/routes/subscription.js, server/routes/mailAddress.js, server/routes/template.js, server/routes/mail.js, server/services/mail.js, server/services/pipeline.js, server/services/scheduler.js, server/services/ai.js, client/src/views/about/Subscription.vue
> **表**: subscription, mail_address, mail_template, api_manager

## 架构

```
┌─────────────────────────────────────────────────────┐
│  管理面 (前端 Subscription.vue)                       │
│  ├── 订阅管理 tab: 订阅任务 CRUD + 状态切换             │
│  ├── 邮箱管理 tab: 邮箱地址 CRUD + 搜索                 │
│  ├── 模板管理 tab: EJS 模板 CRUD + 预览 + 变量解析      │
│  └── 接口管理 tab: 外部接口 CRUD + 测试                  │
├─────────────────────────────────────────────────────┤
│  路由层                                              │
│  ├── subscription.js — 订阅任务增删改查                 │
│  ├── mailAddress.js  — 邮箱地址增删改查                 │
│  ├── template.js     — EJS 模板 CRUD + 渲染            │
│  └── mail.js         — 数据库模板发送                    │
├─────────────────────────────────────────────────────┤
│  服务层                                              │
│  └── services/mail.js                                │
│      ├── initTransporter(config) → nodemailer         │
│      ├── renderTemplate(name, data) → ejs.render()    │
│      └── sendMail(options) → transporter.sendMail()   │
├─────────────────────────────────────────────────────┤
│  存储                                                │
│  ├── MySQL: subscription / mail_address / mail_template│
│  └── 文件系统: server/templates/*.ejs                  │
└─────────────────────────────────────────────────────┘
```

## 订阅任务类型

### 一次性 (once)
- 设置具体的发送时间 `send_time`
- 到达时间后执行一次，执行后自动停用

### 周期性 (periodic)
- 设置每周的发送日 `week_days: [1,3,5]`
- 设置每日发送时间 `send_time: "09:00:00"`
- 每次到达时间执行，永不自动停用

### 完整执行链路

```
定时触发 / 手动触发
  → 查询 subscription WHERE status=1 AND 时间匹配
  → 查 api_manager 获取接口信息
  → 若 type=external:  fetch(path) 获取 JSON
  → 若 type=internal:  调内部 AI handler 获取 JSON
  → ejs.render(template, data)
  → nodemailer.sendMail()
  → 记录执行日志
```

## 执行引擎（REQ-021 新增）

### 架构图

```
┌───────────────────────────────────────────────────────┐
│                  node-cron 调度器                       │
│  每分钟扫描 subscription（status=1 + 时间匹配）        │
│  scheduler.js                                          │
└──────────┬────────────────────────────────────────────┘
           │ 到点触发
           ▼
┌───────────────────────────────────────────────────────┐
│                   执行流水线 pipeline.js                │
│                                                       │
│  1. 查 subscription 获取 api_id / template / email    │
│  2. 查 api_manager → type 决定调用方式                │
│     ├─ external:  fetch(path) 获取数据                  │
│     └─ internal:  调 ai.js 中的 handler                  │
│  3. 将 JSON 数据传给 EJS 模板                          │
│  4. ejs.render() 渲染 HTML                            │
│  5. nodemailer.sendMail() 发送                        │
└───────────────────────────────────────────────────────┘
           ▲
           │ 手动触发
┌───────────────────────────────────────────────────────┐
│       POST /api/subscription/execute/:id              │
│       订阅列表"发送"按钮 → 立即执行                    │
└───────────────────────────────────────────────────────┘
```

### 新增文件

#### `server/services/pipeline.js` — 执行流水线

核心函数 `executeSubscription(subscriptionRow, db)`：

```
1. 根据 subscription.api_id 查 api_manager 表
2. 获取接口信息：
   ├─ api_manager.type = 'external': fetch(api_manager.path) → JSON
   └─ api_manager.type = 'internal': 到 ai.js 注册表找 handler → JSON
3. 从 subscription.template 读取 EJS 模板文件
4. ejs.render(content, { data: apiResult }) → html
5. 构建邮件标题：`{subscription.name} - {当前日期}`
6. sendMail({ to: subscription.email, subject, html })
7. 如果是一次性任务，执行后自动将 status 设为 0（停用）
8. 记录结果日志
```

#### `server/services/scheduler.js` — 定时调度器

```
启动时创建 node-cron 每分钟执行的任务：
1. 查询所有 status=1 的订阅任务
2. 对每个任务判断时间是否匹配：
   ├─ 一次性：当前时间 >= send_time 且在 60 秒内
   └─ 周期性：当前 weekday 在 week_days 中 且 当前时:分 == send_time 的时:分
3. 匹配的任务调用 executeSubscription()
4. 并发执行（Promise.allSettled），不影响其他任务
5. 日志记录本次扫描结果
```

#### `server/services/ai.js` — AI 内部接口注册表

```js
const handlers = {
  'ai/tech-news': async (db) => {
    // 调大模型获取 AI 前沿资讯，返回结构化 JSON
  },
  'ai/task-breakdown': async (db) => {
    // 查 task 表，调大模型分析，返回今日工作安排
  }
}
```

### 修改文件

#### `server/routes/subscription.js` — 新增手动执行路由

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/subscription/execute/:id` | 根据 id 查订阅任务，调 pipeline 执行 |

#### `server/routes/apiManager.js` — 接口类型支持

| 变更 | 说明 |
|------|------|
| CRUD 新增 `type` 字段 | 新建/修改时可选 external / internal |
| 测试接口适配 internal | 对 internal 类型调 handler 返回结果 |

#### `server/index.js` — 调度器初始化

```js
const { initScheduler } = require('./services/scheduler');
initScheduler(pool); // 启动时初始化
```

#### `client/src/views/about/Subscription.vue` — UI 变更

订阅列表操作列新增"发送"按钮：

```html
<el-button size="small" type="success" @click="handleExecute(item)">
  发送
</el-button>
```

接口管理表单新增类型选择：

```html
<el-form-item label="接口类型" prop="type" required>
  <el-radio-group v-model="apiForm.type">
    <el-radio label="external">外部 URL</el-radio>
    <el-radio label="internal">内部 AI 接口</el-radio>
  </el-radio-group>
</el-form-item>

<!-- 选择 internal 时显示 handler 选择 -->
<el-form-item v-if="apiForm.type === 'internal'" label="内部接口" required>
  <el-select v-model="apiForm.path" placeholder="选择内部接口">
    <el-option label="AI 技术前沿早报" value="internal://ai/tech-news" />
    <el-option label="今日任务拆解" value="internal://ai/task-breakdown" />
  </el-select>
</el-form-item>
```

### 数据表变更

```sql
ALTER TABLE api_manager
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'external'
    COMMENT 'external: 外部URL, internal: 内部AI接口';
```

### AI 内部接口定义

#### AI 技术前沿早报（`handler: ai/tech-news`）

调用大模型 prompt 要点：

- 搜索/生成近 1-2 天的 AI 前沿资讯
- 覆盖三个分类：通用 AI 新闻、AI 编程、AI 金融
- 每条资讯包含标题、摘要、原文链接
- 返回 JSON 格式，字段必须包含 URL

返回数据结构：

```json
{
  "date": "2026-07-14",
  "subject": "AI 技术前沿早报 - 2026-07-14",
  "items": [
    {
      "title": "标题",
      "summary": "摘要内容",
      "url": "https://...",
      "category": "通用AI/AI编程/AI金融"
    }
  ]
}
```

#### 今日任务拆解（`handler: ai/task-breakdown`）

调用大模型分析任务：

- 查询数据库中的未完成任务列表（status != 已完成）
- 按紧急程度、重要性排序
- 生成今日建议完成的任务清单
- 评估每项任务预计耗时

返回数据结构：

```json
{
  "date": "2026-07-14",
  "subject": "今日工作安排 - 2026-07-14",
  "summary": "今日概述",
  "tasks": [
    {
      "title": "任务标题",
      "priority": "高/中/低",
      "estimatedTime": "2h",
      "notes": "建议说明"
    }
  ]
}
```

## 模板系统

两种模板机制并存：

### EJS 文件模板（`server/templates/*.ejs`）
- 文件系统存储
- 通过 `template.js` 路由进行 CRUD
- 使用 `ejs.render(content, data)` 渲染
- 支持完整 EJS 语法（循环、条件判断）

### 数据库模板（`mail_template` 表）
- 数据库存储
- 通过 `mail.js` 路由发送
- 支持 `{{var}}` 简单变量替换
- 用于较简单的邮件场景

## 管理的关联约束

| 删除操作 | 检查目标 | 动作 |
|----------|----------|------|
| 删除模板 | subscription.template | 被使用则禁止删除 |
| 删除接口 | subscription.api_id | 被使用则禁止删除 |
| 删除邮箱 | subscription.email | 被使用则禁止删除 |
