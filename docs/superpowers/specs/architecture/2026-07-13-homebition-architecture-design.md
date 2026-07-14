# Homebition 整体架构设计文档

> **日期**: 2026-07-13
> **作者**: Claude Code (Sonnet 4.6) / 开发者
> **状态**: 已定稿

---

## 1. 项目概览

### 1.1 项目定位

Homebition 是一个**个人全栈站点**，诞生于 2026-04-01。站点承载了开发者的个人品牌展示、日常知识管理、投资研究辅助和自动化邮件推送等功能，是综合性的"个人数字基地"。

### 1.2 核心功能矩阵

| 模块 | 功能描述 | 面向用户 |
|------|----------|----------|
| 日志系统 | winston 统一日志 + 请求日志中间件 + Axios 拦截器 | 全栈 |
| 首页 | 个人简介、联系方式、作品导航 | 访客 |
| 文章系统 | 富文本编辑、GitHub 文章同步、列表浏览 | 管理员 + 访客 |
| 任务管理 | 甘特图/表格视图、标签系统、进展跟踪、状态流转 | 管理员 |
| 投资频道 | AI 驱动的上市公司验证与基本面评估、大盘温度 | 管理员 |
| 邮件订阅 | 邮箱管理、EJS 模板管理、一次性/周期性订阅任务 | 管理员 |
| API 管理 | 外部接口注册、测试、与订阅任务联动 | 管理员 |
| 用户认证 | 管理员登录/登出、会话管理 | 管理员 |

### 1.3 用户角色

| 角色 | 权限 | 说明 |
|------|------|------|
| **访客** | 浏览首页、文章列表 | 无需登录 |
| **管理员** | 全部功能 | 单用户（默认: xuanzhehua） |

---

## 2. 技术栈全景

### 2.1 前端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Vue 3** | ^3.5.31 | 前端框架（Composition API） | 轻量、响应式、社区活跃 |
| **Vite** | ^5.4.21 | 构建工具与开发服务器 | 极速 HMR、零配置启动 |
| **Vue Router** | ^5.0.4 | SPA 路由管理 | 与 Vue 3 原生集成 |
| **Pinia** | ^3.0.4 | 状态管理 | 轻量、TypeScript 友好、替代 Vuex |
| **Element Plus** | ^2.13.6 | UI 组件库 | 桌面端成熟组件、中文文档完善 |
| **wangeditor** | ^5.1.23 | 富文本编辑器 | 轻量、开箱即用、Vue 3 支持 |
| **FullCalendar** | ^6.1.20 | 日历/甘特图（任务视图） | 资源时间线视图、Vue 3 封装 |
| **Axios** | ^1.14.0 | HTTP 客户端 | 拦截器、请求取消、浏览器兼容好 |
| **Sass** | ^1.99.0 | CSS 预处理器 | 变量嵌套、团队熟悉 |
| **Oxlint/Oxfmt** | ^1.57.0 | 代码检查与格式化 | Rust 实现、速度极快 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Express** | ^5.2.1 | HTTP 框架 | Node.js 最成熟的 Web 框架, v5 支持 async 错误处理 |
| **MySQL2** | ^3.22.0 | MySQL 数据库驱动（Promise） | 性能优于 mysql 包、原生 Promise |
| **nodemailer** | ^9.0.1 | 邮件发送 | Node.js 邮件发送标准库 |
| **EJS** | ^6.0.1 | 模板引擎 | 语法简单、可直接在 HTML 中嵌入 |
| **multer** | ^2.1.1 | 文件上传 | 支持 multipart/form-data、磁盘存储 |
| **cheerio** | ^1.2.0 | HTML 解析 | 类 jQuery API、服务端 DOM 操作 |
| **winston** | ^3.17 | 日志框架 | Express 生态标配、按日轮转、多传输通道 |
| **winston-daily-rotate-file** | ^5.0 | 日志文件轮转 | 按日期自动分割日志文件 |

### 2.3 AI 集成

| 服务 | 调用方式 | 用途 | 备注 |
|------|----------|------|------|
| **DeepSeek API** | REST (Axios POST) | 公司名称/代码验证 | temperature=0.1, max_tokens=200, 30s 超时 |
| **MiniMax API** | SSE Stream (Axios stream) | 公司基本面评估 | 流式输出, max_tokens=8000, 5min 超时 |

### 2.4 端到端架构

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器 (Chrome/Edge)                  │
│  SPA: Vue 3 + Element Plus + Vue Router + Pinia          │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (开发: Vite Proxy / 生产: Nginx)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express 5 (localhost:3000)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ 中间件链  │ │ 路由层   │ │ 服务层   │ │ 外部API    │  │
│  │ JSON解析  │ │ 12个路由  │ │ mail.js  │ │ DeepSeek   │  │
│  │ DB挂载    │ │ 模块     │ │ deepseek │ │ MiniMax    │  │
│  │ CORS     │ │          │ │ .js     │ │            │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ TCP :3306
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   MySQL (本地实例)                         │
│  表: user / article / task / taskdetail / tag            │
│      subscription / mail_address / mail_template         │
│      api_manager                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 前端架构

### 3.1 目录结构

```
client/src/
├── Index.vue              # 根组件（导航栏 + 全局布局）
├── index.css              # 全局样式
├── router/
│   └── index.js           # Vue Router 配置（所有路由定义）
├── stores/
│   ├── auth.js            # 登录态管理（Pinia）
│   └── counter.js         # 计数器（Pinia 示例/保留）
├── views/
│   ├── Home.vue           # 首页（个人信息 + 作品展示）
│   ├── Login.vue          # 登录页
│   ├── MyArticles.vue     # 文章列表页
│   ├── MyTasks.vue        # 任务管理页（主视图）
│   ├── MailTest.vue       # 邮件测试页
│   ├── About.vue          # "关于我"侧边栏布局
│   ├── about/             # "关于我"子页面
│   │   ├── Profile.vue    #   个人信息/编辑
│   │   ├── Devices.vue    #   设备管理
│   │   ├── ArticleList.vue#   文章清单（管理后台）
│   │   ├── Task.vue       #   任务清单（管理后台）
│   │   ├── Tag.vue        #   标签管理
│   │   └── Subscription.vue # 订阅管理（CRUD）
│   ├── article/
│   │   └── ArticleEdit.vue# 富文本编辑器（新增/编辑）
│   └── invest/
│       ├── Invest.vue     # 投资频道侧边栏布局
│       ├── Enterprise.vue # 企业评估页
│       └── Market.vue     # 大盘温度页
```

### 3.2 路由树

```
/                    → Home.vue           # 首页（公开）
/login               → Login.vue          # 登录（公开）
/mail-test           → MailTest.vue       # 邮件测试（公开）
/articles            → MyArticles.vue     # 文章列表（公开）
/tasks               → MyTasks.vue        # 任务管理（需登录）
/about (layout)      → About.vue          # 关于我（需登录）
  ├── /about/profile           → Profile.vue
  ├── /about/devices           → Devices.vue
  ├── /about/article-list      → ArticleList.vue
  ├── /about/task-list         → Task.vue
  ├── /about/tag-list          → Tag.vue
  └── /about/subscription-list → Subscription.vue
/invest (layout)     → Invest.vue         # 投资频道（需登录）
  ├── /invest/enterprise       → Enterprise.vue
  └── /invest/market           → Market.vue
/article/add         → ArticleEdit.vue    # 新增文章
/article/edit/:id    → ArticleEdit.vue    # 编辑文章
```

**路由保护**: 导航栏通过 `authStore.isLoggedIn()` 控制"我的任务"和"关于我"入口的显示。后端接口除登录外均无 token 校验（当前实现基于前端 UI 保护）。

### 3.3 组件层级

```
Index.vue (根组件)
├── <nav> — 顶部导航栏
│   ├── 路由链接（首页/文章/投资/任务/关于）
│   ├── 登录按钮（未登录） / 用户下拉菜单（已登录）
│   └── 搜索/关闭图标（占位）
└── <router-view> — 内容区
    │
    ├── Home.vue          —— 个人简介卡片 + 作品网格
    ├── Login.vue         —— Element Plus el-card + el-form
    ├── MyArticles.vue    —— 自定义文章列表（无 Element Plus table）
    ├── MyTasks.vue       —— FullCalendar 甘特图 + Element Plus table + 对话框
    ├── MailTest.vue      —— 邮件发送测试表单
    ├── About.vue         —— 侧边栏 + router-view 布局
    ├── ArticleEdit.vue   —— wangeditor 编辑器
    └── Invest.vue        —— 侧边栏 + router-view 布局
```

### 3.4 状态管理 (Pinia)

**auth store** (`stores/auth.js`):
- `token`: string — 登录后服务端返回的 Base64 token（`username:timestamp`）
- `username`: string — 当前登录用户名
- `isLoggedIn()` → boolean — 检查 token 是否存在
- `setLogin(token, username)` — 保存登录态到 localStorage
- `setLogout()` — 清除登录态并触发 `session-expired` 事件

所有状态持久化通过**直接操作 localStorage**+`localStorage.getItem`。

**counter store** (`stores/counter.js`): 示例/保留状态，未在业务中使用。

### 3.5 后端交互方式

所有前端页面均通过 **Axios** 直接发起 HTTP 请求。Axios 实例为默认全局实例，无 baseURL 配置（开发阶段通过 Vite 代理 `/api` 到 `localhost:3000`）。

**请求/响应约定**:
- 请求体: `Content-Type: application/json`
- 成功响应: `{ code: 0|200, data: {...}, rows: [...], list: [...], msg: "..." }`
- 错误响应: `{ code: 1|400|500, msg: "...", error: "..."}`
- 状态码体系不统一，各模块有各自约定（详见 5.4 章节）

---

## 4. 后端架构

### 4.1 Express 应用结构

**入口文件**: `server/index.js`

**初始化顺序**（严格有序）:
1. 创建 Express 实例，设置 5 分钟请求超时
2. 创建 MySQL 连接池（10 连接、无限排队）
3. 全局挂载 `req.db`（中间件）
4. 注册 `express.json()` 解析器
5. 加载所有路由文件并 prefix `/api`
6. 执行数据库表初始化（auth: 用户表 + api_manager 表，article: 文章表）
7. 初始化邮件服务
8. 监听 `:3000`

### 4.2 路由挂载一览

`server/routes/` 目录下共 **11 个路由模块**：

| 文件 | 路由前缀 | 主要接口 | 表依赖 |
|------|----------|----------|--------|
| `auth.js` | `/api` | 登录/退出/个人信息/发送邮件测试 | user |
| `article.js` | `/api` | 文章增删改查/github 同步 | article |
| `task.js` | `/api` | 任务 CRUD/进展管理/状态流转/延期 | task, taskdetail |
| `tag.js` | `/api` | 标签增删改查 | tag |
| `upload.js` | `/api` | 图片上传(wangeditor 专用) | — |
| `subscription.js` | `/api` | 订阅任务 CRUD/状态切换 | subscription |
| `template.js` | `/api` | EJS 模板 CRUD/渲染 | —（文件系统）|
| `mailAddress.js` | `/api` | 邮箱地址 CRUD | mail_address |
| `mail.js` | `/api` | 模板邮件发送 | mail_template |
| `apiManager.js` | `/api` | 外部接口 CRUD/测试 | api_manager |
| `invest.js` | `/api` | 公司验证/AI 评估 | —（调用外部 API）|

所有路由均挂载在 `/api` 下，无版本化前缀。

### 4.3 中间件链

```
请求进入
  → 超时中间件 (res.setTimeout(300000))
  → DB 挂载中间件 (req.db = pool)
  → express.json()
  → 请求日志中间件 (requestLogger, 记录 method/url/status/duration)
  → Token 校验中间件 (authMiddleware, Bearer token 白名单)
  → 各路由处理
  → 全局错误处理中间件（未捕获异常兜底）
  → 响应
```

### 4.4 服务层

`server/services/` 目录封装可复用的业务逻辑：

| 文件 | 导出函数 | 说明 |
|------|----------|------|
| `mail.js` | `initTransporter(config)`, `sendMail(options)` | nodemailer 封装、EJS 模板渲染 |
| `deepseek.js` | `verifyCompany(query)`, `evaluateCompany(name, code)` | AI API 调用（DeepSeek / MiniMax） |
| `logger.js` | `logger.info()`, `logger.warn()`, `logger.error()` | winston 日志封装（console + 文件轮转） |

服务层被路由层直接调用（`require`），无依赖注入层。

---

## 5. 数据库设计

### 5.1 表结构汇总

当前数据库 `homebition` 包含 **10 张表**：

#### 5.1.1 user — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 用户 ID |
| user | VARCHAR(255) | — | 用户名（兼容旧版字段名） |
| username | VARCHAR(255) | — | 用户名（新版字段名） |
| password | VARCHAR(255) | NOT NULL | 登录密码（明文） |
| profile | TEXT | — | 个人介绍 HTML |

注: 代码中有 `user`/`username` 兼容逻辑，通过 `SHOW COLUMNS` 动态判断。

#### 5.1.2 article — 文章表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 文章 ID |
| title | VARCHAR(255) | NOT NULL | 文章标题 |
| url | VARCHAR(500) | — | 原文链接（GitHub 同步来源） |
| content | LONGTEXT | — | 富文本内容 |
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| last_time | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 最后修改时间 |

#### 5.1.3 task — 任务表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 任务 ID |
| title | VARCHAR(255) | — | 任务名称 |
| target | TEXT | — | 任务目标描述 |
| tags | TEXT | — | JSON 数组 `[tagId1, tagId2]` |
| status | INT | DEFAULT 0 | 0=待启动 1=进行中 2=已完成 3=暂停/其他 |
| importance | INT | — | 重要性等级 |
| create_time | DATETIME | — | 任务创建日期 |
| close_time | DATETIME | — | 目标闭环日期 |

#### 5.1.4 taskdetail — 任务进展表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 进展 ID |
| task_id | INT | FK → task.id | 关联任务 |
| content | TEXT | NOT NULL | 进展内容 |
| create_time | DATETIME | — | 提交时间 |

#### 5.1.5 tag — 标签表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 标签 ID |
| name | VARCHAR(255) | NOT NULL | 标签名称 |
| color | VARCHAR(50) | — | 标签颜色（用于 UI 显示） |
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5.1.6 subscription — 订阅任务表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 订阅 ID |
| name | VARCHAR(255) | NOT NULL | 任务名称 |
| type | VARCHAR(20) | NOT NULL | once=一次性 / periodic=周期性 |
| send_time | DATETIME | — | 发送时间（一次性） |
| week_days | TEXT | — | JSON 数组 `[1,3,5]` 周几发送（周期性） |
| email | VARCHAR(255) | NOT NULL | 目标邮箱 |
| template | VARCHAR(255) | — | EJS 模板文件名 |
| api_id | INT | FK → api_manager.id | 关联数据接口 |
| template_data | TEXT | — | 模板变量 JSON（预留） |
| status | INT | DEFAULT 1 | 0=停用 1=启用 |
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5.1.7 mail_address — 邮箱地址表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 地址 ID |
| name | VARCHAR(255) | NOT NULL | 联系人名称 |
| address | VARCHAR(255) | NOT NULL | 邮箱地址 |
| type | VARCHAR(50) | DEFAULT 'personal' | 类型（personal/work 等）|
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5.1.8 mail_template — 邮件模板表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 模板 ID |
| code | VARCHAR(100) | — | 模板编码 |
| name | VARCHAR(255) | — | 模板名称 |
| subject | VARCHAR(500) | — | 邮件主题（支持 `{{var}}` 变量）|
| content | TEXT | — | 邮件正文（支持 `{{var}}` 变量）|
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5.1.9 api_manager — 外部接口表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK AUTO_INCREMENT | 接口 ID |
| name | VARCHAR(255) | NOT NULL | 接口名称 |
| path | VARCHAR(500) | NOT NULL | 接口 URL |
| description | TEXT | — | 接口描述 |
| create_time | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 5.1.10 EJS 文件模板（文件系统）

模板存放于 `server/templates/` 目录，非数据库存储。当前包含:

| 文件 | 用途 |
|------|------|
| `welcome.ejs` | 欢迎邮件 |
| `task_list.ejs` | 任务列表邮件 |
| `task_report.ejs` | 任务报告邮件 |

### 5.2 ER 关系图

```
user (管理员)
  │
  ├── 1:1 当前系统为单用户

task ────< taskdetail
  │         (1:N, task_id)
  │
  └───< tag (M:N 通过 task.tags JSON 字段关联)

api_manager ────< subscription.api_id
                (N:1, 接口可被多个订阅使用)

mail_address.address ──── subscription.email
                        (N:1, 地址关联)

subscription.template ──── server/templates/*.ejs
                          (逻辑关联)

EJS 文件模板 ──── subscription.template
                (N:1)
```

### 5.3 设计要点与风险

1. **密码明文存储**: `user.password` 为明文存储，无加密/哈希处理。存在安全风险。
2. **JSON 字段**: `task.tags`、`subscription.week_days` 使用 TEXT 存储 JSON 字符串，应用层序列化/反序列化。
3. **无外键约束**: 所有表间关联（`taskdetail.task_id`、`subscription.api_id` 等）均为逻辑外键，无数据库级 FK 约束。
4. **`user` 表双字段兼容**: 因为历史表结构变迁，`user` 表同时兼容 `user` 和 `username` 字段名。

---

## 6. 模块依赖与数据流

### 6.1 用户认证流程

```
Login.vue
  │ POST /api/auth/login { username, password }
  ▼
auth.js 路由
  ├── 检查/初始化管理员用户 → user 表
  ├── 查询用户名密码 → SELECT * FROM user WHERE ...
  ├── 验证 password（明文比对）
  ├── 生成 token: Base64("username:timestamp")
  └── 返回 { token, user: { username } }
      │
      ▼
  authStore.setLogin(token, username)
      │
      ├── localStorage.setItem('auth-token', token)
      ├── localStorage.setItem('auth-username', username)
      └── router.push('/')
```

**安全现状**: token 为简单 Base64 编码（非 JWT），无过期校验，后端未做 token 验证中间件。前端通过 localStorage 持久化。

### 6.2 文章系统数据流

```
文章发布:
  ArticleEdit.vue (wangeditor)
    │ POST /api/article/save { title, content }
    ▼
  article.js → INSERT INTO article (title, content)

文章编辑:
  ArticleEdit.vue (:id 模式)
    │ GET /api/article/detail/:id  → 回显
    │ POST /api/article/update { id, title, content }
    ▼
  article.js → UPDATE article SET ...

GitHub 同步:
  ArticleList.vue
    │ POST /api/article/sync
    ▼
  article.js
    ├── fetch('https://zhehuaxuan.github.io/archives/')
    ├── cheerio 解析 <a> 链接
    ├── 去重比对 (url)
    └── 逐个 INSERT

文章列表:
  MyArticles.vue / ArticleList.vue
    │ GET /api/article/list?title=关键词
    ▼
  article.js → SELECT id, title, create_time, url FROM article
```

### 6.3 任务系统数据流

```
MyTasks.vue（主视图）
  ├── 甘特图模式: FullCalendar resource-timeline 插件
  ├── 表格模式: Element Plus el-table
  │
  ├── GET /api/tasks → 任务列表渲染
  ├── POST /api/task/add → 新增任务
  ├── POST /api/task/update → 修改任务
  ├── POST /api/task/updateStatus { id, status } → 状态流转
  ├── POST /api/task/delay { id, close_time } → 延期
  ├── DELETE /api/task/delete/:id → 删除
  │
  ├── 任务进展:
  │   ├── GET /api/task/progress/:taskId → 进展列表
  │   └── POST /api/task/progress/add { taskId, content } → 添加进展
  │
  └── GET /api/tags → 标签列表（选择器数据源）

数据流:
  task.tags (JSON) ↔ tag.id
  进展详情横跨 taskdetail 表
  状态: 0→1→2→3（不支持回退检查）
```

### 6.4 邮件订阅系统数据流

```
三层架构:
┌──────────────────────────────────────────────────────────────┐
│  管理面（前端）                                                │
│  Subscription.vue / MailTest.vue / MailAddress 管理           │
│    → CRUD 订阅任务、邮箱地址、邮件模板                          │
├──────────────────────────────────────────────────────────────┤
│  路由层（Express）                                            │
│  subscription.js / mailAddress.js / template.js / mail.js    │
├──────────────────────────────────────────────────────────────┤
│  服务层 + 存储                                               │
│  services/mail.js (nodemailer)                               │
│    ├── 数据库: subscription / mail_address / mail_template   │
│    └── 文件系统: server/templates/*.ejs                       │
└──────────────────────────────────────────────────────────────┘

订阅执行流程（手动触发）:
  Subscription.vue
    │ 管理记录（增删改查）
    ▼
  定时执行（未实现后台调度器，当前为手动）:
    ├── 查询启用的订阅任务 → SELECT * FROM subscription WHERE status=1
    ├── 确定即将发送的匹配项
    ├── 调用 API 获取数据 → GET api_manager.path
    ├── 渲染模板 → ejs.render(template, data)
    └── 发送邮件 → nodemailer.sendMail()
```

**当前局限性**: 自动化定时调度（cron/定时器）尚未实现，需要手动触发执行。

### 6.5 投资频道数据流

```
企业评估流程:
  Enterprise.vue
    │ POST /api/invest/verify-company { query: "公司名/代码" }
    ▼
  invest.js 路由
    │
    ├── 限流检查（内存 Map，每 IP 每分钟 5 次）
    │
    └── services/deepseek.js
        │
        ├── Step 1: DeepSeek API 验证公司
        │   → prompt 要求返回 JSON {isCompany, name, code}
        │   → temperature=0.1, 30s 超时
        │
        └── Step 2: MiniMax API 评估（SSE 流式）
            → prompt 包含完整评估体系（14 项指标）
            → 流式解析 content_block_delta
            → 5min 超时

限流器设计:
  rateLimiter (Map<IP, {count, resetTime}>)
    ├── 每 IP 每分钟最多 5 次评估请求
    ├── 每 10 分钟清理过期记录
    └── 429 → "请求过于频繁，请稍后再试"

错误日志:
  /server/logs/evaluate-error.log
    └── JSON lines 格式，记录堆栈、请求上下文
```

---

## 7. 部署架构

### 7.1 当前部署拓扑

```
┌──────────────────────────────┐
│        Windows 11            │
│                              │
│   Nginx (localhost:80)       │
│   ├── 静态代理               │
│   │    └── 前端 build 产物    │
│   └── 反向代理               │
│        └── /api → :3000      │
│                              │
│   Express 5 (:3000)          │  ← 后台服务
│   Vite Dev Server (:5173)    │  ← 开发模式前端
│   MySQL 8 (:3306)            │  ← 数据库
└──────────────────────────────┘
```

### 7.2 启动脚本

`start-all.bat`:
```batch
cd /d E:\nginx-1.29.7\nginx-1.29.7
start nginx

cd /d E:\Homebition\client
start /b npm run dev

cd /d E:\Homebition\server
start npm start
```

**启动顺序**: Nginx → 前端 dev server → 后端 Express

### 7.3 Nginx 配置要点

- 开发模式: Vite 代理 `/api → localhost:3000`，无需 Nginx 参与 API 路由
- 生产模式: Nginx 代理 `/api` 到 Express `:3000`，静态文件服务前端 build 产物
- Nginx 版本: 1.29.7（较新版本，确保配置兼容）

### 7.4 部署要点

| 组件 | 部署位置 | 端口 | 访问方式 |
|------|----------|------|----------|
| Nginx | E:\nginx-1.29.7 | 80 | http://localhost |
| Express | E:\Homebition\server | 3000 | http://localhost:3000 |
| Vite Dev | E:\Homebition\client | 5173 | http://localhost:5173 |
| MySQL | 系统服务 | 3306 | localhost:3306 |

---

## 8. CI/CD 与开发流程

### 8.1 当前状态

当前项目**无自动化 CI/CD 配置**。部署为手动操作：
1. 切换到 main 分支
2. 运行 `cd client && npm run build`（构建前端）
3. 运行 `start-all.bat` 启动服务

### 8.2 推荐引入的流程

| 阶段 | 工具 | 用途 |
|------|------|------|
| 代码检查 | ESLint + oxlint | commit 前自动检查和修复 |
| 格式化 | oxfmt | 统一代码风格 |
| 单元测试 | vitest + jsdom | 组件和工具函数测试 |
| E2E 测试 | Playwright | 关键流程（登录/文章/任务） |
| 构建 | Vite | 前端生产构建 |
| 部署 | 手动脚本（当前） | 生产环境发布 |

### 8.3 环境管理

| 环境 | 前端 API 地址 | 数据库 | 说明 |
|------|---------------|--------|------|
| 开发 | Vite Proxy → :3000 | 本地 MySQL | `npm run dev` |
| 生产 | Nginx → :3000 或同域名 | 本地 MySQL | `npm run build` + Nginx |

---

## 9. 环境配置

### 9.1 数据库配置

在 `server/index.js` 中硬编码:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin',    // ⚠️ 需修改
  database: 'homebition', // ⚠️ 需修改
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

**建议**: 抽取到环境变量或 `.env` 文件。

### 9.2 邮件服务配置

`server/config/mail.js`:

| 参数 | 值 | 说明 |
|------|-----|------|
| enabled | true | 是否启用邮件服务 |
| host | smtp.aliyun.com | SMTP 服务器 |
| port | 465 | SSL 端口 |
| secure | true | SSL |
| user | zhehuaxuan@aliyun.com | 邮箱账号 |
| pass | 224539xzh | 密码/授权码 |
| from | "Homebition" <zhehuaxuan@aliyun.com> | 发件人 |

### 9.3 AI API 配置

配置已迁移至环境变量（`.env` 文件），不再使用 XML 文件：

| 变量 | 用途 |
|------|------|
| `DEEPSEEK_BASEURL` | DeepSeek API 地址 |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 |
| `MINIMAX_BASEURL` | MiniMax API 地址 |
| `MINIMAX_API_KEY` | MiniMax API 密钥 |
| `MINIMAX_MODEL` | MiniMax 模型名称 |

### 9.4 开发环境配置

**Vite 代理配置** (`client/vite.config.js`):

代理模式: 开发时 Vite Dev Server (`:5173`) 将 `/api` 请求代理到 Express (`:3000`)。

**Express 超时**: 全局 5 分钟（300000ms），主要用于漫长的 AI 评估请求。

---

## 附录 A: 技术债务与改进建议

### 安全风险 (高优先)
1. **密码明文存储** → 使用 bcrypt/scrypt 哈希存储
2. **无 JWT 认证** → token 为简单 Base64，无签名、无过期
3. ~~**无 API 认证中间件**~~ → ✅ 已治理（REQ-016，`middleware/auth.js`）

### 架构改进 (中优先)
4. **统一错误码** → 当前 `code` 字段存在 0/200/1/400/401/500 等多套体系
5. ~~**配置文件外置**~~ → ✅ 已治理（REQ-016，迁移至 `.env`）
6. ~~**引入 .env**~~ → ✅ 已治理（REQ-016）
7. **定时调度** → 邮件订阅的自动化推送未实现

### 代码质量 (低优先)
8. ~~**`user` 表双字段兼容**~~ → ✅ 已治理（REQ-016，统一为 `username`）
9. JSON 字段 → 考虑迁移为 MySQL JSON 类型或关联表
10. LONGTEXT content → 文章内容量大时考虑分表或对象存储
