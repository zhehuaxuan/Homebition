# 关于我页面菜单分组优化 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"关于我"页面侧边栏 7 个菜单项按"个人 / 内容管理 / 任务与订阅"三组分组展示，移动端改用分段控制器切换分组后显示对应标签栏。

**架构:** 单文件修改（`About.vue`），不改动路由、子组件和后端。桌面端在侧边栏插入分组标题和分割线；移动端将平铺的标签栏改为分段控制器 + 当前分组动态标签栏。

**Tech Stack:** Vue 3 (Composition API), Element Plus, SCSS

---

### Task 1: 重构 About.vue 菜单分组结构

**Files:**
- Modify: `client/src/views/About.vue`

**Interfaces:**
- Consumes: 无外部依赖
- Produces: 无下游依赖（单文件修改）

---

- [ ] **Step 1: 更新 script 部分 — 定义分组数据、activeGroup ref、计算属性**

将平铺的 `tabs` 数组改为带 `group` 字段的结构，新增 `groups` 分组定义、`activeGroup` 状态、`filteredTabs` 计算属性。

替换 `<script setup>` 内容为：

```javascript
<script setup>
import { ref, computed } from 'vue'

// 分组定义
const groups = [
  { key: 'personal', label: '个人' },
  { key: 'content', label: '内容管理' },
  { key: 'tasks', label: '任务与订阅' },
]

// 分组标题 + 菜单项定义（group: null 表示分组标题行）
const menuGroups = [
  {
    key: 'personal',
    label: '个人',
    children: [
      { to: '/about/profile', label: '关于我', icon: '👤' },
      { to: '/about/devices', label: '我的设备', icon: '💻' },
    ],
  },
  {
    key: 'content',
    label: '内容管理',
    children: [
      { to: '/about/article-list', label: '文章清单', icon: '📄' },
      { to: '/about/tag-list', label: '标签管理', icon: '🏷' },
    ],
  },
  {
    key: 'tasks',
    label: '任务与订阅',
    children: [
      { to: '/about/task-list', label: '任务清单', icon: '📋' },
      { to: '/about/subscription-list', label: '订阅管理', icon: '📧' },
      { to: '/about/daily-summary', label: '每日总结', icon: '📋' },
    ],
  },
]

// 移动端：当前选中的分组
const activeGroup = ref('personal')

// 移动端：当前分组下的标签栏数据
const filteredTabs = computed(() => {
  const group = menuGroups.find((g) => g.key === activeGroup.value)
  return group ? group.children : []
})

// 移动端标签（短标签用于移动端显示）
const tabLabels = {
  '/about/profile': '关于我',
  '/about/devices': '设备',
  '/about/article-list': '文章',
  '/about/tag-list': '标签',
  '/about/task-list': '任务',
  '/about/subscription-list': '订阅',
  '/about/daily-summary': '日报',
}
</script>
```

---

- [ ] **Step 2: 更新桌面端侧边栏模板 — 分组标题 + 分割线**

将 `<div class="sidebar">` 中的 `v-for` 平铺菜单替换为嵌套分组结构：

```html
<!-- 左侧导航栏 -->
<div class="sidebar">
  <div class="sidebar-header">关于我</div>
  <div v-for="group in menuGroups" :key="group.key" class="sidebar-group">
    <div class="group-title">{{ group.label }}</div>
    <ul class="sidebar-menu">
      <li v-for="item in group.children" :key="item.to">
        <router-link :to="item.to" class="menu-item">
          <span class="icon">{{ item.icon }}</span>
          <span class="text">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</div>
```

---

- [ ] **Step 3: 更新移动端模板 — 分段控制器 + 动态标签栏**

将 `.mobile-tab-bar` 替换为分段控制器 + 动态标签栏：

```html
<!-- 手机端：分段控制器 + 标签栏 -->
<div class="mobile-container">
  <div class="mobile-segments">
    <button
      v-for="g in groups"
      :key="g.key"
      :class="['segment-btn', { active: activeGroup === g.key }]"
      @click="activeGroup = g.key"
    >
      {{ g.label }}
    </button>
  </div>
  <div class="mobile-tab-bar">
    <router-link
      v-for="tab in filteredTabs"
      :key="tab.to"
      :to="tab.to"
      class="mobile-tab-item"
    >
      <span class="mobile-tab-icon">{{ tab.icon }}</span>
      <span class="mobile-tab-text">{{ tabLabels[tab.to] }}</span>
    </router-link>
  </div>
</div>
```

---

- [ ] **Step 4: 新增分组标题和移动端分段控制器的 CSS**

在 `<style scoped>` 末尾添加：

```css
/* 分组标题 */
.sidebar-group {
  padding: 0;
}

.group-title {
  font-size: 12px;
  color: #64748b;
  padding: 8px 20px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 移动端容器 */
.mobile-container {
  display: none;
}

@media (max-width: 768px) {
  .mobile-container {
    display: block;
  }

  .mobile-segments {
    display: flex;
    background: #1e293b;
    border-radius: 8px 8px 0 0;
    overflow: hidden;
    border: 1px solid #334155;
    border-bottom: none;
  }

  .segment-btn {
    flex: 1;
    padding: 8px 6px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    border-bottom: 2px solid transparent;
  }

  .segment-btn.active {
    color: #409eff;
    background: rgba(64, 158, 255, 0.08);
    border-bottom-color: #409eff;
  }

  .segment-btn:not(.active):hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.03);
  }

  .mobile-tab-bar {
    display: flex;
    overflow-x: auto;
    white-space: nowrap;
    gap: 0;
    background: #1e293b;
    border-radius: 0 0 8px 8px;
    margin-bottom: 8px;
    border: 1px solid #334155;
    border-top: 1px solid #334155;
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
}
```

---

- [ ] **Step 5: 删除旧的 desktop 端 sidebar-menu 中每个 `<li>` 重复的 `router-link` + 删除旧的移动端样式 `@media` 中 `.mobile-tab-bar` 的 `display: flex` 样式（已迁移到新代码）**

具体来说，删除原有模板中 `.sidebar` 下的 `<ul class="sidebar-menu">` 整个平铺的 `v-for` 代码块（约第 18-61 行），以及删除原有 `<style>` 中 `@media (max-width: 768px)` 下的 `.mobile-tab-bar` 样式块（约第 198-233 行），替换为 Step 4 的新 CSS。

> 注意：Step 2 的新模板已完整替换旧模板，Step 3 的新移动端模板替换旧移动端模板，Step 4 的 CSS 替换旧的移动端样式。实际操作时可以直接用新内容整体替换对应区块。

---

- [ ] **Step 6: 验证效果**

1. 启动前端 dev server：
   ```bash
   cd client && npm run dev
   ```
2. 浏览器访问 `http://localhost:5173/about/profile`
3. **桌面端验证（F12 切换至 ≥768px 宽度）：**
   - 侧边栏显示三个分组标题：个人、内容管理、任务与订阅
   - 分组之间有分割线
   - 标签管理图标为 🏷，不再和文章共用 📄
   - 各菜单点击正常跳转、高亮正确
4. **移动端验证（F12 切换至 <768px 宽度）：**
   - 顶部显示三段式切换按钮：个人 / 内容管理 / 任务与订阅
   - 默认选中"个人"，下方显示"关于我"和"设备"两个标签
   - 点击"内容管理"，标签栏变为"文章"和"标签"
   - 点击"任务与订阅"，标签栏变为"任务"、"订阅"和"日报"
   - 各标签点击正常跳转、高亮正确

---

- [ ] **Step 7: 提交**

```bash
git add client/src/views/About.vue
git commit -m "feat: 关于我页面菜单分组优化 - 按个人/内容/任务三组展示

桌面端侧边栏增加分组标题和分割线；
移动端改用分段控制器切换分组，动态显示对应标签栏。
REQ-027"
```
