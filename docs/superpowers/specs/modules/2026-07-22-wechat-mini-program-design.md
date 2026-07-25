# 微信小程序客户端设计文档

> **日期**: 2026-07-22
> **状态**: 设计稿
> **项目**: client-miniapp/ (UniApp), server/ (Express JWT 扩展)

## 1. 概述

为 Homebition 增加微信小程序客户端，实现 Web / Desktop / Mini Program 三端覆盖。小程序基于 UniApp 框架开发，复用现有后端 Express API，通过新增 JWT 认证机制实现与 Web 端 session 认证共存。

### 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 小程序框架 | UniApp | Vue 语法，一套代码编译到微信小程序 |
| 后端认证 | JSON Web Token (JWT) | jsonwebtoken 库 |
| API 通信 | uni.request 封装 | 自动注入 JWT，401 拦截跳登录 |
| 状态管理 | uni.getStorageSync | Token 持久化到本地存储 |

### 开发阶段

| Phase | 内容 | 目标 |
|-------|------|------|
| **Phase 1** | 基建就绪 | 后端 JWT 改造 + UniApp 脚手架 + 登录页 |
| **Phase 2** | 核心模块 | 任务管理 + 闪念录入 + 投资管理 |
| **Phase 3** | 文章模块 | 文章列表、详情、搜索 |
| **Phase 4** | 剩余模块 | 每日总结/复盘、仪表盘、订阅管理等 |

## 2. 整体架构

```
┌──────────────────────────────────────────────────┐
│              微信小程序 (UniApp)                   │
│  client-miniapp/                                  │
│  ┌──────────┬──────────┬──────────────────────┐  │
│  │ 登录模块  │ 业务页面  │ 网络层               │  │
│  │ JWT 登录  │ 文章/任务 │ request.js           │  │
│  │ Token 存  │ 闪念/投资 │ 自动注入 Bearer JWT  │  │
│  │ storage   │ 总结/订阅 │ 401 → 跳转登录页     │  │
│  └──────────┴──────────┴──────────────────────┘  │
└───────────────────────┬──────────────────────────┘
                        │ HTTP + JWT
                        ▼
┌──────────────────────────────────────────────────┐
│              Express 后端 (server/)                │
│  ┌────────────────┬─────────────────────────────┐ │
│  │ authMiddleware  │ 现有业务路由 (不改)          │ │
│  │ JWT 解析 (小程序)│ /api/article/*              │ │
│  │ base64 解析 (Web)│ /api/task/*                │ │
│  │ 自动根据格式路由  │ /api/flash-ideas/*         │ │
│  └────────────────┴─────────────────────────────┘ │
│              ↕ MySQL 8 + 业务逻辑                  │
└──────────────────────────────────────────────────┘
```

## 3. Phase 1 — 基建就绪

### 3.1 后端 JWT 改造

#### 新增依赖

在 `server/package.json` 新增：

```json
"jsonwebtoken": "^9.0.0"
```

#### 新增文件: `server/config/jwt.js`

```js
module.exports = {
  secret: process.env.JWT_SECRET || 'homebition-jwt-secret-key',
  expiresIn: '7d'
}
```

#### 改造: `server/middleware/auth.js`

在现有中间件中增加 JWT 解析能力，通过 token 格式自动分派：

- Token 格式 `xxx.xxx.xxx`（3 段）→ JWT 验证
- Token 格式 base64 字符串 → 旧版 base64 解析（Web 端兼容）

改造后逻辑：

```
请求 → authMiddleware
  ├─ 公开路由 → 放行
  ├─ 无 token → 401
  ├─ token 格式检测
  │   ├─ JWT (三段点分隔) → jwt.verify()
  │   └─ base64 → Buffer.from 解码 (Web 兼容)
  └─ 验证通过 → req.user = { username }
```

#### 新增接口: `POST /api/auth/mini/login`

与现有 `/api/auth/login` 相同的 username/password 校验，区别在于返回 JWT token。

**请求:**
```json
{ "username": "xuanzhehua", "password": "224539" }
```

**响应:**
```json
{ "code": 0, "message": "登录成功", "token": "<JWT>", "user": { "username": "xuanzhehua" } }
```

Web 端登录接口 `/api/auth/login` 不变，不受任何影响。

### 3.2 UniApp 脚手架结构

```
client-miniapp/
├── manifest.json            # 微信小程序 AppID、权限声明
├── pages.json               # 页面路由
├── main.js                  # Vue 应用入口
├── App.vue                  # 根组件（全局样式、初始化登录态检查）
├── uni.scss                 # 全局样式变量
├── utils/
│   ├── request.js           # 网络请求封装
│   └── auth.js              # 登录/登出/Token 管理
├── store/
│   └── user.js              # 用户状态
├── pages/
│   ├── login/
│   │   └── index.vue        # 登录页
│   ├── task/
│   │   ├── list.vue         # 任务列表
│   │   ├── detail.vue       # 任务详情
│   │   ├── edit.vue         # 新增/编辑任务
│   │   └── progress-add.vue # 添加进展
│   ├── flash/
│   │   ├── list.vue         # 闪念列表
│   │   ├── create.vue       # 新建闪念
│   │   └── edit.vue         # 编辑闪念
│   ├── invest/
│   │   ├── index.vue        # 投资首页
│   │   ├── verify.vue       # 公司验证
│   │   ├── evaluate.vue     # 基本面评估
│   │   └── review.vue       # 每日复盘
│   └── article/             # Phase 3
│       ├── list.vue
│       └── detail.vue
└── static/
    └── logo.png
```

### 3.3 网络层设计

**`utils/request.js`** 核心逻辑：

```js
const BASE_URL = 'http://localhost:3000'

function request(options) {
  const token = uni.getStorageSync('jwt_token')

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
        ...options.header
      },
      success(res) {
        if (res.statusCode === 401) {
          uni.removeStorageSync('jwt_token')
          uni.redirectTo({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
          return
        }
        resolve(res.data)
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

module.exports = { request }
```

### 3.4 登录页

- 用户名 input + 密码 input + 登录按钮
- 调用 `/api/auth/mini/login`
- 成功后将 JWT 存 `uni.setStorageSync('jwt_token', token)`
- 跳转到首页（任务列表）

## 4. Phase 2 — 核心模块

### 4.1 任务管理

#### 页面清单

| 页面 | 路由 | 功能 |
|------|------|------|
| 任务列表 | pages/task/list.vue | 按状态 tab 筛选（待启动/进行中/已完成）、关键词搜索、卡片展示 |
| 任务详情 | pages/task/detail.vue | 完整信息、进展时间线、状态流转、延期操作 |
| 任务编辑 | pages/task/edit.vue | 新增/编辑（标题、目标、标签选择、重要性、起止日期） |
| 添加进展 | pages/task/progress-add.vue | 输入内容 + 提交 |

#### 复用的 API

| API | 方法 | 用途 |
|-----|------|------|
| `/api/tasks` | GET | 全量任务列表 |
| `/api/task/add` | POST | 新增任务 |
| `/api/task/update` | POST | 更新任务 |
| `/api/task/updateStatus` | POST | 状态流转 |
| `/api/task/delay` | POST | 延期 |
| `/api/task/delete/:id` | DELETE | 删除任务 |
| `/api/task/progress/add` | POST | 添加进展 |
| `/api/task/progress/:taskId` | GET | 获取进展列表 |
| `/api/tags` | GET | 获取标签列表（任务编辑用） |

所有 API 均为现有接口，无需新增。

### 4.2 闪念（Quick 录入）

#### 页面清单

| 页面 | 路由 | 功能 |
|------|------|------|
| 闪念列表 | pages/flash/list.vue | 卡片列表展示，含状态标签 🌱🌳🌲 |
| 新建闪念 | pages/flash/create.vue | 文本输入 + 提交，支持关联任务 |
| 编辑闪念 | pages/flash/edit.vue | 修改内容、关联/取消任务、变更状态 |

#### 复用的 API

| API | 方法 | 用途 |
|-----|------|------|
| `/api/flash-ideas` | GET | 获取闪念列表 |
| `/api/flash-ideas` | POST | 新建闪念 |
| `/api/flash-ideas/:id` | PUT | 更新闪念 |
| `/api/flash-ideas/:id` | DELETE | 删除闪念 |

### 4.3 投资管理

#### 页面清单

| 页面 | 路由 | 功能 |
|------|------|------|
| 投资首页 | pages/invest/index.vue | 大盘监测概览、各功能入口 |
| 公司验证 | pages/invest/verify.vue | 输入公司名/代码 → AI 验证 → 展示结果 |
| 基本面评估 | pages/invest/evaluate.vue | 显示 DeepSeek/MiniMax AI 评估结果 |
| 每日复盘 | pages/invest/review.vue | 查看历史复盘、填写今日复盘 |

#### 复用的 API

| API | 方法 | 用途 |
|-----|------|------|
| `/api/invest/verify-company` | POST | AI 验证公司名称 |
| `/api/invest/evaluate` | POST | 企业基本面评估 |
| `/api/investment-review/list` | GET | 复盘列表 |
| `/api/investment-review/save` | POST | 保存复盘 |

## 5. 后续 Phase 预留

### Phase 3 — 文章模块

- 文章列表页（标题搜索、时间排序）
- 文章详情页（HTML 富文本渲染 → uni-app `<rich-text>` 组件适配）

### Phase 4 — 剩余模块

- 每日总结/复盘（填写、查看）
- 仪表盘（任务/闪念/文章概览统计）
- 邮箱订阅管理（查看订阅任务、邮箱地址）
- API 管理、标签管理等

## 6. 设计要点

### 认证共存方案

```
Web 端: 请求 → authMiddleware → base64 解析 → req.user
小程序: 请求 → authMiddleware → JWT 解析 → req.user
```

后端通过 token 字符串格式自动路由，无需客户端传额外标识头。

### 小程序图片显示

现有文章内容和用户头像使用 `http://localhost:3000` 的图片地址，微信小程序要求域名已配置到白名单。需要将 `localhost:3000` 替换为实际的服务器域名，或在开发阶段不校验域名。

### 后端无侵入原则

所有小程序功能复用的都是现有 API，后端改动仅限于：
1. 新增 `jsonwebtoken` 依赖
2. 新增 `config/jwt.js`
3. 改造 `middleware/auth.js`（增加 JWT 解析，不改变现有逻辑）
4. 新增 `/api/auth/mini/login` 接口

业务路由（article、task、flash-ideas、invest 等）零改动。
