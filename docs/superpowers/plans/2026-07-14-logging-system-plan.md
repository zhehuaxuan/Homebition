# REQ-020 前后端日志系统完善 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Homebition 引入 winston 统一后端日志、请求日志中间件、全局错误处理中间件、前端 Axios 拦截器，实现全链路日志覆盖。

**Architecture:** 后端新增 `services/logger.js`（winston 封装）+ `middleware/requestLogger.js`（请求日志中间件），修改 `index.js`（挂载中间件 + 错误处理）。前端在 `main.js` 添加 Axios 请求/响应拦截器。清理 deepseek 调试日志。

**Tech Stack:** winston, winston-daily-rotate-file, Axios

## Global Constraints

- 后端日志级别: `error` > `warn` > `info` > `debug`（production 关 debug）
- 日志文件按日轮转，保留 30 天，输出到 `server/logs/`
- 前端 Axios 拦截器不重复输出 HTTP 4xx/5xx（由业务 `catch` 处理）
- 保留现有业务 `console.error`，不删除任何业务日志
- 日志格式统一: `[timestamp] [level] [module] message`

---

### Task 1: 安装 winston 依赖

**Files:** `server/package.json`（依赖新增）

- [ ] **安装 winston 和 winston-daily-rotate-file**

```bash
cd E:/Homebition/server
npm install winston winston-daily-rotate-file
```

Expected: `package.json` 的 dependencies 中出现 `"winston"` 和 `"winston-daily-rotate-file"`。

- [ ] **提交依赖变更**

```bash
cd E:/Homebition
git add server/package.json server/package-lock.json
git commit -m "chore: add winston dependencies for logging system"
```

---

### Task 2: 新建 `server/services/logger.js`

**Files:** Create `server/services/logger.js`

- [ ] **编写 logger.js**

```javascript
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');

// 按日轮转的 error 日志
const errorRotate = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  )
});

// 按日轮转的 info+ 日志
const combinedRotate = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'info',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  )
});

// 控制台输出（开发时方便查看）
const consoleTransport = new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level}: ${message}${extra}`;
    })
  )
});

const logger = winston.createLogger({
  transports: [consoleTransport, errorRotate, combinedRotate]
});

module.exports = logger;
```

- [ ] **提交**

```bash
cd E:/Homebition
git add server/services/logger.js
git commit -m "feat: add winston logger service with daily rotate"
```

---

### Task 3: 新建 `server/middleware/requestLogger.js`

**Files:** Create `server/middleware/requestLogger.js`

- [ ] **编写请求日志中间件**

```javascript
const logger = require('../services/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 500 ? 'error'
      : statusCode >= 400 ? 'warn'
      : 'info';

    logger.log(level, `[http] ${method} ${originalUrl} → ${statusCode} (${duration}ms)`, {
      method, url: originalUrl, status: statusCode, duration, ip
    });
  });

  next();
};

module.exports = requestLogger;
```

- [ ] **提交**

```bash
cd E:/Homebition
git add server/middleware/requestLogger.js
git commit -m "feat: add request logging middleware"
```

---

### Task 4: 修改 `server/index.js`

**Files:** Modify `server/index.js`

- [ ] **引入 requestLogger 和 logger**

在 `server/index.js` 顶部补充 require：

```javascript
const requestLogger = require('./middleware/requestLogger');
const logger = require('./services/logger');
```

- [ ] **挂载请求日志中间件**

找到 Token 校验中间件之后的空行，在加载路由之前插入：

```javascript
// 4.6 请求日志（记录所有 HTTP 请求）
app.use(requestLogger);
```

插入位置在第 41 行（`app.use(authMiddleware)`）之后、第 43 行（`// 5. 加载路由`）之前。

- [ ] **在路由之后追加全局错误处理中间件**

在加载所有路由之后、初始化数据库之前插入：

```javascript
// 5.5 全局错误处理中间件（必须在路由之后）
app.use((err, req, res, next) => {
  logger.error('[http] 未捕获错误', {
    url: req.originalUrl, method: req.method, error: err.message, stack: err.stack
  });
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});
```

- [ ] **替换启动日志为 logger**

将第 74 行和第 79 行的 `console.log` 替换为 `logger.info`：

```javascript
// 第 74 行:
logger.info('[mail] 邮件服务已初始化');

// 第 79 行:
logger.info('[server] 服务启动成功：http://localhost:3000');
```

- [ ] **提交**

```bash
cd E:/Homebition
git add server/index.js
git commit -m "feat: integrate request logger, global error handler, and structured startup logs"
```

---

### Task 5: 清理 `server/services/deepseek.js` 调试日志

**Files:** Modify `server/services/deepseek.js`

- [ ] **删除调试日志，保留错误日志**

需要修改的 6 处（行号参考当前文件）：

```diff
-    console.log('DeepSeek 返回内容:', content);
+    // 删除（泄露完整 AI 响应）

-    console.log('解析的 JSON:', jsonStr);
+    // 删除（泄露请求参数）

-    console.log('MiniMax 状态码:', response.status);
+    // 删除

-    console.log('收到 SSE 数据长度:', fullData.length);
+    // 删除

-    console.log('MiniMax 返回内容长度:', resultContent.length);
+    // 删除

-    console.error('SSE 流错误:', err);
+    logger.error('[ai] SSE 流错误', { error: err.message });
```

需要同时引入 logger：

```javascript
const logger = require('../services/logger');
```

在文件顶部 require 区域添加。

- [ ] **提交**

```bash
cd E:/Homebition
git add server/services/deepseek.js
git commit -m "fix: remove debug console.log from deepseek service (leaks AI response data)"
```

---

### Task 6: 前端 Axios 拦截器

**Files:** Modify `client/src/main.js`

- [ ] **在 main.js 中添加 axios 拦截器**

找到 import 区域，在 `import axios from 'axios'` 之后添加：

```javascript
// Axios 请求/响应日志拦截器
axios.interceptors.request.use(config => {
  config.meta = { startTime: Date.now() };
  return config;
});

axios.interceptors.response.use(
  response => {
    const duration = Date.now() - response.config.meta.startTime;
    const { method, url } = response.config;
    const methodUpper = (method || 'GET').toUpperCase();
    let detail = '';
    if (response.data && Array.isArray(response.data.rows)) {
      detail = ` [rows=${response.data.rows.length}]`;
    }
    console.log(`[API] ${methodUpper} ${url} → ${response.status} (${duration}ms)${detail}`);
    return response;
  },
  error => {
    if (error.config && error.config.meta) {
      const duration = Date.now() - error.config.meta.startTime;
      const methodUpper = (error.config.method || 'GET').toUpperCase();
      const url = error.config.url || '';
      if (error.response) {
        // HTTP 4xx/5xx — 由业务 catch 块处理，拦截器不重复输出
      } else {
        console.error(`[API] ${methodUpper} ${url} → NETWORK_ERROR (${duration}ms)`, error.message);
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **提交**

```bash
cd E:/Homebition
git add client/src/main.js
git commit -m "feat: add axios request/response interceptors for API logging"
```

---

### Task 7: 更新日志规范文档

**Files:** Modify `docs/superpowers/standards/logging-conventions.md`

- [ ] **更新文档**

将日志库部分从 `console.log` 改为 winston：

1. 更新第 1 节"当前现状"：改为描述 winston 配置
2. 更新第 2 节"日志级别"：增加 `debug` 级别
3. 更新第 3 节"格式约定"：格式改为 `[timestamp] [level] [module] message`
4. 在第 5 节"文件日志"前增加前端日志章节：

```markdown
## 5. 前端日志

前端使用 Axios 拦截器自动记录 API 请求，输出到浏览器控制台。

### Axios 拦截器格式
```
[API] POST /api/task/add → 200 (45ms)
[API] GET /api/article/list → 200 (12ms) [rows=8]
[API] POST /api/invest/evaluate → NETWORK_ERROR (timeout)
```

关键业务操作仍使用 `console.error` 记录错误（保留原有代码），与拦截器互补。
```

1. 更新文件日志章节编号
2. 删除"禁止事项"中的 `console.log` 调试相关条目（已不适用）

> 注意：逐条编辑时保持其他内容不变，只做必要更新。

- [ ] **提交**

```bash
cd E:/Homebition
git add docs/superpowers/standards/logging-conventions.md
git commit -m "docs: update logging conventions for winston and frontend interceptors"
```

---

### Task 8: 验证

- [ ] **启动后端，检查日志输出**

```bash
cd E:/Homebition/server
npm start
```

预期输出:
```
2026-07-14 14:00:00 info: [server] 服务启动成功：http://localhost:3000
2026-07-14 14:00:00 info: [mail] 邮件服务已初始化
```

- [ ] **访问几个页面，检查请求日志**

在浏览器中打开 http://localhost:5173，访问首页和文章列表。

后端预期输出：
```
2026-07-14 14:01:00 info: [http] GET /api/auth/profile → 200 (12ms)
2026-07-14 14:01:05 info: [http] GET /api/article/list → 200 (8ms)
```

前端控制台预期输出：
```
[API] GET /api/auth/profile → 200 (12ms)
[API] GET /api/article/list → 200 (12ms) [rows=3]
```

- [ ] **检查 logs/ 目录是否生成了文件**

```bash
ls server/logs/
```

预期存在 `error-2026-07-14.log` 和 `combined-2026-07-14.log`。
