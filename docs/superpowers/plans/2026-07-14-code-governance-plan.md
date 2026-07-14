# 代码规范性治理 Implementation Plan

**Goal:** 统一 API 响应格式、添加 token 校验中间件、敏感配置抽取到环境变量、移除 user 表双字段兼容代码。

**Architecture:** 服务端中间件 + 前端 axios 拦截器 + 路由文件格式改写 + 配置迁移到 .env

**Tech Stack:** Node.js + Vue 3 + dotenv

**Design Doc:** `docs/superpowers/requests/2026-07-14_REQ-016_code-governance.md`

---

## Task 1: Token 校验中间件

**Files:**
- Create: `server/middleware/auth.js`
- Modify: `server/index.js` — 挂载中间件
- Modify: `client/src/main.js` — 添加 axios 拦截器

- [ ] **Step 1: 创建 authMiddleware**

```js
// server/middleware/auth.js
const PUBLIC_ROUTES = [...];  // 公开路由白名单

const authMiddleware = (req, res, next) => {
  // 公开路由放行
  // 检查 Authorization: Bearer <token>
  // 解码 token 提取用户名 → req.user
  // 无效 → 401
};
```

- [ ] **Step 2: 在 index.js 挂载中间件**

在 `express.json()` 之后、路由加载之前插入：`app.use(authMiddleware)`

- [ ] **Step 3: 前端 axios 拦截器**

在 `client/src/main.js` 中添加：
- 请求拦截器：从 `sessionStorage` 取 token，附到 `Authorization` header
- 响应拦截器：401 时触发 `session-expired` 事件

---

## Task 2: API 响应格式统一

### Task 2.1: article.js / invest.js 整改

**Files:**
- Modify: `server/routes/article.js`
- Modify: `server/routes/invest.js`

改动：
- `code: 1` 错误改为 HTTP 状态码 `code: 400`/`code: 500`
- `msg` → `message`
- `rows` → `data`
- 补充 `res.status()` 调用

### Task 2.2: auth.js / subscription.js / mailAddress.js / mail.js 整改

**Files:**
- Modify: `server/routes/auth.js`
- Modify: `server/routes/subscription.js`
- Modify: `server/routes/mailAddress.js`
- Modify: `server/routes/mail.js`

改动：
- `code: 200` → `code: 0`（成功时）
- `list` → `data` 字段名

### Task 2.3: template.js / apiManager.js / tag.js / task.js 整改

**Files:**
- Modify: `server/routes/template.js`
- Modify: `server/routes/apiManager.js`
- Modify: `server/routes/tag.js`
- Modify: `server/routes/task.js`

改动：
- tag.js：新增 `code` 字段，`list` → `data`
- template.js / apiManager.js：`code: 200` → `code: 0`，`list` → `data`
- task.js：统一 code 字段，`list` → `data`，`msg` → `message`

### Task 2.4: 前端适配

**Files:**
- Modify: `client/src/views/Home.vue` — `code === 200` → `code === 0`
- Modify: `client/src/views/MyArticles.vue` — `rows` → `data`
- Modify: `client/src/views/MyTasks.vue` — `list` → `data`
- Modify: `client/src/views/article/ArticleEdit.vue` — `msg` → `message`
- Modify: `client/src/views/invest/Enterprise.vue` — `msg` → `message`
- Modify: `client/src/views/about/ArticleList.vue` — `rows` → `data`, `msg` → `message`
- Modify: `client/src/views/about/Task.vue` — `list` → `data`
- Modify: `client/src/views/about/Tag.vue` — `list` → `data`
- Modify: `client/src/views/about/Subscription.vue` — `code === 200` → `code === 0`, `list` → `data`
- Modify: `client/src/views/MailTest.vue` — `code === 200` → `code === 0`

---

## Task 3: 环境变量

**Files:**
- Create: `server/.env`
- Modify: `server/index.js`
- Modify: `server/config/mail.js`
- Modify: `server/services/deepseek.js`

- [ ] **Step 1: 创建 .env 文件**

包含数据库、AI Key、邮件配置。

- [ ] **Step 2: 修改 index.js**

加入 `require('dotenv').config()`，数据库 pool 配置改为 `process.env.DB_*`

- [ ] **Step 3: 修改 mail.js**

SMTP 配置改为 `process.env.MAIL_*`

- [ ] **Step 4: 修改 deepseek.js**

从 XML 文件改为 `process.env.DEEPSEEK_*` / `process.env.MINIMAX_*`

- [ ] **Step 5: 安装 dotenv 依赖**

`npm install dotenv`

---

## Task 4: user 表字段统一

**Files:**
- Modify: `server/routes/auth.js`

- [ ] **Step 1: 确认数据库字段**

确认 `user` 表当前是 `username` 列。

- [ ] **Step 2: 移除兼容代码**

删除三处 `hasUsername` / `userField` 变量定义，直接使用 `username`：
- `initAdminUser` 函数内
- `login` 路由内
- `profile` 路由内
