# 全站移动端响应式适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使 Homebition 所有页面在手机浏览器上可正常浏览和操作，桌面端样式零改动。

**Architecture:** 纯 CSS media query（768px/480px 两个断点）+ 新增汉堡菜单组件 + 侧边栏转标签栏。不引入额外依赖库，保持 Element Plus + 深色主题风格不变。

**Tech Stack:** Vue 3 + Element Plus + CSS3

**Design Doc:** `docs/superpowers/requests/2026-07-13_REQ-017_responsive-mobile-adaptation.md`

---

## Task 1: 全局样式与导航栏汉堡菜单

**Files:**
- Modify: `client/src/index.css` — 新增 CSS 变量、`.page-container`、导航栏手机端响应式、通用工具类
- Modify: `client/src/Index.vue` — 新增汉堡菜单状态和模板

**Interfaces:**
- Consumes: 全局 CSS 变量 `--page-padding`、`--breakpoint-mobile`
- Produces: `menuOpen` ref 控制汉堡菜单展开状态

- [ ] **Step 1: 在 index.css 的 `:root` 中新增 CSS 变量**

```css
:root {
  --page-padding: 2rem;
  --breakpoint-mobile: 768px;
  --breakpoint-small: 480px;
}
```

- [ ] **Step 2: 在 index.css 末尾追加全局响应式规则**

```css
/* ========== 全局响应式 ========== */

/* 统一页面容器 */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--page-padding);
}

/* 表格水平滚动容器 */
.table-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.table-container .el-table {
  min-width: 600px;
}

/* 手机端隐藏列 */
@media (max-width: 768px) {
  .hide-on-mobile .el-table__cell {
    display: none !important;
  }
}

/* Dialog 全屏展开 */
@media (max-width: 480px) {
  .el-dialog {
    width: 95vw !important;
    max-width: 95vw !important;
  }
}

/* 桌面端导航保持不变，手机端汉堡菜单支持已在 Index.vue 中实现 */
```

- [ ] **Step 3: 在 Index.vue 的 `<script setup>` 中新增菜单状态和切换函数**

```js
const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}
```

- [ ] **Step 4: 修改 Index.vue 的 `<template>`，添加汉堡按钮和手机菜单**

将导航栏从当前模板修改为：

```html
 <nav>
  <div class="nav-brand">Homebition</div>
  <!-- 桌面端导航链接 -->
  <ul class="nav-links" :class="{ 'nav-open': menuOpen }">
    <li><router-link to="/" @click="closeMenu">首页</router-link></li>
    <li><router-link to="/articles" @click="closeMenu">我的文章</router-link></li>
    <li><router-link to="/invest" @click="closeMenu">投资频道</router-link></li>
    <li v-if="authStore.isLoggedIn()"><router-link to="/tasks" @click="closeMenu">我的任务</router-link></li>
    <li v-if="authStore.isLoggedIn()"><router-link to="/about" @click="closeMenu">关于我</router-link></li>
  </ul>
  <div class="nav-actions">
    <router-link v-if="!authStore.isLoggedIn()" to="/login" class="nav-login-btn" @click="closeMenu">登录</router-link>
    <el-dropdown v-else trigger="click">
      <span class="user-name">
        {{ authStore.username }}
        <el-icon><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="$router.push('/about'); closeMenu()">关于我</el-dropdown-item>
          <el-dropdown-item divided @click="authStore.setLogout(); $router.push('/')">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <!-- 汉堡菜单按钮（手机端显示） -->
    <button class="hamburger-btn" @click="toggleMenu" aria-label="菜单">
      <span class="hamburger-line" :class="{ open: menuOpen }"></span>
      <span class="hamburger-line" :class="{ open: menuOpen }"></span>
      <span class="hamburger-line" :class="{ open: menuOpen }"></span>
    </button>
  </div>
</nav>
<!-- 手机端遮罩层 -->
<div v-if="menuOpen" class="mobile-overlay" @click="closeMenu">
  <div class="mobile-menu" @click.stop>
    <router-link v-for="link in mobileLinks" :key="link.path" :to="link.path" class="mobile-menu-item" @click="closeMenu">
      <span class="mobile-menu-icon">{{ link.icon }}</span>
      <span>{{ link.label }}</span>
    </router-link>
    <div v-if="authStore.isLoggedIn()" class="mobile-menu-item mobile-logout" @click="authStore.setLogout(); closeMenu(); $router.push('/')">
      <span class="mobile-menu-icon">🚪</span>
      <span>退出登录</span>
    </div>
  </div>
</div>
```

- [ ] **Step 5: 在 Index.vue 的 `<script setup>` 中添加 mobileLinks 计算属性**

```js
const mobileLinks = computed(() => {
  const links = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/articles', label: '我的文章', icon: '📝' },
    { path: '/invest', label: '投资频道', icon: '💰' },
  ]
  if (authStore.isLoggedIn()) {
    links.push({ path: '/tasks', label: '我的任务', icon: '✅' })
    links.push({ path: '/about', label: '关于我', icon: '👤' })
  }
  if (!authStore.isLoggedIn()) {
    links.push({ path: '/login', label: '登录', icon: '🔑' })
  }
  return links
})
```

- [ ] **Step 6: 在 Index.vue 的 `<style scoped>` 末尾追加汉堡菜单和手机端样式**

```css
/* 汉堡菜单按钮 */
.hamburger-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  flex-direction: column;
  gap: 4px;
}

.hamburger-line {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text-secondary);
  border-radius: 2px;
  transition: all 0.3s;
}

.hamburger-line.open:nth-child(1) {
  transform: rotate(45deg) translate(4px, 4px);
}
.hamburger-line.open:nth-child(2) {
  opacity: 0;
}
.hamburger-line.open:nth-child(3) {
  transform: rotate(-45deg) translate(4px, -4px);
}

/* 手机遮罩 + 菜单 */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 1000;
}

.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: #1e293b;
  padding: 20px 0;
  overflow-y: auto;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 16px;
  transition: background 0.2s;
}
.mobile-menu-item:hover {
  background: #2d3a52;
  color: #a5b4fc;
}
.mobile-menu-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
}
.mobile-logout {
  border-top: 1px solid #334155;
  margin-top: 8px;
  padding-top: 16px;
  color: #f56c6c;
}

@media (max-width: 768px) {
  .hamburger-btn {
    display: flex;
  }
  .mobile-overlay {
    display: block;
  }
  .nav-links {
    display: none;
  }
}
```

- [ ] **Step 7: 更新 Index.vue 的 import，添加 `computed`**

```js
import { onMounted, onUnmounted, computed } from 'vue'
```

---

## Task 2: About / Invest 侧边栏手机端切换为标签栏

**Files:**
- Modify: `client/src/views/About.vue`
- Modify: `client/src/views/invest/Invest.vue`

- [ ] **Step 1: 修改 About.vue 的 `<template>`，在侧边栏前新增手机端水平标签栏**

在 `<div class="about-layout">` 内部最上方添加：

```html
<!-- 手机端水平标签栏 -->
<div class="mobile-tab-bar">
  <router-link
    v-for="tab in tabs"
    :key="tab.to"
    :to="tab.to"
    class="mobile-tab-item"
  >
    <span class="mobile-tab-icon">{{ tab.icon }}</span>
    <span class="mobile-tab-text">{{ tab.label }}</span>
  </router-link>
</div>
```

- [ ] **Step 2: 在 About.vue 的 `<script setup>` 中添加 tabs 数据**

```js
const tabs = [
  { to: '/about/profile', label: '关于我', icon: '👤' },
  { to: '/about/devices', label: '设备', icon: '💻' },
  { to: '/about/task-list', label: '任务', icon: '📄' },
  { to: '/about/article-list', label: '文章', icon: '📄' },
  { to: '/about/tag-list', label: '标签', icon: '📄' },
  { to: '/about/subscription-list', label: '订阅', icon: '📧' },
]
```

- [ ] **Step 3: 在 About.vue 的 `<style scoped>` 末尾追加手机端响应式样式**

```css
/* 手机端水平标签栏 */
.mobile-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .about-layout {
    flex-direction: column;
    padding: 8px;
  }

  .sidebar {
    display: none !important;
  }

  .mobile-tab-bar {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
    background: #1e293b;
    border-radius: 8px;
    margin-bottom: 8px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mobile-tab-bar::-webkit-scrollbar {
    display: none;
  }

  .mobile-tab-item {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
    color: #94a3b8;
    text-decoration: none;
    font-size: 13px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .mobile-tab-item.router-link-active {
    color: #409eff;
    border-bottom-color: #409eff;
  }
  .mobile-tab-icon {
    font-size: 14px;
  }
  .mobile-tab-text {
    white-space: nowrap;
  }

  .content-panel {
    margin-left: 0 !important;
    padding: 16px !important;
    border-radius: 8px !important;
    min-height: auto !important;
  }
}
```

- [ ] **Step 4: 同样的修改应用到 Invest.vue**

在 Invest.vue 的 `<template>` 中添加手机端标签栏：

```html
<div class="mobile-tab-bar">
  <router-link to="/invest/enterprise" class="mobile-tab-item">
    <span class="mobile-tab-icon">🏢</span>
    <span class="mobile-tab-text">企业评估</span>
  </router-link>
  <router-link to="/invest/market" class="mobile-tab-item">
    <span class="mobile-tab-icon">📊</span>
    <span class="mobile-tab-text">大盘温度</span>
  </router-link>
</div>
```

在 Invest.vue 的 `<style scoped>` 中追加和 About.vue 完全相同的手机端响应式样式（同上 Step 3）。

---

## Task 3: 表格页面响应式 + 操作按钮缩小

**Files:**
- Modify: `client/src/views/about/Subscription.vue`
- Modify: `client/src/views/about/Task.vue`
- Modify: `client/src/views/about/Tag.vue`
- Modify: `client/src/views/about/ArticleList.vue`
- Modify: `client/src/views/about/Devices.vue`

- [ ] **Step 1: 在 Subscription.vue 的 `<template>` 中，给操作栏元素添加响应式样式清理**

修改第 9 行中的 `style="width: 260px"` 和 `style="width: 150px"` —— 移除内联宽度，改用 CSS class：

删除搜索框的 `style="width: 260px"` 和状态过滤、接口名称、创建时间等列的 `style="width: ..."` 内联样式。

- [ ] **Step 2: 在 Subscription.vue 的 `<template>` 中，给 el-table 外层包裹 `.table-container`**

```html
<div class="table-container">
  <el-table ...>
  ...
  </el-table>
</div>
```

在次要列上添加 `class-name="hide-on-mobile"`。根据设计文档表格页的隐藏策略：

| 页面 | 隐藏列 |
|------|--------|
| Subscription.vue 订阅tab | type 列、接口名称列、创建时间列 |
| Subscription.vue 邮箱tab | 类型列、时间列 |
| Subscription.vue 模板tab | 大小列、更新时间列 |
| Subscription.vue 接口tab | 描述列、创建时间列 |

例如订阅任务表格的 `type` 列：
```html
<el-table-column prop="type" label="类型" width="100" class-name="hide-on-mobile">
```

操作按钮从 `size="small"` 改为：
```html
<el-button size="small" class="action-btn" ...>
```

并在样式中追加：
```css
@media (max-width: 768px) {
  .action-bar { flex-wrap: wrap; }
  .action-btn { padding: 5px 8px; font-size: 12px; }
}
```

- [ ] **Step 3: 对 Task.vue 重复 Step 1-2 的模式**

Task.vue 的 el-table 列已无内联 width，只需：
- 外层包裹 `<div class="table-container">`
- 目标列、标签列、剩余时间列加 `class-name="hide-on-mobile"`
- 操作列 Button 缩小

- [ ] **Step 4: 对 Tag.vue 重复 Step 1-2 的模式**

Tag.vue 列少，无需隐藏列，只需：
- 表格外层确认有 `.table-container` 包裹

- [ ] **Step 5: 对 ArticleList.vue 重复 Step 1-2 的模式**

- 外层包裹 `.table-container`
- 链接列加 `class-name="hide-on-mobile"`

- [ ] **Step 6: 对 Devices.vue 重复 Step 1-2 的模式**

- 外层包裹 `.table-container`
- 隐藏列：当前价格、过期时间、状态

---

## Task 4: MyTasks 甘特图 + 首页 + 登录页微调

**Files:**
- Modify: `client/src/views/MyTasks.vue`
- Modify: `client/src/views/Home.vue`
- Modify: `client/src/views/Login.vue`

- [ ] **Step 1: 修改 MyTasks.vue 的根 div 样式和 FullCalendar 配置**

将第 2 行 `<div style="padding: 20px; height: 700px;">` 改为：
```html
<div class="my-tasks-container" style="padding: 20px;">
```

将 `resourceAreaWidth: '180px'` 改为动态值。在 `<script setup>` 中添加：
```js
const isMobile = ref(window.innerWidth < 768)
const onResize = () => { isMobile.value = window.innerWidth < 768 }

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
```

修改 `calendarOptions`：
```js
resourceAreaWidth: isMobile.value ? '80px' : '180px',
```

注意：由于 FullCalendar options 是 ref 对象，resourceAreaWidth 需响应式。推荐用 watch 监听 `isMobile` 并重建 calendarOptions，或者简单地在手机端用 CSS 覆盖：

```css
@media (max-width: 768px) {
  .my-tasks-container {
    height: calc(100vh - 160px);
    padding: 10px !important;
  }
  .my-tasks-container .stats-bar {
    font-size: 12px;
    line-height: 1.8;
  }
}
```

- [ ] **Step 2: 在 MyTasks.vue 的 `<style scoped>` 或全局样式中追加 FullCalendar 手机端 CSS**

```css
@media (max-width: 768px) {
  .my-tasks-container {
    height: calc(100vh - 160px) !important;
    padding: 10px !important;
  }
  /* FullCalendar 资源列缩小 */
  .fc-resource-area {
    width: 80px !important;
  }
  .fc-resource-area .fc-cell-content {
    font-size: 11px !important;
  }
}
```

- [ ] **Step 3: 修改 Home.vue 头像尺寸 - 在 `<style scoped>` 末尾追加**

```css
@media (max-width: 480px) {
  .avatar {
    width: 140px !important;
    height: 140px !important;
  }
  .profile-name {
    font-size: 1.4rem !important;
  }
  .container {
    padding: 1rem !important;
  }
}
```

- [ ] **Step 4: 修改 Login.vue 登录卡片宽度 - 在 `<style scoped>` 末尾追加**

```css
@media (max-width: 480px) {
  .login-container {
    padding: 1rem !important;
  }
  .login-card {
    max-width: 95vw !important;
  }
}
```
