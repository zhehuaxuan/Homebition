# Homebition API 接口设计文档

> **日期**: 2026-07-13
> **版本**: v1 (current)
> **覆盖**: 全部 11 个路由模块，约 55+ 个接口

---

## 总览

所有 API 均挂载在 `/api` 前缀下，HTTP 方法 + 路径构成完整端点。

- **基础 URL**: `http://localhost:3000/api`（开发环境通过 Vite Proxy）
- **请求格式**: `Content-Type: application/json`
- **响应格式**: 各模块独立约定（详见下文）
- **认证方式**: 无全局认证中间件，当前基于前端 UI 保护

---

## 1. 认证模块（auth.js）

### POST /api/auth/login

管理员登录。

**请求:**
```json
{ "username": "xuanzhehua", "password": "224539" }
```
**响应 (200):**
```json
{ "code": 200, "message": "登录成功", "token": "<base64>", "user": { "username": "xuanzhehua" } }
```
**响应 (401):**
```json
{ "code": 401, "message": "用户名或密码错误" }
```

### POST /api/auth/logout

退出登录（无操作，仅返回成功）。

**响应:**
```json
{ "code": 200, "message": "退出成功" }
```

### GET /api/auth/profile

获取用户个人信息。

**响应:**
```json
{ "code": 200, "data": { "username": "xuanzhehua", "profile": "<html>" } }
```

### POST /api/auth/send-mail

发送邮件测试。

**请求:**
```json
{ "to": "xxx@mail.com", "subject": "标题", "content": "内容", "template": "welcome.ejs", "data": {} }
```
**响应:**
```json
{ "code": 200, "message": "邮件发送成功" }
```

### GET /api/auth/test-mail-template

测试邮件模板（固定发送到管理员邮箱）。

**响应:**
```json
{ "code": 200, "message": "测试邮件发送成功" }
```

---

## 2. 文章模块（article.js）

### GET /api/article/list?title=关键词

获取文章列表。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 按标题模糊搜索 |

**响应:**
```json
{ "code": 0, "msg": "success", "rows": [{ "id": 1, "title": "...", "create_time": "...", "last_time": "...", "url": "..." }], "total": 1 }
```

### POST /api/article/save

保存新文章。

**请求:**
```json
{ "title": "文章标题", "content": "<html>富文本内容</html>" }
```
**响应:**
```json
{ "code": 0, "msg": "文章提交保存成功", "data": { "articleId": 1 } }
```

### GET /api/article/detail/:id

获取文章详情。

**响应:**
```json
{ "code": 0, "data": { "id": 1, "title": "...", "content": "...", "create_time": "...", "last_time": "...", "url": "..." } }
```
**不存在:** `{ "code": 1, "msg": "文章不存在" }`

### POST /api/article/update

更新文章内容。

**请求:**
```json
{ "id": 1, "title": "新标题", "content": "新内容" }
```
**响应:**
```json
{ "code": 0, "msg": "更新成功" }
```

### POST /api/article/sync

从 GitHub Pages 同步文章。

**响应:**
```json
{ "code": 0, "msg": "同步成功", "data": { "synced": 5, "skipped": 12 } }
```
- `synced`: 新同步的文章数
- `skipped`: 已存在的跳过数

---

## 3. 任务模块（task.js）

### GET /api/tasks

获取全量任务列表。

**响应:**
```json
{ "list": [{ "id": 1, "title": "...", "target": "...", "status": 0, "importance": 3, "tags": "[1,2]", "create_time": "...", "close_time": "..." }] }
```

### POST /api/task/add

新增任务。

**请求:**
```json
{ "title": "任务名", "target": "目标", "create_time": "2026-01-01", "close_time": "2026-06-01", "status": 0, "importance": 3, "tagIds": [1, 2] }
```
**响应:** `{ "message": "新增成功", "id": 1 }`

### POST /api/task/update

修改任务（全字段覆盖）。

**请求:**
```json
{ "id": 1, "title": "新标题", "importance": 2, "target": "新目标", "create_time": "...", "close_time": "...", "tagIds": [1] }
```

### PUT /api/task/update/:id

简版任务更新。

**请求:**
```json
{ "title": "新标题", "target": "新目标", "status": 1 }
```

### POST /api/task/updateStatus

状态流转。

**请求:**
```json
{ "id": 1, "status": 1 }
```

| status | 含义 |
|--------|------|
| 0 | 待启动 |
| 1 | 进行中 |
| 2 | 已完成 |
| 3 | 其他 |

### POST /api/task/delay

任务延期（修改闭环时间）。

**请求:**
```json
{ "id": 1, "close_time": "2026-07-01" }
```

### DELETE /api/task/delete/:id

删除任务。

### POST /api/task/progress/add

添加任务进展。

**请求:**
```json
{ "taskId": 1, "content": "进展描述" }
```
**响应:** `{ "code": 200, "msg": "进展提交成功", "data": 1 }`

### GET /api/task/progress/:taskId

获取任务进展列表。

**响应:**
```json
{ "code": 200, "list": [{ "id": 1, "content": "...", "create_time": "..." }] }
```

---

## 4. 标签模块（tag.js）

### GET /api/tags

获取全量标签列表。

**响应:**
```json
{ "list": [{ "id": 1, "name": "bug", "color": "", "create_time": "..." }] }
```

### POST /api/tag/add

新增标签。

**请求:** `{ "name": "bug" }`
**响应:** `{ "message": "新增成功", "id": 1 }`

### PUT /api/tag/update/:id

更新标签名。

**请求:** `{ "name": "新名称" }`

### DELETE /api/tag/delete/:id

删除标签。

---

## 5. 上传模块（upload.js）

### POST /api/upload/image

WangEditor 富文本图片上传。

**请求:** `Content-Type: multipart/form-data`, field: `file`

| 限制 | 值 |
|------|-----|
| 文件大小 | 5MB |
| 格式 | JPG/PNG/GIF |
| 存储 | `uploads/` 目录 |

**响应:**
```json
{ "code": 0, "data": { "url": "http://localhost:3000/api/uploads/file-xxx.jpg" }, "msg": "上传成功" }
```

### GET /api/uploads/:file

静态文件访问（Express static）。

---

## 6. 订阅模块（subscription.js）

### GET /api/subscriptions

获取订阅任务列表。

**响应:**
```json
{ "code": 200, "list": [{ "id": 1, "name": "...", "type": "once|periodic", "send_time": "...", "week_days": [1,3,5], "email": "...", "template": "welcome.ejs", "api_id": 1, "status": 1, "create_time": "..." }] }
```

### GET /api/subscription/:id

获取单个订阅任务详情。

### POST /api/subscription/add

创建订阅任务。

**请求:**
```json
{ "name": "每日推送", "type": "periodic", "send_time": "09:00:00", "week_days": [1,2,3,4,5], "email": "xxx@mail.com", "template": "task_list.ejs", "api_id": 1, "status": 1 }
```

### PUT /api/subscription/update/:id

更新订阅任务。

### DELETE /api/subscription/delete/:id

删除订阅任务。

### POST /api/subscription/toggle/:id

切换启用/停用状态。

---

## 7. 邮箱管理模块（mailAddress.js）

### GET /api/mails

获取邮箱地址列表。

**响应:** `{ "code": 200, "list": [...] }`

### POST /api/mail/add

新增邮箱。

**请求:** `{ "name": "个人邮箱", "address": "xxx@mail.com", "type": "personal" }`

### PUT /api/mail/update/:id

更新邮箱信息。

### DELETE /api/mail/delete/:id

删除邮箱（含订阅使用检查）。

---

## 8. EJS 模板模块（template.js）

### GET /api/templates

获取 EJS 模板文件列表。

**响应:**
```json
{ "code": 200, "list": [{ "name": "welcome.ejs", "path": "/templates/welcome.ejs", "size": 1234, "updated_at": "...", "preview": "..." }] }
```

### GET /api/template/:name

获取单个模板内容。

**响应:** `{ "code": 200, "name": "welcome.ejs", "content": "<html>..." }`

### POST /api/template

创建新模板。

**请求:** `{ "name": "new.ejs", "content": "<html>..." }`
**约束:** 文件名必须以 `.ejs` 结尾

### PUT /api/template/:name

更新模板内容。

### DELETE /api/template/:name

删除模板（含订阅使用检查）。

### POST /api/template/render

渲染模板并返回 HTML。

**请求:** `{ "template": "welcome.ejs", "data": { "username": "张三" } }`
**响应:** `{ "code": 200, "html": "<html>渲染结果</html>" }`

---

## 9. 邮件模板模块（mail.js）

### POST /api/mail/send-with-template

使用 mail_template 表模板发送邮件（支持 `{{var}}` 变量替换）。

**请求:**
```json
{ "templateCode": "WELCOME", "to": "xxx@mail.com", "variables": { "name": "张三" } }
```

---

## 10. 外部接口管理模块（apiManager.js）

### GET /api/apis

获取已注册的外部接口列表。

**响应:** `{ "code": 200, "list": [...] }`

### POST /api/api/add

注册外部接口。

**请求:** `{ "name": "获取天气", "path": "https://api.weather.com/now", "description": "..." }`

### PUT /api/api/update/:id

更新接口信息。

### DELETE /api/api/delete/:id

删除接口（含订阅使用检查）。

### POST /api/api/test/:id

测试接口（发送 GET 请求，仅支持 JSON 响应）。

---

## 11. 闪念模块（flashIdeas.js）

路由文件：`server/routes/flashIdeas.js`，表：`flash_ideas`

### GET /api/flash-ideas

获取闪念列表（倒序，含关联任务信息）。自动检测关联任务状态：若任务已完成（status=2）且闪念非 forest，自动升级为 forest。

**响应:**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "content": "闪念内容",
      "status": "tree",
      "task_id": 5,
      "task_title": "关联任务名称",
      "task_status": 1,
      "created_at": "2026-07-21T10:00:00.000Z",
      "updated_at": "2026-07-21T10:30:00.000Z"
    }
  ]
}
```

### POST /api/flash-ideas

新建闪念。

**请求:** `{ "content": "闪念内容" }`
**响应:** `{ "code": 0, "data": { "id": 1, "content": "...", "status": "sapling", ... } }`

### PUT /api/flash-ideas/:id

更新闪念。支持以下可选字段：
- `content` — 编辑内容
- `task_id` — 关联任务 ID，传 `null` 取消关联
- `status` — 手动变更状态（'sapling' | 'tree' | 'forest'）

处理顺序：先处理 task_id（自动设 status='tree'），再处理显式 status 覆盖。

**请求:** `{ "task_id": 5 }` 或 `{ "status": "forest" }` 或 `{ "task_id": null, "status": "sapling" }`
**响应:** `{ "code": 0, "data": { ... } }`

### DELETE /api/flash-ideas/:id

删除闪念。
**响应:** `{ "code": 0, "message": "删除成功" }`

**响应:**
```json
{ "code": 200, "message": "成功|失败", "data": { "status": 200, "statusText": "OK", "headers": {...}, "body": {...}, "duration": 123 } }
```

---

## 11. 投资频道模块（invest.js）

### POST /api/invest/verify-company

DeepSeek 验证公司名称/代码。

**请求:** `{ "query": "腾讯" }`
**响应:**
```json
{ "code": 0, "data": { "isCompany": "true", "name": "腾讯控股", "code": "00700" } }
```

### POST /api/invest/evaluate

MiniMax 企业基本面评估。

**请求:** `{ "name": "腾讯控股", "code": "00700" }`
**响应:**
```json
{ "code": 0, "data": { "content": "评估 JSON 字符串" } }
```

**限流:** 每分钟每 IP 5 次，超出返回 HTTP 429。

---

## 响应格式汇总

| 模块 | 成功 code | 成功外层 | 列表字段 | 错误 code | 注 |
|------|-----------|----------|----------|-----------|-----|
| auth | 200 | — | — | 401/500 | 特殊 |
| article | 0 | code/msg | rows/total | 1 | 标准 |
| task | — | message | list | 500 | 无统一 code |
| tag | — | message | list | 500/404 | 同 task |
| upload | 0 | code/data/msg | — | — | 固定 |
| subscription | 200 | code/message | list | 400/404/500 |  |
| mail | 200 | code/message | — | 400/404/500 |  |
| template | 200 | code/message | list | 400/404/500 |  |
| apiManager | 200 | code/message | list | 400/404/500 |  |
| invest | 0 | code/data | — | 1/429 | 特殊 |
