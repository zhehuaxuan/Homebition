# [REQ-021] 订阅任务执行引擎：内部 AI 接口 + 定时调度 + 手动发送

**提出日期**: 2026-07-14
**状态**: 设计稿
**关联需求**: 无

## 1. 原始需求

现有订阅管理功能已支持订阅任务的增删改查、模板管理和接口管理，但缺少核心执行能力。需完善以下能力：

1. 支持内部 AI 接口类型（区别于现有外部 URL），作为订阅任务的数据源
2. 即使两个内部 AI 接口：AI 技术前沿早报（通用 AI 新闻 + AI 编程 + AI 金融）、今日任务拆解
3. 定时调度器定期扫描并执行到点的订阅任务
4. 执行流水线：调用接口 → 获取 JSON → 渲染 EJS 模板 → 发送邮件
5. 订阅任务列表中增加"发送"按钮，支持手动触发执行，方便测试

## 2. 验收标准

- [ ] `api_manager` 表新增 `type` 字段，区分 `external`（外部 URL）和 `internal`（内部 AI 接口）
- [ ] 接口管理界面支持创建和区分两种类型
- [ ] 两个内置 AI 接口注册到 `api_manager`：`AI 技术前沿早报`、`今日任务拆解`
- [ ] `node-cron` 定时调度器每分钟扫描 `subscription` 表，执行到点的订阅任务
- [ ] 执行流水线正确处理 internal 和 external 两种接口类型
- [ ] 流水线正确渲染 EJS 模板并调用 nodemailer 发送邮件
- [ ] 订阅列表每行增加"发送"按钮，调 `POST /api/subscription/execute/:id` 立即执行
- [ ] 接口管理测试功能对 internal 类型同样生效
- [ ] 日志记录调度器执行情况（成功/失败，发送任务数）

## 3. 设计方案

### 3.1 架构概览

```
┌───────────────────────────────────────────────────────┐
│                  node-cron 调度器                       │
│  每分钟扫描 subscription（status=1 + 时间匹配）        │
└──────────┬────────────────────────────────────────────┘
           │ 到点触发
           ▼
┌───────────────────────────────────────────────────────┐
│                   执行流水线 pipeline.js                │
│                                                       │
│  1. 查 subscription，获取 api_id、template、email      │
│  2. 查 api_manager → type 决定调用方式                │
│     ├─ external:  HTTP GET 目标 URL                    │
│     └─ internal:  调注册的内部 handler 函数             │
│  3. 将返回的 JSON 数据传给 EJS 模板                    │
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

### 3.2 数据表变更

`api_manager` 表新增字段：

```sql
ALTER TABLE api_manager
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'external'
    COMMENT 'external: 外部URL, internal: 内部AI接口';
```

### 3.3 后端改动

#### 新增 `server/services/ai.js` — AI 内部接口注册表

每个内部接口对应一个 handler 函数，接收 `(req.db)` 参数，返回 JSON。

```js
const handlers = {
  'ai/tech-news': async (db) => {
    // 调大模型 → 返回结构化 JSON
    // { items: [{ title, summary, url, category }, ...], date: "2026-07-14" }
  },
  'ai/task-breakdown': async (db) => {
    // 查 task 表 → 调大模型分析 → 返回今日工作安排
  }
}
```

#### 新增 `server/services/scheduler.js` — 定时调度器

- 启动时创建设置 `node-cron` 每分钟执行任务
- 扫描 `subscription` 表：`status=1` 且时间匹配
  - 一次性：`send_time` 在当前分钟范围内
  - 周期性：当前是选中星期几 且 `send_time` 在当前分钟范围内
- 命中任务 → 调用 `pipeline.js` 执行
- 日志记录本次扫描结果

#### 新增 `server/services/pipeline.js` — 执行流水线

接收 `(subscriptionRow, db)` 参数：

1. 查 `api_manager` 获取接口信息
2. 如果是 `external` → `fetch(url)` 获取 JSON
3. 如果是 `internal` → 从注册表找 handler 调用
4. 读取 `subscription.template` 对应的 EJS 文件
5. `ejs.render(templateContent, data)` 渲染 HTML
6. 调用 `sendMail({ to: subscription.email, subject, html })`
7. 记录执行日志（成功/失败）

#### 修改 `server/routes/subscription.js`

- 新增 `POST /subscription/execute/:id` — 根据 id 查询订阅任务，调用 pipeline 执行

#### 修改 `server/routes/apiManager.js`

- 接口新增/编辑时支持 `type` 字段
- 接口测试对 `internal` 类型同样生效（返回 handler 执行结果）

#### 修改 `server/index.js`

- 引入并初始化调度器

### 3.4 前端改动

#### `client/src/views/about/Subscription.vue`

- 订阅表格每行增加"发送"按钮
- 调用 `POST /api/subscription/execute/:id`
- 发送中显示 loading 状态，完成后提示成功/失败
- 接口管理 tab 中，新增/编辑接口时显示类型选择（外部 URL / 内部 AI 接口）
- 选择"内部 AI 接口"时，路径变为选择内置 handler（下拉框）

### 3.5 内部 AI 接口定义

| 接口名称 | handler | 功能说明 | 返回数据示例 |
|----------|---------|----------|-------------|
| AI 技术前沿早报 | `ai/tech-news` | 调用大模型生成 AI 前沿资讯，带超链接 | `{ date, items: [{ title, summary, url, category }] }` |
| 今日任务拆解 | `ai/task-breakdown` | 查询任务列表，大模型分析优先级，生成今日工作安排 | `{ date, tasks: [{ title, priority, estimatedTime, notes }] }` |

## 4. 实现计划

1. `npm install node-cron` 安装依赖
2. 修改 `api_manager` 表加 `type` 字段
3. 新建 `server/services/pipeline.js`
4. 新建 `server/services/ai.js` 及两个内部接口
5. 新建 `server/services/scheduler.js`
6. 修改 `server/routes/subscription.js` 加手动执行路由
7. 修改 `server/routes/apiManager.js` 适配 type 字段
8. 修改 `server/index.js` 初始化调度器
9. 修改 `Subscription.vue` 界面：发送按钮 + 接口类型选择
10. 验证：手动发送测试 → 定时发送测试

## 5. 变更清单

- Create: `server/services/pipeline.js`
- Create: `server/services/ai.js`
- Create: `server/services/scheduler.js`
- Modify: `server/routes/subscription.js`
- Modify: `server/routes/apiManager.js`
- Modify: `server/index.js`
- Modify: `client/src/views/about/Subscription.vue`
- Alter: `api_manager` 表新增 `type` 字段
- Install: `node-cron`
