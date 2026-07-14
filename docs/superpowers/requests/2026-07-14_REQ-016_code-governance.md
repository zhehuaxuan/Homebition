# [REQ-016] 代码规范性治理

**提出日期**: 2026-07-14
**状态**: 已治理
**已同步**: 2026-07-14
**关联需求**: 无

## 1. 原始需求

代码需要规范，方便后续维护。目前存在 API 响应格式不统一、后端接口无认证保护、敏感配置硬编码、user 表字段名不一致等问题。

## 2. 验收标准

- [x] API 响应格式统一为 `{ code: 0, data, message }`
- [x] 后端接口添加 token 校验中间件
- [x] 硬编码的配置（数据库密码、AI Key）抽取到环境变量
- [x] `user` 表双字段统一
- [ ] ⏸️ 密码从明文存储改为 bcrypt 哈希（暂不处理）

## 3. 设计方案

### 3.1 API 响应格式统一

当前后端路由存在三种格式混用的问题，需要统一为 `{ code: 0, data, message }`：

| 格式 | 使用文件 | 问题 |
|------|----------|------|
| `{ code: 0/1, msg }` | article.js, invest.js | 成功用 `0` 失败用 `1`，字段是 `msg` 不是 `message` |
| `{ code: 200/400/500, message }` | auth.js, subscription.js 等 | 成功用 `200` 不是 `0` |
| 无 `code` 字段 | tag.js, task.js(部分) | 完全无 code，数据字段用 `list` |

统一目标：
- 成功 code 统一为 `0`
- 失败 code 与 HTTP 状态码保持一致（400/401/404/500）
- 错误字段统一为 `message`（不用 `msg`）
- 列表数据统一放 `data`（不用 `list`/`rows`）

### 3.2 Token 校验中间件

**架构**：

```
请求 → authMiddleware (server/middleware/auth.js)
  ├── 公开路由白名单？ → 直接放行
  └── 受保护路由？
       ├── 有合法 Bearer token？ → 放行 (req.user = { username })
       └── 无/无效 token → 401 { code: 401, message: '未登录' }

前端 axios 拦截器 (client/src/main.js)
  ├── 请求拦截器：自动从 sessionStorage 读取 token 附加到 header
  └── 响应拦截器：401 触发 session-expired 事件
```

**公开路由白名单**：

| 路径 | 方法 | 用途 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/profile` | GET | 首页个人介绍 |
| `/api/auth/logout` | POST | 退出 |
| `/api/auth/send-mail` | POST | 发送邮件 |
| `/api/auth/test-mail-template` | GET | 测试邮件模板 |
| `/api/article/list` | GET | 文章列表 |
| `/api/article/detail` | GET | 文章详情 |

### 3.3 环境变量

从以下位置抽取出敏感配置，放入 `server/.env`：

| 当前位置 | 配置项 |
|----------|--------|
| `server/index.js:18` | 数据库密码 `admin` |
| `server/config/deepseek.xml` | DeepSeek/Minimax API Key、BaseURL、Model |
| `server/config/mail.js` | 邮箱密码、SMTP 配置 |

### 3.4 user 表字段统一

当前 `auth.js` 有运行时检测 `SHOW COLUMNS` 来兼容 `username`/`user` 两个字段名的逻辑。确认数据库已是 `username` 字段后，移除兼容代码，直接使用 `username`。

## 4. 变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/middleware/auth.js` | 新建 | Token 校验中间件 |
| `client/src/main.js` | 修改 | 添加 axios 拦截器 |
| `server/.env` | 新建 | 环境变量配置 |
| `server/index.js` | 修改 | dotenv 加载 + 数据库配置改读环境变量 |
| `server/config/mail.js` | 修改 | 读环境变量 |
| `server/services/deepseek.js` | 修改 | 读环境变量，移除 xml2js 依赖 |
| `server/routes/auth.js` | 修改 | API 格式 + 移除 hasUsername 兼容代码 |
| `server/routes/article.js` | 修改 | API 格式统一 |
| `server/routes/task.js` | 修改 | API 格式统一 |
| `server/routes/invest.js` | 修改 | API 格式统一 |
| `server/routes/tag.js` | 修改 | API 格式统一 |
| `server/routes/subscription.js` | 修改 | API 格式统一 |
| `server/routes/mailAddress.js` | 修改 | API 格式统一 |
| `server/routes/template.js` | 修改 | API 格式统一 |
| `server/routes/apiManager.js` | 修改 | API 格式统一 |
| `server/routes/mail.js` | 修改 | API 格式统一 |
| `client/src/views/Home.vue` | 修改 | 适配新格式 |
| `client/src/views/MyArticles.vue` | 修改 | 适配新格式 |
| `client/src/views/MyTasks.vue` | 修改 | 适配新格式 |
| `client/src/views/article/ArticleEdit.vue` | 修改 | 适配新格式 |
| `client/src/views/invest/Enterprise.vue` | 修改 | 适配新格式 |
| `client/src/views/about/ArticleList.vue` | 修改 | 适配新格式 |
| `client/src/views/about/Task.vue` | 修改 | 适配新格式 |
| `client/src/views/about/Tag.vue` | 修改 | 适配新格式 |
| `client/src/views/about/Subscription.vue` | 修改 | 适配新格式 |
| `client/src/views/MailTest.vue` | 修改 | 适配新格式 |
