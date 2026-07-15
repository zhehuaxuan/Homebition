# Homebition 个人全栈站点

> 诞生于 2026-04-01，一个承载个人碎碎念、知识管理、投资研究和自动化服务的"个人数字基地"。

---

## 技术栈

| 层 | 技术 | 用途 |
|---|------|------|
| **前端** | Vue 3 (Composition API) + Vite | SPA 框架与构建 |
| | Vue Router 5 + Pinia | 路由与状态管理 |
| | Element Plus | UI 组件库 |
| | wangeditor 5 | 富文本编辑器 |
| | FullCalendar 6 | 甘特图/日历视图 |
| | Sass | CSS 预处理器 |
| **后端** | Express 5 | HTTP 框架 |
| | MySQL 8 (mysql2) | 主数据库 |
| | nodemailer | 邮件发送 |
| | node-cron | 定时调度 |
| | cheerio + axios | 网页抓取 |
| **基建** | Nginx | 反向代理 |
| | Winston | 日志系统 |

---

## 功能模块

| 模块 | 说明 |
|------|------|
| **首页** | 个人简介、联系方式、作品导航 |
| **文章系统** | 富文本编辑、GitHub 文章同步、列表浏览 |
| **任务管理** | 甘特图/表格视图、标签分类、进展跟踪、状态流转（待启动→进行中→已完成） |
| **投资频道** | AI 驱动的上市公司基本面验证、大盘温度监测 |
| **邮件订阅** | 邮箱管理、EJS 模板管理、一次性/周期性邮件订阅任务 |
| **API 管理** | 外部接口注册与测试、与订阅任务联动 |
| **用户认证** | 管理员登录/登出、会话管理 |

---

## 快速开始

### 依赖安装

```bash
# 前端
cd client && npm install

# 后端
cd server && npm install
```

### 环境变量

在 `server/` 下创建 `.env` 文件：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=admin
DB_NAME=homebition

# 邮件（可选）
MAIL_HOST=smtp.qq.com
MAIL_PORT=465
MAIL_USER=your@qq.com
MAIL_PASS=your-auth-code
```

### 启动开发服务

方式一：一键启动（需 Nginx）

```bash
.\start-all.bat
```

方式二：分别启动

```bash
# 终端 1 - 后端 API（端口 3000）
cd server && npm start

# 终端 2 - 前端开发服务器（端口 5173）
cd client && npm run dev
```

浏览器访问 `http://localhost:5173`

---

## 项目结构

```
Homebition/
├── client/                  # Vue 3 前端
│   └── src/
│       ├── views/           # 页面组件
│       │   ├── about/       # 关于子页面
│       │   ├── article/     # 文章管理
│       │   └── invest/      # 投资频道
│       ├── router/          # 路由配置
│       └── stores/          # Pinia 状态管理
├── server/                  # Express 后端
│   ├── index.js             # 入口 + 中间件 + 路由挂载
│   ├── config/              # 配置文件
│   ├── middleware/           # 中间件（认证、日志）
│   ├── routes/              # 路由处理（10 个模块）
│   ├── services/            # 业务服务（AI、邮件、调度等）
│   └── templates/           # EJS 邮件模板
├── docs/                    # 设计文档与规范
└── start-all.bat            # 开发环境一键启动
```

---

## 数据库

MySQL 8，InnoDB 引擎，字符集 `utf8mb4`。共 10 张表：

`user` · `article` · `task` · `taskdetail` · `tag` · `subscription` · `mail_address` · `mail_template` · `api_manager`

详细设计参见 [docs/superpowers/specs/database/database-schema.md](docs/superpowers/specs/database/database-schema.md)

---

## API 接口

全部 API 挂载在 `/api` 前缀下，共约 50+ 个接口。详细文档参见 [docs/superpowers/specs/api/api-endpoints.md](docs/superpowers/specs/api/api-endpoints.md)

---

## 开发规范

- JavaScript 编码规范 → [docs/superpowers/standards/javascript-conventions.md](docs/superpowers/standards/javascript-conventions.md)
- API 设计规范 → [docs/superpowers/standards/api-conventions.md](docs/superpowers/standards/api-conventions.md)
- 数据库设计规范 → [docs/superpowers/standards/database-conventions.md](docs/superpowers/standards/database-conventions.md)
- 日志规范 → [docs/superpowers/standards/logging-conventions.md](docs/superpowers/standards/logging-conventions.md)

## 关于我

一个个人站点，主要记载个人的碎碎念。
