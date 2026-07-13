# [REQ-019] 首页/关于我/投资频道 布局优化

**提出日期**: 2026-07-14
**状态**: 已实现
**已同步**: 2026-07-14
**关联需求**: 无

## 1. 原始需求

首页、关于我、投资频道页面内容超出视口高度，出现 scroll-y，需要优化布局使一屏内可全部展示。

## 2. 验收标准

- [ ] 首页头像缩小，间距压缩，友情链接紧凑，1280×720 下一屏可见
- [ ] 关于我侧边栏改为 sticky 布局，消除独立滚动
- [ ] 投资频道侧边栏改为 sticky 布局，消除独立滚动
- [ ] 桌面端所有改动，手机端响应式不受影响

## 3. 设计方案

### 3.1 首页 (Home.vue)

**CSS 改动 (`index.css` 中的 `.container` 等类)**：

| 当前 | 改为 |
|------|------|
| 头像 `width: 200px` | `width: 120px` |
| `.container` gap `3rem` | `gap: 1.5rem` |
| `.info-grid` gap `2rem` | `gap: 1rem` |
| `.work-section` padding `2rem` | `padding: 1rem 2rem` |
| `.work-grid` gap `1rem` | `gap: 0.5rem` |
| 友情链接卡片(work-card) padding `1rem` | `padding: 0.6rem 0.8rem` |
| biography 个人介绍: 全文显示 | 最多 3 行，超出省略 |

### 3.2 关于我 (About.vue)

**侧边栏布局重构**：

```
改动前: sidebar position:fixed, content-panel margin-left:220px + min-height
        → 侧边栏和内容区各自独立滚动，出现双层 scroll-y

改动后: about-layout display:flex
        sidebar position:sticky + top:70px + align-self:flex-start
        content-panel flex:1 + margin-left:0 + min-height:auto
        → 两栏共用一个滚动容器，由 body 自然滚动
```

**具体 CSS 改动**：

| 当前 | 改为 |
|------|------|
| `.sidebar` 中 `position: fixed !important; top: 70px; left: 10px; right: 10px; bottom: 0;` | 去掉 left/right/bottom，改为 `position: sticky; top: 80px; align-self: flex-start; flex-shrink: 0` |
| `.content-panel` 中 `margin-left: 220px; min-height: calc(100vh - 64px)` | `margin-left: 0; min-height: auto` |

### 3.3 投资频道 (Invest.vue)

与 About.vue 完全相同的改动模式。

### 3.4 手机端保持现状

移动端(<768px)的标签栏和卡片布局保持不变，不受桌面端 sticky 改动影响。

## 4. 实现计划

### Step 1: 首页压缩
- 修改头像大小、间距、边距
- 友情链接卡片缩小
- 个人介绍超出省略

### Step 2: 关于我 + 投资频道侧边栏重构
- 改为 sticky 定位，去掉 fixed
- 内容面板去掉 margin-left 和 min-height
- 确保桌面端 / 手机端各自正常

## 5. 变更清单

_（实现后填充）_
