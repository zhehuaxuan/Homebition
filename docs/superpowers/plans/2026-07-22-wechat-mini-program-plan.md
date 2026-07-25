# 微信小程序客户端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Homebition 构建微信小程序客户端 Phase 1（基建）和 Phase 2（任务管理/闪念/投资管理），后端新增 JWT 认证支持。

**Architecture:** 在 `client-miniapp/` 下创建 UniApp 项目，复用现有 `/api/*` REST 接口。后端 `middleware/auth.js` 改造为同时支持 base64 token（Web）和 JWT（小程序），通过 token 格式自动路由。所有业务路由零改动。

**Tech Stack:** UniApp (Vue 3 + Vite), jsonwebtoken (server), uni.request (network), uni.setStorageSync (token persistence)

## Global Constraints

- 后端业务路由（routes/*.js）零改动 — JWT 仅在 authMiddleware 层处理
- Web 端登录流程不受任何影响
- JWT token 有效期固定 7 天
- 小程序 API 地址默认 `http://localhost:3000`（开发环境）
- 所有页面使用 `<scroll-view>` 而非 `<view>` 包装长列表（小程序性能要求）
- 响应式单位使用 rpx（UniApp 标准）

---

### Task 1: Backend — 安装 jsonwebtoken 依赖 + 新增 JWT 配置

**Files:**
- Modify: `server/package.json`
- Create: `server/config/jwt.js`

**Interfaces:**
- Produces: `require('../config/jwt')` → `{ secret, expiresIn }`

- [ ] **Step 1: 安装 jsonwebtoken**

```bash
cd server && npm install jsonwebtoken
```

- [ ] **Step 2: 创建 `server/config/jwt.js`**

```js
module.exports = {
  secret: process.env.JWT_SECRET || 'homebition-jwt-secret-key',
  expiresIn: '7d'
};
```

- [ ] **Step 3: 确认安装成功**

```bash
node -e "const jwt = require('jsonwebtoken'); console.log(typeof jwt.sign)";
```
Expected: `function`

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/config/jwt.js server/package-lock.json
git commit -m "feat: add jsonwebtoken dependency and JWT config"
```

---

### Task 2: Backend — 改造 authMiddleware 支持 JWT 解析

**Files:**
- Modify: `server/middleware/auth.js`

**Interfaces:**
- Consumes: `server/config/jwt.js` (JWT secret/expiry)
- Produces: 增强后的 authMiddleware，自动识别 JWT (三段点分隔) 与 base64 两种格式

- [ ] **Step 1: 读取当前 `server/middleware/auth.js` 确认原内容**

```bash
cat server/middleware/auth.js
```

确认文件内容与以下代码兼容。

- [ ] **Step 2: 写入改造后的 `server/middleware/auth.js`**

在文件顶部引入 jwt 配置，改造 token 解析部分。完整文件：

```js
const jwtConfig = require('../config/jwt');
const jwt = require('jsonwebtoken');

// 公开路由白名单 — 无需 token 即可访问
const PUBLIC_ROUTES = [
    { path: '/api/auth/login', method: 'POST' },
    { path: '/api/auth/mini/login', method: 'POST' },
    { path: '/api/auth/profile', method: 'GET' },
    { path: '/api/auth/logout', method: 'POST' },
    { path: '/api/auth/send-mail', method: 'POST' },
    { path: '/api/auth/test-mail-template', method: 'GET' },
    { path: '/api/article/list', method: 'GET' },
    { path: '/api/article/detail', method: 'GET' },
];

const authMiddleware = (req, res, next) => {
    // 检查是否公开路由
    const isPublic = PUBLIC_ROUTES.some(
        r => req.path.startsWith(r.path) && req.method === r.method
    );
    if (isPublic) {
        return next();
    }

    // 从 header 获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '未登录，请先登录' });
    }

    const token = authHeader.slice(7);
    if (!token) {
        return res.status(401).json({ code: 401, message: 'token 无效' });
    }

    try {
        // 判断 token 格式：JWT 是 xxx.xxx.xxx 三段，base64 无点分隔
        if (token.split('.').length === 3) {
            // JWT 格式（小程序登录）
            const decoded = jwt.verify(token, jwtConfig.secret);
            req.user = { username: decoded.username };
        } else {
            // 旧版 base64 格式（Web 端兼容）
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const [username] = decoded.split(':');
            if (!username) {
                return res.status(401).json({ code: 401, message: 'token 无效' });
            }
            req.user = { username };
        }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 401, message: 'token 已过期' });
        }
        return res.status(401).json({ code: 401, message: 'token 无效' });
    }
};

module.exports = authMiddleware;
```

关键改造点：
- 新增 `require('jsonwebtoken')` 和 `require('../config/jwt')`
- 公开路由白名单新增 `/api/auth/mini/login`
- token 格式检测：`token.split('.').length === 3` → JWT 验证；否则 → base64 兼容
- 增加 `TokenExpiredError` 捕获返回明确提示

- [ ] **Step 3: 验证现有 Web 登录不受影响**

```bash
cd server && node -e "
const jwtConfig = require('./config/jwt');
const jwt = require('jsonwebtoken');
// 测试 JWT 签发和验证
const token = jwt.sign({ username: 'xuanzhehua' }, jwtConfig.secret, { expiresIn: '7d' });
const decoded = jwt.verify(token, jwtConfig.secret);
console.log('JWT verify OK:', decoded.username);
// 测试 base64 格式兼容 (这是 Web 端当前格式)
const base64 = Buffer.from('xuanzhehua:123456').toString('base64');
const restored = Buffer.from(base64, 'base64').toString('utf-8');
console.log('Base64 decode OK:', restored.split(':')[0]);
"
```

Expected:
```
JWT verify OK: xuanzhehua
Base64 decode OK: xuanzhehua
```

- [ ] **Step 4: Commit**

```bash
git add server/middleware/auth.js
git commit -m "feat: enhance auth middleware to support JWT alongside base64"
```

---

### Task 3: Backend — 新增小程序登录接口

**Files:**
- Modify: `server/routes/auth.js`

**Interfaces:**
- Consumes: `jsonwebtoken`, `server/config/jwt.js`
- Produces: `POST /api/auth/mini/login` → `{ code: 0, token: "<JWT>", user: { username } }`

- [ ] **Step 1: 在 `server/routes/auth.js` 新增 JWT 登录接口**

在文件顶部添加引入：
```js
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
```

在 `router.post('/auth/login', ...)` 之后新增接口：

```js
// 小程序 JWT 登录
router.post('/auth/mini/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await req.db.execute('SELECT * FROM `user` WHERE `username` = ?', [username]);
        const user = rows[0];

        if (user && user.password === password) {
            const token = jwt.sign(
                { username: user.username },
                jwtConfig.secret,
                { expiresIn: jwtConfig.expiresIn }
            );
            res.json({
                code: 0,
                message: '登录成功',
                token,
                user: { username: user.username }
            });
        } else {
            res.status(401).json({
                code: 401,
                message: '用户名或密码错误'
            });
        }
    } catch (err) {
        console.error('小程序登录失败:', err);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});
```

- [ ] **Step 2: 重启后端验证接口可用**

```bash
cd server && node -e "
const express = require('express');
const app = express();
app.use(express.json());

// 模拟 db
app.use((req, res, next) => {
    req.db = {
        execute: async (sql, params) => {
            // 模拟数据库查询，返回默认管理员
            if (params[0] === 'xuanzhehua' && params[1] === '224539') {
                return [[{ username: 'xuanzhehua', password: '224539' }]];
            }
            return [[]];
        }
    };
    next();
});

const jwtConfig = require('./config/jwt');
const jwt = require('jsonwebtoken');

app.post('/test-mini-login', async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await req.db.execute('SELECT * FROM user WHERE username = ?', [username, password]);
    const user = rows[0];
    if (user && user.password === password) {
        const token = jwt.sign({ username }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
        res.json({ code: 0, message: '登录成功', token, user: { username } });
    } else {
        res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
});

const server = app.listen(3001, async () => {
    const res = await fetch('http://localhost:3001/test-mini-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'xuanzhehua', password: '224539' })
    });
    const data = await res.json();
    console.log('Login success:', data.code === 0);
    console.log('Has JWT token:', data.token && data.token.split('.').length === 3);
    server.close();
});
"
```

Expected:
```
Login success: true
Has JWT token: true
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/auth.js
git commit -m "feat: add mini-program JWT login endpoint"
```

---

### Task 4: UniApp — 脚手架项目结构

**Files:**
- Create: `client-miniapp/manifest.json`
- Create: `client-miniapp/pages.json`
- Create: `client-miniapp/main.js`
- Create: `client-miniapp/App.vue`
- Create: `client-miniapp/uni.scss`
- Create: `client-miniapp/static/logo.png`
- Create: `client-miniapp/.gitignore`

**Interfaces:**
- Produces: 可启动的 UniApp 项目骨架（空壳，无业务页面）

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p client-miniapp/{utils,store,pages/login,pages/task,pages/flash,pages/invest,static}
```

安装 uni-ui 组件库（任务详情/编辑用到了 `<uni-popup>` 弹窗组件）:
```bash
cd client-miniapp
npm init -y
npm install @dcloudio/uni-ui
```

- [ ] **Step 2: 创建 `client-miniapp/manifest.json`**

```json
{
  "name": "Homebition",
  "appid": "__UNI__XXXXXXX",
  "description": "Homebition 个人全栈站点",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,
  "mp-weixin": {
    "appid": "请替换为你的微信小程序AppID",
    "setting": {
      "urlCheck": true,
      "es6": true,
      "postcss": true,
      "minified": true
    },
    "usingComponents": true,
    "permission": {}
  }
}
```

注意：`mp-weixin.appid` 需要替换为真实的微信小程序 AppID，开发阶段 `urlCheck: true` 可跳过域名校验。

- [ ] **Step 3: 创建 `client-miniapp/pages.json`**

```json
{
  "pages": [
    {"path": "pages/login/index", "style": {"navigationBarTitleText": "登录"}},
    {"path": "pages/task/list", "style": {"navigationBarTitleText": "任务管理"}},
    {"path": "pages/task/detail", "style": {"navigationBarTitleText": "任务详情"}},
    {"path": "pages/task/edit", "style": {"navigationBarTitleText": "编辑任务"}},
    {"path": "pages/task/progress-add", "style": {"navigationBarTitleText": "添加进展"}},
    {"path": "pages/flash/list", "style": {"navigationBarTitleText": "闪念"}},
    {"path": "pages/flash/create", "style": {"navigationBarTitleText": "记录闪念"}},
    {"path": "pages/flash/edit", "style": {"navigationBarTitleText": "编辑闪念"}},
    {"path": "pages/invest/index", "style": {"navigationBarTitleText": "投资管理"}},
    {"path": "pages/invest/verify", "style": {"navigationBarTitleText": "公司验证"}},
    {"path": "pages/invest/evaluate", "style": {"navigationBarTitleText": "基本面评估"}},
    {"path": "pages/invest/review", "style": {"navigationBarTitleText": "每日复盘"}}
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "Homebition",
    "navigationBarBackgroundColor": "#F8F8F8",
    "backgroundColor": "#F8F8F8"
  },
  "tabBar": {
    "color": "#999",
    "selectedColor": "#409EFF",
    "backgroundColor": "#fff",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/task/list",
        "text": "任务",
        "iconPath": "static/task.png",
        "selectedIconPath": "static/task-active.png"
      },
      {
        "pagePath": "pages/flash/list",
        "text": "闪念",
        "iconPath": "static/flash.png",
        "selectedIconPath": "static/flash-active.png"
      },
      {
        "pagePath": "pages/invest/index",
        "text": "投资",
        "iconPath": "static/invest.png",
        "selectedIconPath": "static/invest-active.png"
      }
    ]
  }
}
```

tabBar 的 icon 文件（task.png, flash.png, invest.png 及 active 版本）需要准备 48x48 PNG 图标放到 `static/` 目录。

- [ ] **Step 4: 创建 `client-miniapp/main.js`**

```js
import Vue from 'vue'
import App from './App'

Vue.config.productionTip = false

App.mpType = 'app'

const app = new Vue({
  ...App
})
app.$mount()
```

- [ ] **Step 5: 创建 `client-miniapp/App.vue`**

```vue
<script>
export default {
  onLaunch() {
    // 检查登录态
    const token = uni.getStorageSync('jwt_token')
    if (!token) {
      uni.redirectTo({ url: '/pages/login/index' })
    }
  }
}
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
</style>
```

- [ ] **Step 6: 创建 `client-miniapp/uni.scss`**

```scss
/* 全局变量 */
$primary-color: #409EFF;
$success-color: #67C23A;
$warning-color: #E6A23C;
$danger-color: #F56C6C;
$info-color: #909399;
$bg-color: #f5f7fa;
$card-bg: #ffffff;
$text-primary: #303133;
$text-regular: #606266;
$text-secondary: #909399;
$border-color: #ebeef5;

/* 状态颜色 */
$status-pending: #909399;
$status-active: #409EFF;
$status-done: #67C23A;
```

- [ ] **Step 7: 创建 `client-miniapp/.gitignore`**

```
node_modules/
unpackage/
dist/
.DS_Store
*.log
```

- [ ] **Step 8: Commit**

```bash
git add client-miniapp/
git commit -m "feat: scaffold UniApp mini-program project"
```

---

### Task 5: UniApp — 网络层与认证工具

**Files:**
- Create: `client-miniapp/utils/request.js`
- Create: `client-miniapp/utils/auth.js`
- Create: `client-miniapp/store/user.js`

**Interfaces:**
- Consumes: 无
- Produces: `request(options)` — Promise 封装的 HTTP 请求，自动注入 JWT，401 跳转登录页
- Produces: `login(username, password)`, `logout()`, `getToken()`, `isLoggedIn()`
- Produces: `userStore` — 登录状态响应式对象

- [ ] **Step 1: 创建 `client-miniapp/utils/request.js`**

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
          uni.removeStorageSync('user_info')
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

module.exports = { request, BASE_URL }
```

- [ ] **Step 2: 创建 `client-miniapp/utils/auth.js`**

```js
const { request } = require('./request')

function login(username, password) {
  return request({
    url: '/api/auth/mini/login',
    method: 'POST',
    data: { username, password }
  }).then(res => {
    if (res.code === 0) {
      uni.setStorageSync('jwt_token', res.token)
      uni.setStorageSync('user_info', JSON.stringify(res.user))
      return res.user
    }
    throw new Error(res.message || '登录失败')
  })
}

function logout() {
  uni.removeStorageSync('jwt_token')
  uni.removeStorageSync('user_info')
}

function getToken() {
  return uni.getStorageSync('jwt_token')
}

function isLoggedIn() {
  return !!getToken()
}

function getUser() {
  const raw = uni.getStorageSync('user_info')
  return raw ? JSON.parse(raw) : null
}

module.exports = { login, logout, getToken, isLoggedIn, getUser }
```

- [ ] **Step 3: 创建 `client-miniapp/store/user.js`**

```js
const { login, logout, isLoggedIn, getUser } = require('../utils/auth')

// UniApp 没有 Pinia，使用简单的全局状态对象
const userStore = {
  isLoggedIn: isLoggedIn(),
  user: getUser(),

  async doLogin(username, password) {
    const user = await login(username, password)
    this.isLoggedIn = true
    this.user = user
    return user
  },

  doLogout() {
    logout()
    this.isLoggedIn = false
    this.user = null
  }
}

module.exports = { userStore }
```

- [ ] **Step 4: Commit**

```bash
git add client-miniapp/utils/ client-miniapp/store/
git commit -m "feat: add network layer and auth utilities for mini-program"
```

---

### Task 6: UniApp — 登录页面

**Files:**
- Create: `client-miniapp/pages/login/index.vue`

**Interfaces:**
- Consumes: `store/user.js` (userStore.doLogin)
- Produces: 登录成功后跳转至任务列表页

- [ ] **Step 1: 创建 `client-miniapp/pages/login/index.vue`**

```vue
<template>
  <view class="login-container">
    <view class="login-card">
      <view class="logo-area">
        <text class="logo-text">Homebition</text>
        <text class="logo-sub">个人全栈站点</text>
      </view>
      <view class="form-area">
        <view class="input-group">
          <text class="input-label">用户名</text>
          <input
            class="input-field"
            v-model="username"
            placeholder="请输入用户名"
            @confirm="handleLogin"
          />
        </view>
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @confirm="handleLogin"
          />
        </view>
        <button
          class="login-btn"
          type="primary"
          :loading="loading"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <view v-if="errorMsg" class="error-msg">{{ errorMsg }}</view>
      </view>
    </view>
  </view>
</template>

<script>
const { userStore } = require('../../store/user')

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      errorMsg: ''
    }
  },
  methods: {
    async handleLogin() {
      if (!this.username || !this.password) {
        this.errorMsg = '请输入用户名和密码'
        return
      }
      this.loading = true
      this.errorMsg = ''
      try {
        await userStore.doLogin(this.username, this.password)
        uni.switchTab({ url: '/pages/task/list' })
      } catch (err) {
        this.errorMsg = err.message || '登录失败，请检查用户名和密码'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 30rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-card {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}
.logo-area {
  text-align: center;
  margin-bottom: 50rpx;
}
.logo-text {
  font-size: 48rpx;
  font-weight: bold;
  color: #409EFF;
  display: block;
}
.logo-sub {
  font-size: 26rpx;
  color: #909399;
  margin-top: 10rpx;
  display: block;
}
.form-area {
  width: 100%;
}
.input-group {
  margin-bottom: 30rpx;
}
.input-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.input-field {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.input-field:focus {
  border-color: #409EFF;
}
.login-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 20rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
  background-color: #409EFF;
  color: #fff;
  border: none;
}
.login-btn[disabled] {
  opacity: 0.7;
}
.error-msg {
  color: #F56C6C;
  font-size: 26rpx;
  text-align: center;
  margin-top: 20rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/login/index.vue
git commit -m "feat: add mini-program login page"
```

---

### Task 7: UniApp — 任务列表页

**Files:**
- Create: `client-miniapp/pages/task/list.vue`

**Interfaces:**
- Consumes: `utils/request.js` (request)
- API: `GET /api/tasks` → `{ list: [...] }`
- Produces: 状态 tab 筛选、关键词搜索、卡片展示列表

- [ ] **Step 1: 创建 `client-miniapp/pages/task/list.vue`**

```vue
<template>
  <view class="page-container">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索任务"
        @input="onSearch"
      />
    </view>

    <!-- 状态 Tabs -->
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: currentTab === tab.value }"
        @click="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
        <text class="tab-count">{{ tab.count }}</text>
      </view>
    </view>

    <!-- 任务列表 -->
    <scroll-view
      class="list-scroll"
      scroll-y
      @scrolltolower="loadMore"
    >
      <view
        v-for="task in filteredList"
        :key="task.id"
        class="task-card"
        @click="goDetail(task.id)"
      >
        <view class="task-header">
          <text class="task-title">{{ task.title }}</text>
          <text
            class="task-status"
            :class="'status-' + task.status"
          >{{ statusMap[task.status] }}</text>
        </view>
        <view class="task-meta">
          <text v-if="task.close_time" class="meta-item">
            闭环: {{ task.close_time.slice(0, 10) }}
          </text>
          <text class="meta-item">重要性: {{ task.importance || '-' }}</text>
        </view>
      </view>

      <view v-if="filteredList.length === 0" class="empty-state">
        <text>暂无任务</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      keyword: '',
      currentTab: -1,
      taskList: [],
      tabs: [
        { label: '全部', value: -1, count: 0 },
        { label: '待启动', value: 0, count: 0 },
        { label: '进行中', value: 1, count: 0 },
        { label: '已完成', value: 2, count: 0 }
      ],
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  computed: {
    filteredList() {
      let list = this.taskList
      if (this.currentTab >= 0) {
        list = list.filter(t => t.status === this.currentTab)
      }
      if (this.keyword) {
        list = list.filter(t => t.title.includes(this.keyword))
      }
      return list
    }
  },
  onShow() {
    this.loadTasks()
  },
  methods: {
    async loadTasks() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          this.taskList = res.list
          this.updateCounts()
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    updateCounts() {
      this.tabs[0].count = this.taskList.length
      this.tabs[1].count = this.taskList.filter(t => t.status === 0).length
      this.tabs[2].count = this.taskList.filter(t => t.status === 1).length
      this.tabs[3].count = this.taskList.filter(t => t.status === 2).length
    },
    switchTab(val) {
      this.currentTab = val
    },
    onSearch() {
      // keyword 通过 computed 自动过滤
    },
    goDetail(id) {
      uni.navigateTo({ url: '/pages/task/detail?id=' + id })
    },
    loadMore() {
      // UniApp scroll-view 触底加载—本页面无分页，保留占位供后续扩展
    }
  }
}
</script>

<style scoped>
.page-container {
  padding: 20rpx;
  min-height: 100vh;
}
.search-bar {
  margin-bottom: 20rpx;
}
.search-input {
  height: 72rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
  border: 2rpx solid #dcdfe6;
}
.tabs {
  display: flex;
  margin-bottom: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 10rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 26rpx;
  color: #606266;
  border-radius: 12rpx;
  position: relative;
}
.tab-item.active {
  background: #409EFF;
  color: #fff;
}
.tab-count {
  font-size: 20rpx;
  margin-left: 6rpx;
  opacity: 0.7;
}
.list-scroll {
  height: calc(100vh - 260rpx);
}
.task-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.task-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-status {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.status-0 { background: #f0f0f0; color: #909399; }
.status-1 { background: #ecf5ff; color: #409EFF; }
.status-2 { background: #f0f9eb; color: #67C23A; }
.task-meta {
  display: flex;
  gap: 20rpx;
}
.meta-item {
  font-size: 24rpx;
  color: #909399;
}
.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #909399;
  font-size: 28rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/task/list.vue
git commit -m "feat: add task list page"
```

---

### Task 8: UniApp — 任务详情页

**Files:**
- Create: `client-miniapp/pages/task/detail.vue`

**Interfaces:**
- Consumes: `utils/request.js`
- API: `GET /api/tasks` (获取单个任务详情), `GET /api/task/progress/:taskId`
- API: `POST /api/task/updateStatus`, `POST /api/task/delay`

- [ ] **Step 1: 创建 `client-miniapp/pages/task/detail.vue`**

```vue
<template>
  <view class="page-container">
    <view v-if="task" class="detail-card">
      <view class="detail-header">
        <text class="detail-title">{{ task.title }}</text>
        <text class="status-tag" :class="'status-' + task.status">
          {{ statusMap[task.status] }}
        </text>
      </view>

      <view class="info-section">
        <view class="info-row">
          <text class="info-label">目标</text>
          <text class="info-value">{{ task.target || '无' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">重要性</text>
          <text class="info-value">{{ task.importance || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">创建日期</text>
          <text class="info-value">{{ formatDate(task.create_time) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">闭环日期</text>
          <text class="info-value">{{ formatDate(task.close_time) }}</text>
        </view>
      </view>

      <!-- 操作按钮区 -->
      <view class="action-bar">
        <button
          v-if="task.status === 0"
          class="action-btn primary"
          @click="updateStatus(1)"
        >开始进行</button>
        <button
          v-if="task.status === 1"
          class="action-btn success"
          @click="updateStatus(2)"
        >标记完成</button>
        <button
          v-if="task.status !== 2"
          class="action-btn warning"
          @click="showDelay = true"
        >延期</button>
        <button class="action-btn default" @click="goEdit">编辑</button>
        <button class="action-btn danger" @click="deleteTask">删除</button>
      </view>

      <!-- 延期弹窗 -->
      <uni-popup v-if="showDelay" type="dialog" @close="showDelay = false">
        <view class="popup-content">
          <text class="popup-title">选择新的闭环日期</text>
          <picker mode="date" :value="newDate" @change="onDateChange">
            <view class="date-picker">{{ newDate }}</view>
          </picker>
          <view class="popup-btns">
            <button @click="showDelay = false">取消</button>
            <button type="primary" @click="confirmDelay">确认</button>
          </view>
        </view>
      </uni-popup>
    </view>

    <!-- 进展时间线 -->
    <view class="progress-section">
      <view class="section-title">
        <text>进展记录</text>
        <text class="add-progress" @click="goAddProgress">+ 添加</text>
      </view>
      <view v-for="p in progressList" :key="p.id" class="progress-item">
        <view class="progress-dot"></view>
        <view class="progress-body">
          <text class="progress-content">{{ p.content }}</text>
          <text class="progress-time">{{ formatDateTime(p.create_time) }}</text>
        </view>
      </view>
      <view v-if="progressList.length === 0" class="empty-progress">
        <text>暂无进展记录</text>
      </view>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      task: null,
      progressList: [],
      showDelay: false,
      newDate: '',
      taskId: '',
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  onLoad(options) {
    this.taskId = options.id
  },
  onShow() {
    if (this.taskId) {
      this.loadTask()
      this.loadProgress()
    }
  },
  methods: {
    async loadTask() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          this.task = res.list.find(t => t.id == this.taskId)
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadProgress() {
      try {
        const res = await request({ url: '/api/task/progress/' + this.taskId })
        if (res && res.list) {
          this.progressList = res.list
        }
      } catch (err) {
        // 进展为可选内容，静默失败
      }
    },
    async updateStatus(status) {
      try {
        await request({
          url: '/api/task/updateStatus',
          method: 'POST',
          data: { id: parseInt(this.taskId), status }
        })
        uni.showToast({ title: '更新成功', icon: 'success' })
        this.loadTask()
      } catch (err) {
        uni.showToast({ title: '更新失败', icon: 'none' })
      }
    },
    async deleteTask() {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除此任务吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await request({
                url: '/api/task/delete/' + this.taskId,
                method: 'DELETE'
              })
              uni.showToast({ title: '删除成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 1000)
            } catch (err) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },
    goEdit() {
      uni.navigateTo({ url: '/pages/task/edit?id=' + this.taskId })
    },
    goAddProgress() {
      uni.navigateTo({ url: '/pages/task/progress-add?taskId=' + this.taskId })
    },
    onDateChange(e) {
      this.newDate = e.detail.value
    },
    async confirmDelay() {
      try {
        await request({
          url: '/api/task/delay',
          method: 'POST',
          data: { id: parseInt(this.taskId), close_time: this.newDate }
        })
        this.showDelay = false
        uni.showToast({ title: '延期成功', icon: 'success' })
        this.loadTask()
      } catch (err) {
        uni.showToast({ title: '延期失败', icon: 'none' })
      }
    },
    formatDate(d) { return d ? d.slice(0, 10) : '-' },
    formatDateTime(d) { return d ? d.slice(0, 16) : '' }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.detail-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.detail-title { font-size: 34rpx; font-weight: 600; flex: 1; }
.status-tag { font-size: 22rpx; padding: 4rpx 20rpx; border-radius: 20rpx; }
.status-0 { background: #f0f0f0; color: #909399; }
.status-1 { background: #ecf5ff; color: #409EFF; }
.status-2 { background: #f0f9eb; color: #67C23A; }
.info-section { margin-bottom: 24rpx; }
.info-row {
  display: flex;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
}
.info-label { width: 140rpx; font-size: 26rpx; color: #909399; }
.info-value { flex: 1; font-size: 26rpx; color: #303133; }
.action-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.action-btn {
  flex: 1;
  min-width: 120rpx;
  height: 64rpx;
  line-height: 64rpx;
  font-size: 24rpx;
  text-align: center;
  border-radius: 12rpx;
  padding: 0 20rpx;
}
.primary { background: #409EFF; color: #fff; }
.success { background: #67C23A; color: #fff; }
.warning { background: #E6A23C; color: #fff; }
.danger { background: #F56C6C; color: #fff; }
.default { background: #f0f0f0; color: #606266; }
.progress-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.section-title {
  display: flex;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 500;
  margin-bottom: 20rpx;
}
.add-progress { color: #409EFF; font-size: 26rpx; }
.progress-item {
  display: flex;
  padding: 16rpx 0;
  border-left: 2rpx solid #ebeef5;
  margin-left: 12rpx;
  padding-left: 30rpx;
  position: relative;
}
.progress-dot {
  width: 16rpx;
  height: 16rpx;
  background: #409EFF;
  border-radius: 50%;
  position: absolute;
  left: -9rpx;
  top: 24rpx;
}
.progress-body { flex: 1; }
.progress-content { font-size: 26rpx; color: #303133; display: block; }
.progress-time { font-size: 22rpx; color: #909399; margin-top: 8rpx; display: block; }
.empty-progress { text-align: center; color: #909399; padding: 40rpx 0; }
.popup-content { padding: 40rpx; text-align: center; }
.popup-title { font-size: 30rpx; margin-bottom: 24rpx; display: block; }
.date-picker { font-size: 32rpx; color: #409EFF; padding: 20rpx; border: 2rpx solid #dcdfe6; border-radius: 12rpx; }
.popup-btns { display: flex; gap: 20rpx; margin-top: 30rpx; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/task/detail.vue
git commit -m "feat: add task detail page with progress timeline"
```

---

### Task 9: UniApp — 任务编辑/新增页

**Files:**
- Create: `client-miniapp/pages/task/edit.vue`

**Interfaces:**
- Consumes: `utils/request.js`
- API: `POST /api/task/add`, `POST /api/task/update`, `GET /api/tags`
- 接收参数: `?id=数字` 为编辑模式，无 id 为新增模式

- [ ] **Step 1: 创建 `client-miniapp/pages/task/edit.vue`**

```vue
<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">任务名称 *</text>
        <input class="form-input" v-model="form.title" placeholder="请输入任务名称" />
      </view>
      <view class="form-group">
        <text class="form-label">目标描述</text>
        <textarea class="form-textarea" v-model="form.target" placeholder="请输入任务目标" />
      </view>
      <view class="form-group">
        <text class="form-label">重要性</text>
        <view class="radio-group">
          <view
            v-for="level in 5"
            :key="level"
            class="radio-item"
            :class="{ active: form.importance === level }"
            @click="form.importance = level"
          >{{ level }}</view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">标签</text>
        <view class="tag-group">
          <view
            v-for="tag in tags"
            :key="tag.id"
            class="tag-item"
            :class="{ selected: selectedTagIds.includes(tag.id) }"
            @click="toggleTag(tag.id)"
          >{{ tag.name }}</view>
        </view>
      </view>
      <view class="form-row">
        <view class="form-group half">
          <text class="form-label">创建日期</text>
          <picker mode="date" :value="form.create_time" @change="e => form.create_time = e.detail.value">
            <view class="date-input">{{ form.create_time || '选择日期' }}</view>
          </picker>
        </view>
        <view class="form-group half">
          <text class="form-label">闭环日期</text>
          <picker mode="date" :value="form.close_time" @change="e => form.close_time = e.detail.value">
            <view class="date-input">{{ form.close_time || '选择日期' }}</view>
          </picker>
        </view>
      </view>
      <button class="submit-btn" type="primary" @click="handleSave">保存</button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      isEdit: false,
      taskId: null,
      tags: [],
      selectedTagIds: [],
      form: {
        title: '',
        target: '',
        importance: 3,
        create_time: '',
        close_time: ''
      }
    }
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true
      this.taskId = options.id
      this.loadTask(parseInt(options.id))
    }
    this.loadTags()
  },
  methods: {
    async loadTask(id) {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) {
          const task = res.list.find(t => t.id === id)
          if (task) {
            this.form.title = task.title
            this.form.target = task.target || ''
            this.form.importance = task.importance || 3
            this.form.create_time = task.create_time ? task.create_time.slice(0, 10) : ''
            this.form.close_time = task.close_time ? task.close_time.slice(0, 10) : ''
            if (task.tags) {
              try { this.selectedTagIds = JSON.parse(task.tags) } catch(e) { this.selectedTagIds = [] }
            }
          }
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadTags() {
      try {
        const res = await request({ url: '/api/tags' })
        if (res && res.list) this.tags = res.list
      } catch (err) {}
    },
    toggleTag(id) {
      const idx = this.selectedTagIds.indexOf(id)
      if (idx >= 0) this.selectedTagIds.splice(idx, 1)
      else this.selectedTagIds.push(id)
    },
    async handleSave() {
      if (!this.form.title) {
        uni.showToast({ title: '请输入任务名称', icon: 'none' })
        return
      }
      try {
        const data = {
          title: this.form.title,
          target: this.form.target,
          importance: this.form.importance,
          create_time: this.form.create_time,
          close_time: this.form.close_time,
          tagIds: this.selectedTagIds
        }
        if (this.isEdit) {
          data.id = this.taskId
          await request({ url: '/api/task/update', method: 'POST', data })
          uni.showToast({ title: '更新成功', icon: 'success' })
        } else {
          await request({ url: '/api/task/add', method: 'POST', data })
          uni.showToast({ title: '创建成功', icon: 'success' })
        }
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.form-group { margin-bottom: 30rpx; }
.form-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.form-textarea {
  width: 100%;
  height: 160rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.radio-group { display: flex; gap: 16rpx; }
.radio-item {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border: 2rpx solid #dcdfe6;
  border-radius: 50%;
  font-size: 26rpx;
}
.radio-item.active { background: #409EFF; color: #fff; border-color: #409EFF; }
.tag-group { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag-item {
  padding: 8rpx 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #606266;
}
.tag-item.selected { background: #ecf5ff; color: #409EFF; border-color: #409EFF; }
.form-row { display: flex; gap: 20rpx; }
.half { flex: 1; }
.date-input {
  height: 72rpx;
  line-height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #303133;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
  margin-top: 20rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/task/edit.vue
git commit -m "feat: add task create/edit page"
```

---

### Task 10: UniApp — 任务进展添加页

**Files:**
- Create: `client-miniapp/pages/task/progress-add.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/task/progress-add.vue`**

```vue
<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">进展内容</text>
        <textarea
          class="form-textarea"
          v-model="content"
          placeholder="描述本次进展..."
          :maxlength="500"
          auto-height
        />
        <text class="char-count">{{ content.length }}/500</text>
      </view>
      <button class="submit-btn" type="primary" :disabled="!content.trim()" @click="handleSubmit">
        提交进展
      </button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      taskId: '',
      content: ''
    }
  },
  onLoad(options) {
    this.taskId = options.taskId
  },
  methods: {
    async handleSubmit() {
      if (!this.content.trim()) return
      try {
        await request({
          url: '/api/task/progress/add',
          method: 'POST',
          data: { taskId: parseInt(this.taskId), content: this.content.trim() }
        })
        uni.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '提交失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.form-group { margin-bottom: 30rpx; position: relative; }
.form-label {
  font-size: 28rpx;
  color: #606266;
  margin-bottom: 12rpx;
  display: block;
}
.form-textarea {
  width: 100%;
  min-height: 200rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.char-count {
  position: absolute;
  right: 0;
  bottom: -40rpx;
  font-size: 22rpx;
  color: #909399;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/task/progress-add.vue
git commit -m "feat: add task progress add page"
```

---

### Task 11: UniApp — 闪念列表页

**Files:**
- Create: `client-miniapp/pages/flash/list.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/flash/list.vue`**

```vue
<template>
  <view class="page-container">
    <view class="header-bar">
      <text class="header-title">我的闪念</text>
      <text class="add-btn" @click="goCreate">+ 记录</text>
    </view>

    <scroll-view class="list-scroll" scroll-y>
      <view v-for="item in list" :key="item.id" class="flash-card" @click="goEdit(item.id)">
        <view class="flash-header">
          <text class="flash-status" :class="'status-' + item.status">
            {{ statusLabel(item.status) }}
          </text>
          <text class="flash-time">{{ formatDate(item.created_at) }}</text>
        </view>
        <text class="flash-content">{{ item.content }}</text>
        <view v-if="item.task_title" class="flash-task">
          <text class="task-link">关联任务: {{ item.task_title }}</text>
        </view>
      </view>

      <view v-if="list.length === 0" class="empty-state">
        <text>还没有闪念，开始记录吧</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { list: [] }
  },
  onShow() { this.loadList() },
  methods: {
    async loadList() {
      try {
        const res = await request({ url: '/api/flash-ideas' })
        if (res && res.code === 0) this.list = res.data || []
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    statusLabel(s) {
      const map = { sapling: '🌱 幼苗', tree: '🌳 小树', forest: '🌲 森林' }
      return map[s] || s
    },
    formatDate(d) { return d ? d.slice(0, 16) : '' },
    goCreate() { uni.navigateTo({ url: '/pages/flash/create' }) },
    goEdit(id) { uni.navigateTo({ url: '/pages/flash/edit?id=' + id }) }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.header-title { font-size: 34rpx; font-weight: 600; }
.add-btn { font-size: 28rpx; color: #409EFF; }
.list-scroll { height: calc(100vh - 180rpx); }
.flash-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.flash-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.flash-status { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 12rpx; }
.status-sapling { background: #fff7e6; color: #E6A23C; }
.status-tree { background: #ecf5ff; color: #409EFF; }
.status-forest { background: #f0f9eb; color: #67C23A; }
.flash-time { font-size: 22rpx; color: #909399; }
.flash-content {
  font-size: 28rpx;
  color: #303133;
  line-height: 1.6;
  display: block;
}
.flash-task {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 2rpx solid #f5f7fa;
}
.task-link { font-size: 24rpx; color: #409EFF; }
.empty-state { text-align: center; padding: 100rpx 0; color: #909399; font-size: 28rpx; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/flash/list.vue
git commit -m "feat: add flash ideas list page"
```

---

### Task 12: UniApp — 新建闪念页

**Files:**
- Create: `client-miniapp/pages/flash/create.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/flash/create.vue`**

```vue
<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <textarea
          class="big-textarea"
          v-model="content"
          placeholder="此刻的想法是什么？"
          :maxlength="1000"
          auto-height
        />
        <text class="char-count">{{ content.length }}/1000</text>
      </view>
      <button
        class="submit-btn"
        type="primary"
        :disabled="!content.trim()"
        @click="handleSubmit"
      >记录闪念</button>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { content: '' }
  },
  methods: {
    async handleSubmit() {
      if (!this.content.trim()) return
      try {
        await request({
          url: '/api/flash-ideas',
          method: 'POST',
          data: { content: this.content.trim() }
        })
        uni.showToast({ title: '记录成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '记录失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.form-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}
.form-group { margin-bottom: 30rpx; position: relative; }
.big-textarea {
  width: 100%;
  min-height: 300rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 30rpx;
  box-sizing: border-box;
  line-height: 1.6;
}
.char-count {
  position: absolute;
  right: 0;
  bottom: -40rpx;
  font-size: 22rpx;
  color: #909399;
}
.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  border-radius: 12rpx;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/flash/create.vue
git commit -m "feat: add flash ideas create page"
```

---

### Task 13: UniApp — 编辑闪念页

**Files:**
- Create: `client-miniapp/pages/flash/edit.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/flash/edit.vue`**

```vue
<template>
  <view class="page-container">
    <view class="form-card">
      <view class="form-group">
        <text class="form-label">内容</text>
        <textarea class="form-textarea" v-model="content" :maxlength="1000" auto-height />
      </view>
      <view class="form-group">
        <text class="form-label">状态</text>
        <view class="status-group">
          <view
            v-for="s in statusOptions"
            :key="s.value"
            class="status-option"
            :class="{ active: status === s.value }"
            @click="status = s.value"
          >{{ s.label }}</view>
        </view>
      </view>
      <view class="form-group">
        <text class="form-label">关联任务</text>
        <view class="task-select" @click="showTaskPicker = true">
          <text v-if="taskTitle" class="selected-task">{{ taskTitle }}</text>
          <text v-else class="placeholder-text">选择关联任务（可选）</text>
        </view>
        <text v-if="taskId" class="clear-task" @click="clearTask">取消关联</text>
      </view>
      <button class="submit-btn" type="primary" @click="handleSave">保存</button>
    </view>

    <!-- 任务选择弹窗 -->
    <uni-popup v-if="showTaskPicker" type="dialog" @close="showTaskPicker = false">
      <view class="popup-content">
        <text class="popup-title">选择关联任务</text>
        <scroll-view scroll-y class="task-picker-list">
          <view
            v-for="t in taskList"
            :key="t.id"
            class="task-picker-item"
            @click="selectTask(t)"
          >
            <text>{{ t.title }}</text>
            <text class="task-picker-status">{{ statusMap[t.status] }}</text>
          </view>
        </scroll-view>
        <button @click="showTaskPicker = false">关闭</button>
      </view>
    </uni-popup>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      id: null,
      content: '',
      status: 'sapling',
      taskId: null,
      taskTitle: '',
      taskList: [],
      showTaskPicker: false,
      statusOptions: [
        { value: 'sapling', label: '🌱 幼苗' },
        { value: 'tree', label: '🌳 小树' },
        { value: 'forest', label: '🌲 森林' }
      ],
      statusMap: { 0: '待启动', 1: '进行中', 2: '已完成' }
    }
  },
  onLoad(options) {
    this.id = options.id
    this.loadFlash()
    this.loadTasks()
  },
  methods: {
    async loadFlash() {
      try {
        const res = await request({ url: '/api/flash-ideas' })
        if (res && res.code === 0) {
          const item = res.data.find(i => i.id == this.id)
          if (item) {
            this.content = item.content
            this.status = item.status
            this.taskId = item.task_id
          }
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async loadTasks() {
      try {
        const res = await request({ url: '/api/tasks' })
        if (res && res.list) this.taskList = res.list
      } catch (err) {}
    },
    selectTask(t) {
      this.taskId = t.id
      this.taskTitle = t.title
      this.showTaskPicker = false
    },
    clearTask() {
      this.taskId = null
      this.taskTitle = ''
    },
    async handleSave() {
      try {
        const data = { content: this.content.trim() }
        if (this.taskId) data.task_id = this.taskId
        else data.task_id = null
        data.status = this.status

        await request({
          url: '/api/flash-ideas/' + this.id,
          method: 'PUT',
          data
        })
        uni.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 1000)
      } catch (err) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.form-card { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.form-group { margin-bottom: 30rpx; }
.form-label { font-size: 28rpx; color: #606266; margin-bottom: 12rpx; display: block; }
.form-textarea {
  width: 100%;
  min-height: 160rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.status-group { display: flex; gap: 16rpx; }
.status-option {
  padding: 12rpx 24rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 20rpx;
  font-size: 24rpx;
}
.status-option.active { background: #ecf5ff; color: #409EFF; border-color: #409EFF; }
.task-select {
  height: 72rpx;
  line-height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
}
.selected-task { color: #303133; }
.placeholder-text { color: #c0c4cc; }
.clear-task { font-size: 24rpx; color: #F56C6C; margin-top: 8rpx; display: inline-block; }
.submit-btn { width: 100%; height: 88rpx; line-height: 88rpx; font-size: 32rpx; border-radius: 12rpx; }
.popup-content { padding: 30rpx; max-height: 70vh; }
.popup-title { font-size: 30rpx; font-weight: 500; margin-bottom: 20rpx; display: block; }
.task-picker-list { max-height: 500rpx; }
.task-picker-item {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
  font-size: 26rpx;
}
.task-picker-status { font-size: 22rpx; color: #909399; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/flash/edit.vue
git commit -m "feat: add flash ideas edit page"
```

---

### Task 14: UniApp — 投资首页

**Files:**
- Create: `client-miniapp/pages/invest/index.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/invest/index.vue`**

```vue
<template>
  <view class="page-container">
    <view class="menu-grid">
      <view class="menu-item" @click="goVerify">
        <text class="menu-icon">🔍</text>
        <text class="menu-text">公司验证</text>
      </view>
      <view class="menu-item" @click="goEvaluate">
        <text class="menu-icon">📊</text>
        <text class="menu-text">基本面评估</text>
      </view>
      <view class="menu-item" @click="goReview">
        <text class="menu-icon">📝</text>
        <text class="menu-text">每日复盘</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  methods: {
    goVerify() { uni.navigateTo({ url: '/pages/invest/verify' }) },
    goEvaluate() { uni.navigateTo({ url: '/pages/invest/evaluate' }) },
    goReview() { uni.navigateTo({ url: '/pages/invest/review' }) }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.menu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20rpx;
}
.menu-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 20rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04);
}
.menu-icon { font-size: 48rpx; display: block; margin-bottom: 16rpx; }
.menu-text { font-size: 26rpx; color: #303133; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/invest/index.vue
git commit -m "feat: add investment index page"
```

---

### Task 15: UniApp — 公司验证页

**Files:**
- Create: `client-miniapp/pages/invest/verify.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/invest/verify.vue`**

```vue
<template>
  <view class="page-container">
    <view class="search-card">
      <view class="search-row">
        <input class="search-input" v-model="query" placeholder="输入公司名称或代码" @confirm="handleVerify" />
        <button class="search-btn" @click="handleVerify" :loading="loading">验证</button>
      </view>
    </view>

    <view v-if="result" class="result-card">
      <view class="result-row">
        <text class="result-label">是否为公司</text>
        <text class="result-value">{{ result.isCompany }}</text>
      </view>
      <view class="result-row">
        <text class="result-label">公司名称</text>
        <text class="result-value">{{ result.name }}</text>
      </view>
      <view class="result-row">
        <text class="result-label">公司代码</text>
        <text class="result-value">{{ result.code }}</text>
      </view>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { query: '', loading: false, result: null }
  },
  methods: {
    async handleVerify() {
      if (!this.query.trim()) return
      this.loading = true
      this.result = null
      try {
        const res = await request({
          url: '/api/invest/verify-company',
          method: 'POST',
          data: { query: this.query.trim() }
        })
        if (res && res.code === 0) this.result = res.data
      } catch (err) {
        uni.showToast({ title: '验证失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.search-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.search-row { display: flex; gap: 16rpx; }
.search-input {
  flex: 1;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
}
.search-btn {
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 32rpx;
  background: #409EFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.result-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f7fa;
}
.result-label { width: 160rpx; font-size: 26rpx; color: #909399; }
.result-value { flex: 1; font-size: 26rpx; color: #303133; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/invest/verify.vue
git commit -m "feat: add company verification page"
```

---

### Task 16: UniApp — 基本面评估页

**Files:**
- Create: `client-miniapp/pages/invest/evaluate.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/invest/evaluate.vue`**

```vue
<template>
  <view class="page-container">
    <view class="search-card">
      <view class="form-group">
        <text class="form-label">公司名称</text>
        <input class="form-input" v-model="name" placeholder="如：腾讯控股" />
      </view>
      <view class="form-group">
        <text class="form-label">公司代码</text>
        <input class="form-input" v-model="code" placeholder="如：00700" />
      </view>
      <button class="eval-btn" @click="handleEvaluate" :loading="loading">开始评估</button>
    </view>

    <view v-if="evaluation" class="result-card">
      <text class="result-title">评估结果</text>
      <text class="result-content">{{ evaluation }}</text>
    </view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return { name: '', code: '', loading: false, evaluation: '' }
  },
  methods: {
    async handleEvaluate() {
      if (!this.name.trim() || !this.code.trim()) {
        uni.showToast({ title: '请填写公司名称和代码', icon: 'none' })
        return
      }
      this.loading = true
      this.evaluation = ''
      try {
        const res = await request({
          url: '/api/invest/evaluate',
          method: 'POST',
          data: { name: this.name.trim(), code: this.code.trim() }
        })
        if (res && res.code === 0) {
          const data = res.data
          this.evaluation = typeof data.content === 'string'
            ? data.content
            : JSON.stringify(data.content, null, 2)
        }
      } catch (err) {
        uni.showToast({ title: '评估失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.search-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}
.form-group { margin-bottom: 24rpx; }
.form-label { font-size: 28rpx; color: #606266; margin-bottom: 12rpx; display: block; }
.form-input {
  width: 100%;
  height: 72rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.eval-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #409EFF;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  margin-top: 10rpx;
}
.result-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
.result-title { font-size: 30rpx; font-weight: 500; margin-bottom: 16rpx; display: block; }
.result-content {
  font-size: 26rpx;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/invest/evaluate.vue
git commit -m "feat: add company evaluation page"
```

---

### Task 17: UniApp — 每日复盘页

**Files:**
- Create: `client-miniapp/pages/invest/review.vue`

- [ ] **Step 1: 创建 `client-miniapp/pages/invest/review.vue`**

```vue
<template>
  <view class="page-container">
    <!-- 今日复盘入口 -->
    <view class="today-card" @click="showForm = true">
      <text class="today-label">今日复盘</text>
      <text class="today-desc">{{ todayReview ? '已填写' : '点击填写今日复盘' }}</text>
    </view>

    <!-- 复盘表单弹窗 -->
    <uni-popup v-if="showForm" type="dialog" @close="showForm = false">
      <view class="popup-content">
        <text class="popup-title">{{ isTodayReviewed ? '编辑今日复盘' : '填写今日复盘' }}</text>
        <textarea class="review-textarea" v-model="reviewContent" placeholder="记录今天的投资思考..." />
        <view class="popup-btns">
          <button @click="showForm = false">取消</button>
          <button type="primary" @click="saveReview">保存</button>
        </view>
      </view>
    </uni-popup>

    <!-- 历史复盘列表 -->
    <view class="section-title">历史复盘</view>
    <scroll-view class="list-scroll" scroll-y>
      <view v-for="item in reviewList" :key="item.id" class="review-card">
        <text class="review-date">{{ item.date || item.create_time?.slice(0, 10) }}</text>
        <text class="review-text">{{ item.content }}</text>
      </view>
      <view v-if="reviewList.length === 0" class="empty-state">
        <text>暂无复盘记录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
const { request } = require('../../utils/request')

export default {
  data() {
    return {
      reviewList: [],
      todayReview: null,
      showForm: false,
      reviewContent: ''
    }
  },
  computed: {
    isTodayReviewed() { return !!this.todayReview }
  },
  onShow() { this.loadReviews() },
  methods: {
    async loadReviews() {
      try {
        const res = await request({ url: '/api/investment-review/list' })
        if (res && res.code === 200) {
          this.reviewList = res.list || []
          const today = new Date().toISOString().slice(0, 10)
          this.todayReview = this.reviewList.find(r =>
            (r.date || r.create_time?.slice(0, 10)) === today
          ) || null
        }
      } catch (err) {
        uni.showToast({ title: '加载失败', icon: 'none' })
      }
    },
    async saveReview() {
      if (!this.reviewContent.trim()) return
      try {
        await request({
          url: '/api/investment-review/save',
          method: 'POST',
          data: { content: this.reviewContent.trim() }
        })
        uni.showToast({ title: '保存成功', icon: 'success' })
        this.showForm = false
        this.reviewContent = ''
        this.loadReviews()
      } catch (err) {
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page-container { padding: 20rpx; }
.today-card {
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}
.today-label { font-size: 32rpx; font-weight: 600; color: #fff; display: block; margin-bottom: 8rpx; }
.today-desc { font-size: 26rpx; color: rgba(255,255,255,0.8); }
.section-title { font-size: 30rpx; font-weight: 500; margin-bottom: 16rpx; }
.list-scroll { height: calc(100vh - 320rpx); }
.review-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.review-date { font-size: 24rpx; color: #909399; display: block; margin-bottom: 8rpx; }
.review-text { font-size: 28rpx; color: #303133; line-height: 1.6; display: block; }
.empty-state { text-align: center; padding: 80rpx 0; color: #909399; }
.popup-content { padding: 40rpx; }
.popup-title { font-size: 30rpx; font-weight: 500; margin-bottom: 20rpx; display: block; }
.review-textarea {
  width: 100%;
  min-height: 240rpx;
  border: 2rpx solid #dcdfe6;
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.popup-btns { display: flex; gap: 20rpx; margin-top: 24rpx; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client-miniapp/pages/invest/review.vue
git commit -m "feat: add investment daily review page"
```

---

### Task 18: 整体验证

- [ ] **Step 1: 后端验证 — 启动后端并测试 JWT 登录**

```bash
cd server && npm start
```
在另一个终端：
```bash
curl -X POST http://localhost:3000/api/auth/mini/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xuanzhehua","password":"224539"}'
```
Expected: 返回含 JWT token 的 JSON

- [ ] **Step 2: 后端验证 — 用 JWT token 请求受保护 API**

从上一步拿到 token，然后：
```bash
TOKEN="<上一步返回的 JWT>"
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
```
Expected: 返回任务列表 JSON

- [ ] **Step 3: 后端验证 — Web 端 base64 token 仍然可用**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xuanzhehua","password":"224539"}'
```
Expected: 返回含 base64 token 的 JSON（与改造前一致）

- [ ] **Step 4: 小程序端验证 — UniApp 项目编译**

```bash
cd client-miniapp
npm install
npm run dev:mp-weixin
```
Expected: UniApp 编译输出到 `dist/dev/mp-weixin/`，可用微信开发者工具打开

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: complete mini-program Phase 1 & Phase 2"
```
