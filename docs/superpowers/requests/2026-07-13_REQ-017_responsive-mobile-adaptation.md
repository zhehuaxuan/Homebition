# [REQ-017] 全站移动端响应式适配

**提出日期**: 2026-07-13
**状态**: 已实现
**已同步**: 2026-07-13
**关联需求**: 无

## 1. 原始需求

Homebition 站点在手机浏览器上界面布局混乱，无法正常完成功能操作。需要全面响应式重构，使所有页面在移动端可正常浏览和操作，同时保持现有的深色主题 UI 风格和 Element Plus 组件库不变。

## 2. 验收标准

- [x] 导航栏在手机端折叠为汉堡菜单
- [x] About/Invest 侧边栏在手机端切换为顶部标签栏
- [x] 所有 el-table 页面在手机端可水平滚动或自适应隐藏次要列
- [x] MyTasks 甘特图高度自适应视口
- [x] 首页布局在手机端正常显示
- [x] 登录页在手机端正常显示
- [x] Dialog 弹窗在手机端全屏宽度
- [x] 桌面端样式零改动

## 3. 设计方案

### 3.1 全局样式 (index.css)

**新增 CSS 变量**：
```css
:root {
  --page-padding: 2rem;       /* 桌面端 */
}
@media (max-width: 768px) {
  :root {
    --page-padding: 1rem;     /* 手机端 */
  }
}
```

**新增 `.page-container` 统一类**：
```css
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--page-padding);
}
```

### 3.2 导航栏汉堡菜单 (Index.vue)

**新增状态**: `menuOpen` (ref)
**新增按钮**: 手机端显示汉堡图标（三横线 SVG），点击切换 `menuOpen`
**手机端菜单**: 全屏遮罩 + 垂直链接列表，点击链接自动关闭并跳转

### 3.3 侧边栏转顶部标签栏 (About.vue / Invest.vue)

**手机端(<768px)**:
- 侧边栏 `display: none`
- 新增水平标签栏：`display: flex; overflow-x: auto; white-space: nowrap`
- 每个标签为 `router-link`，保持当前激活态高亮样式
- 内容区 `margin-left: 0`

### 3.4 表格响应式 (Subscription.vue / Task.vue / 其他)

**HTML 结构**：
```html
<div class="table-container">  <!-- overflow-x: auto -->
  <el-table ...>
    <el-table-column class-name="hide-on-mobile" ... />  <!-- 手机端隐藏列 -->
  </el-table>
</div>
```

**CSS**:
```css
@media (max-width: 768px) {
  .hide-on-mobile .el-table__cell {
    display: none !important;
  }
  .el-dialog {
    width: 95vw !important;
    max-width: 95vw !important;
  }
}
```

### 3.5 甘特图自适应 (MyTasks.vue)

- `height: 700px` → `height: calc(100vh - 180px)`
- 手机端 `resourceAreaWidth: '80px'`
- 统计条内联换行适应

### 3.6 首页微调

- 头像 `200px` → `<480px` 时 `140px`
- 已有响应式媒体查询补充完善

### 3.7 登陆页微调

- `max-width: 400px` → `<480px` 时 `95vw`

## 4. 实现计划

### Step 1: 全局样式 + 导航栏
- 修改 `client/src/index.css` — 新增 CSS 变量、`.page-container`、导航栏手机端样式、通用响应式断点
- 修改 `client/src/Index.vue` — 新增汉堡菜单状态和模板

### Step 2: About / Invest 侧边栏
- 修改 `client/src/views/About.vue`
- 修改 `client/src/views/invest/Invest.vue`

### Step 3: 表格页面
- 修改 `client/src/views/about/Subscription.vue`
- 修改 `client/src/views/about/Task.vue`
- 修改 `client/src/views/about/Tag.vue`
- 修改 `client/src/views/about/ArticleList.vue`
- 修改 `client/src/views/about/Devices.vue`
- 统一添加 `.table-container` 包裹和 `.hide-on-mobile` 类名

### Step 4: 甘特图、首页、登录页
- 修改 `client/src/views/MyTasks.vue` — 高度、资源列宽度
- 修改 `client/src/views/Home.vue` — 头像尺寸
- 修改 `client/src/views/Login.vue` — 卡片宽度

## 5. 变更清单

_（实现后由 sync-request 自动填充）_
