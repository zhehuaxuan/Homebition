# 日志模块规范

> **日期**: 2026-07-14
> **状态**: 已实现

---

## 1. 模块概述

Homebition 的日志系统分为后端和前端两层：

- **后端**: 基于 winston 的统一日志框架，支持控制台输出和文件轮转
- **前端**: 基于 Axios 拦截器的 API 请求日志记录

### 1.1 后端架构

```
请求进入
  → requestLogger 中间件           ← 记录 method / url / ip / start time
  → authMiddleware + 路由处理
  → 响应完成（res.on('finish')）    ← 记录 status / duration
  → winston logger
      ├── Console (colorized)
      ├── combined-%DATE%.log (info+)
      └── error-%DATE%.log (error 级)
```

### 1.2 前端架构

```
axios 请求
  → 请求拦截器: 记录 startTime
  → API 调用
  → 响应拦截器:
      ├── 成功 → console.log [API] METHOD url → status (duration) [rows=N]
      ├── HTTP 错误 → 静默传递（由业务 catch 处理）
      └── 网络错误 → console.error [API] METHOD url → NETWORK_ERROR (duration)
```

---

## 2. 日志级别

| 级别 | 方法 | 使用场景 |
|------|------|----------|
| ERROR | `logger.error` | 5xx 服务器错误、未捕获异常、数据库写入失败 |
| WARN | `logger.warn` | 4xx 客户端错误、请求超时 |
| INFO | `logger.info` | 启动信息、操作结果、请求日志 |
| DEBUG | `logger.debug` | 调试信息（development 可用，production 关闭） |

---

## 3. 日志格式

### 3.1 控制台格式
```
[2026-07-14 14:00:00] info: [server] 服务启动成功：http://localhost:3000
[2026-07-14 14:00:00] info: [http] POST /api/task/add → 200 (45ms)
[2026-07-14 14:00:05] warn: [http] GET /api/tasks → 401 (2ms)
[2026-07-14 14:00:10] error: [http] POST /api/article/save → 500 (1203ms)
```

### 3.2 文件格式（JSON Lines）
```json
{"timestamp":"2026-07-14 14:00:00","level":"error","message":"[http] 未捕获错误","url":"/api/xxx","method":"POST","error":"Cannot read property","stack":"..."}
```

### 3.3 前端拦截器格式
```
[API] POST /api/task/add → 200 (45ms)
[API] GET /api/article/list → 200 (12ms) [rows=8]
[API] POST /api/invest/evaluate → NETWORK_ERROR (timeout)
```

---

## 4. 后端文件

| 文件 | 职责 |
|------|------|
| `server/services/logger.js` | winston 实例封装，三个 transport |
| `server/middleware/requestLogger.js` | HTTP 请求日志中间件 |
| `server/middleware/auth.js` | Token 校验（401 时被 requestLogger 记录） |

### 4.1 logger.js

winston 配置：
- Console transport: 开发环境 `debug` 级，生产环境 `info` 级，彩色输出
- Error rotate transport: `error-%DATE%.log`，按日轮转，保留 30 天
- Combined rotate transport: `combined-%DATE%.log`，按日轮转，保留 30 天

### 4.2 requestLogger.js

挂载位置：`server/index.js` 中放在 authMiddleware **之前**，确保 401 拒绝也能被记录。

| 状态码 | 日志级别 |
|--------|----------|
| 500+ | error |
| 400-499 | warn |
| 200-399 | info |

### 4.3 全局错误处理中间件

挂载在所有路由之后、DB 初始化之前。捕获未处理异常并返回 `{ code: 500, msg: '服务器内部错误' }`。

---

## 5. 各模块日志标识

| 路由文件 | 模块标签 | 关键日志点 |
|----------|----------|-----------|
| auth.js | `[auth]` | 登录成功/失败、用户初始化 |
| article.js | `[article]` | 保存/更新/同步结果 |
| task.js | `[task]` | 新增/修改/状态变更 |
| tag.js | `[tag]` | 新增/删除 |
| upload.js | `[upload]` | 文件上传成功/失败 |
| subscription.js | `[subscription]` | 任务创建/更新/切换 |
| mailAddress.js | `[mail-addr]` | 邮箱 CRUD |
| template.js | `[template]` | 模板创建/更新/删除 |
| apiManager.js | `[api-mgr]` | 接口测试结果 |
| invest.js | `[invest]` | 验证/评估结果 |
| deepseek.js | `[ai]` | DeepSeek/MiniMax 调用 |
| index.js（服务） | `[server]` / `[http]` / `[mail]` | 启动、请求日志、邮件服务 |

---

## 6. 技术债务

- `server/routes/` 中的 `console.error` 尚未全部替换为 `logger.error`
- `server/services/deepseek.js` 中有两处 `console.error`（DeepSeek/MiniMax API 调用失败）尚未替换
