# 布局优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页、关于我、投资频道三个页面压缩布局，消除不必要的 scroll-y，一屏可展示。

**Architecture:** 纯 CSS 改动（间距压缩 + 定位方式变更），不涉及组件逻辑。首页用覆盖样式缩小间距/头像/卡片；关于我/投资频道侧边栏从 `position: fixed` 改为 `position: sticky`。

**Tech Stack:** Vue 3 + CSS3

**Design Doc:** `docs/superpowers/requests/2026-07-14_REQ-019_layout-optimization.md`

---

## Task 1: 首页布局压缩

**Files:**
- Modify: `client/src/index.css` — 修改 `.container`, `.work-section`, `.work-grid`, `.work-card`, `.info-grid` 等的间距
- Modify: `client/src/views/Home.vue` — 添加头像/个人介绍超出省略的 CSS

- [ ] **Step 1: 在 index.css 中修改全局首页布局间距**

修改 `.container` 的 `gap: 3rem` → `gap: 1.5rem`，修改 `.info-grid` 的 `gap: 2rem` → `gap: 1rem`，修改头像 `width: 200px` → `width: 120px`：

```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1.5rem;           /* 从 3rem 改为 1.5rem */
    align-items: start;
}

.avatar {
    width: 120px;           /* 从 200px 改为 120px */
    height: 120px;          /* 同步缩小 */
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 1rem;
    border: 3px solid var(--accent);
}
```

- [ ] **Step 2: 修改友情链接区域间距**

```css
.work-section {
    background-color: var(--bg-primary);
    padding: 1rem 2rem;     /* 从 2rem 改为 1rem 2rem */
    margin-top: 2rem;
}

.work-grid {
    max-width: 900px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;            /* 从 1rem 改为 0.5rem */
}

.work-card {
    background-color: var(--card-bg);
    padding: 0.5rem 0.8rem; /* 从 1rem 改为 0.5rem 0.8rem */
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
}

.profile-name {
    font-size: 1.4rem;      /* 从 1.75rem 改为 1.4rem */
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.profile-degree {
    font-size: 1rem;        /* 从 1.1rem 改为 1rem */
}
```

- [ ] **Step 3: 个人介绍超出省略**

在 Home.vue 的 `<style scoped>` 中给 biography 加高度限制：

```css
.biography {
    max-height: 100px;
    overflow: hidden;
}  /* 注：后端 HTML 内容不定，保守限制防止布局被撑破 */
```

---

## Task 2: 关于我侧边栏改为 sticky

**Files:**
- Modify: `client/src/views/About.vue` — 修改侧边栏和内容面板的 CSS

- [ ] **Step 1: 去掉侧边栏 position:fixed，改为 sticky**

```css
.sidebar {
  width: 220px;
  background: #1e293b;
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
  padding: 24px 0;
  border-radius: 12px;
  flex-shrink: 0;            /* 新增：防止被压缩 */
  position: sticky;          /* 从 fixed 改为 sticky */
  top: 80px;                 /* 导航栏高度 + 间距 */
  align-self: flex-start;    /* 配合 sticky */
  height: fit-content;       /* 高度由内容决定 */
  overflow-y: visible;       /* 去掉内部滚动 */
  /* 删除：position: fixed !important; top: 70px; left: 10px; right: 10px; bottom: 0; z-index: 999; overflow-y: auto; */
}
```

- [ ] **Step 2: 去掉内容面板的 margin-left 和 min-height**

```css
.content-panel {
  flex: 1;
  background: #1e293b;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
  color: #e2e8f0;
  box-sizing: border-box;
  /* 删除：margin-left: 220px; min-height: calc(100vh - 64px); */
}
```

---

## Task 3: 投资频道改为 sticky

**Files:**
- Modify: `client/src/views/invest/Invest.vue` — 和 About.vue 完全相同的 CSS 改动

- [ ] **Step 1: 侧边栏改为 sticky**

与 Task 2 Step 1 完全相同的 CSS 改动。

- [ ] **Step 2: 内容面板去掉 margin-left 和 min-height**

与 Task 2 Step 2 完全相同的 CSS 改动。
