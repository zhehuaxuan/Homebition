# [REQ-020] 前后端日志系统完善

**提出日期**: 2026-07-14
**状态**: 已实现
**关联需求**: 无

## 1. 原始需求

完善 Homebition 前后端日志体系，解决当前日志散乱、无统一格式、无请求追踪、前端日志缺失的问题。

## 2. 验收标准

- [ ] 后端日志通过 winston 统一输出，支持按日轮转和级别分离
- [ ] 每个 HTTP 请求自动记录 method、url、status、duration
- [ ] 全局错误处理中间件捕获所有未处理异常并记录
- [ ] 前端所有 API 请求通过 Axios 拦截器自动记录耗时和状态
- [ ] deepseek.js 中的调试日志已清理
- [ ] 日志规范文档同步更新

## 3. 设计方案

### 3.1 后端改动

#### 3.1.1 新增 `server/services/logger.js`

封装 winston 实例，统一日志出口：

| 配置项 | 值 |
|--------|-----|
| 日志库 | winston + winston-daily-rotate-file |
| 级别 | error → warn → info → debug（production 关闭 debug）|
| 文件输出 | `logs/error-%DATE%.log`（error 级）、`logs/combined-%DATE%.log`（info+）|
| 轮转策略 | 按日轮转，保留 30 天 |
| 控制台 | 彩色输出，带时间戳和级别标签 |

导出 `logger.info()`、`logger.warn()`、`logger.error()` 三个方法，全局共用。

#### 3.1.2 新增 `server/middleware/requestLogger.js`

请求日志中间件：
- 记录请求 method、url、客户端 IP
- 响应完成时计算耗时（ms），输出一条结构日志
- 500+ 状态码输出为 error 级别，400+ 输出为 warn，其余为 info

#### 3.1.3 修改 `server/index.js`

- 引入 `requestLogger` 中间件，挂载在路由之前
- 路由之后追加全局错误处理中间件（4 参数），捕获未处理异常
- 启动日志改为 `logger.info`，移除 emoji

#### 3.1.4 清理 `server/services/deepseek.js`

删除以下调试日志（共 6 行，见设计讨论）：
- `console.log('DeepSeek 返回内容:', content)` — 泄露完整 AI 响应
- `console.log('解析的 JSON:', jsonStr)` — 泄露请求参数
- `console.log('MiniMax 状态码:', response.status)`
- `console.log('收到 SSE 数据长度:', fullData.length)`
- `console.log('MiniMax 返回内容长度:', resultContent.length)`
- `console.log('SSE 流错误:', err)` → 保留但改为 `logger.error`

### 3.2 前端改动

#### 3.2.1 修改 `client/src/main.js`

在 axios 全局实例上添加拦截器：

**请求拦截器**：
- 在每个请求 config 上挂载 `meta.startTime = Date.now()`

**响应拦截器**：
- 成功时：计算耗时 `Date.now() - config.meta.startTime`
- 输出 `[API] {method} {url} → {status} ({duration}ms)`
- GET 请求额外输出返回行数（如 `rows.length`）
- 失败时（网络错误/超时）：输出 `[API] {method} {url} → NETWORK_ERROR`
- HTTP 错误（4xx/5xx）：由下游 `catch` 块处理，拦截器不重复输出

#### 3.2.2 现有关键业务日志

保留现有 9 处 `console.error`，它们提供拦截器无法替代的业务语义（如"获取文章列表失败"）。

### 3.3 文档改动

#### 3.3.1 修改 `docs/superpowers/standards/logging-conventions.md`

- 日志库从 `console.log` 改为 winston
- 更新日志格式示例
- 增加前端日志规范章节
- 更新模块日志标识表

## 4. 实现计划

1. `npm install winston winston-daily-rotate-file`（后端依赖安装）
2. 新建 `server/services/logger.js`
3. 新建 `server/middleware/requestLogger.js`
4. 修改 `server/index.js`（引入中间件 + 错误处理 + 启动日志）
5. 清理 `server/services/deepseek.js` 调试日志
6. 修改 `client/src/main.js`（添加 Axios 拦截器）
7. 更新 `logging-conventions.md`
8. 验证：启动服务，访问各页面，检查日志输出

## 5. 变更清单

- Create: `server/services/logger.js`
- Create: `server/middleware/requestLogger.js`
- Modify: `server/index.js`
- Modify: `server/services/deepseek.js`
- Modify: `client/src/main.js`
- Modify: `docs/superpowers/standards/logging-conventions.md`
- Create: `docs/superpowers/specs/modules/logging-module.md`
- Delete: `server/config/deepseek.xml`
- Install: `winston`, `winston-daily-rotate-file`
