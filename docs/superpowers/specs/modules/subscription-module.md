# 邮件订阅模块设计文档

> **日期**: 2026-07-13
> **文件**: server/routes/subscription.js, server/routes/mailAddress.js, server/routes/template.js, server/routes/mail.js, server/services/mail.js, client/src/views/about/Subscription.vue
> **表**: subscription, mail_address, mail_template

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
- 到达时间后执行一次

### 周期性 (periodic)
- 设置每周的发送日 `week_days: [1,3,5]`
- 设置每日发送时间 `send_time: "09:00:00"`

### 完整执行链路（需要后台调度器）

```
定时触发
  → 查询 subscription WHERE status=1 AND 条件匹配
  → GET api_manager.path (获取数据)
  → ejs.render(template, data)
  → nodemailer.sendMail()
  → 记录发送日志
```

**当前状态**: 定时调度器尚未实现，需要手动触发。

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
