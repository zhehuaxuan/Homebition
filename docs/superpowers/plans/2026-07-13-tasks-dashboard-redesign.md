# MyTasks Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/tasks` page (MyTasks.vue) into a data-dashboard style for desktop browser, replacing plain-text stats with indicator cards, adding monthly overview bar, and beautifying the FullCalendar timeline.

**Architecture:** Single-file Vue component refactor — template, script, and style all in `MyTasks.vue`. No new files, no backend changes, no new dependencies.

**Tech Stack:** Vue 3 (Composition API), Element Plus (icons/tags), FullCalendar v6 with resource-timeline plugin, CSS scoped styles.

## Global Constraints

- Desktop browser only (768px+). No mobile concerns for this pass.
- FullCalendar scheduler license key `CC-Attribution-NonCommercial-NoDerivatives` must remain.
- `resourceTimelineMonth` view stays as the only view.
- All data-fetching logic (`fetchData`) preserved as-is.
- All calendar event/resource computed properties preserved (only color map changes).

---

### Task 1: Top Stats Indicator Cards

**Files:**
- Modify: `client/src/views/MyTasks.vue` (template and style)

**Interfaces:**
- Consumes: `totalAll`, `totalDoing`, `totalWait`, `totalOverdue` refs (already exist)
- Produces: Replaces `<div class="stats-bar">...</div>` with 4 indicator cards

- [ ] **Step 1: Replace stats-bar in template**

Remove lines 3-17 (the `<div class="stats-bar">...</div>`) and replace with 4 indicator cards using Element Plus icons:

```vue
    <!-- 顶部指标卡片行 -->
    <div class="stat-cards">
      <div class="stat-card stat-card-total">
        <div class="stat-card-icon"><el-icon size="24"><List /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalAll }}</div>
          <div class="stat-card-label">全部任务</div>
        </div>
      </div>
      <div class="stat-card stat-card-doing">
        <div class="stat-card-icon"><el-icon size="24"><Loading /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalDoing }}</div>
          <div class="stat-card-label">进行中</div>
        </div>
      </div>
      <div class="stat-card stat-card-wait">
        <div class="stat-card-icon"><el-icon size="24"><Clock /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalWait }}</div>
          <div class="stat-card-label">待启动</div>
        </div>
      </div>
      <div class="stat-card stat-card-overdue">
        <div class="stat-card-icon"><el-icon size="24"><WarningFilled /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number stat-card-number-danger">{{ totalOverdue }}</div>
          <div class="stat-card-label">已超期</div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add icons import in script section**

Add `List, Loading, Clock, WarningFilled` to the import from `@element-plus/icons-vue` (line 25).

Find the existing import and modify:

```js
import { List, Loading, Clock, WarningFilled } from '@element-plus/icons-vue'
```

- [ ] **Step 3: Add stat card styles**

Add to the `<style scoped>` section:

```css
/* ===== 顶部指标卡片 ===== */
.stat-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  min-width: 0;
}

.stat-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-card-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #1e293b;
}

.stat-card-number-danger {
  color: #dc2626;
}

.stat-card-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.stat-card-total {
  background: #eef2ff;
}
.stat-card-total .stat-card-icon {
  background: #6366f1;
  color: #fff;
}

.stat-card-doing {
  background: #f0fdf4;
}
.stat-card-doing .stat-card-icon {
  background: #22c55e;
  color: #fff;
}

.stat-card-wait {
  background: #f8fafc;
}
.stat-card-wait .stat-card-icon {
  background: #94a3b8;
  color: #fff;
}

.stat-card-overdue {
  background: #fef2f2;
}
.stat-card-overdue .stat-card-icon {
  background: #ef4444;
  color: #fff;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/MyTasks.vue
git commit -m "feat: add stat indicator cards to tasks dashboard"
```

---

### Task 2: Monthly Overview Bar

**Files:**
- Modify: `client/src/views/MyTasks.vue` (template after stat-cards)

- [ ] **Step 1: Add monthly overview bar in template**

After the `stat-cards` div, add:

```vue
    <!-- 月度概览条 -->
    <div class="month-bar">
      <el-icon size="16"><Calendar /></el-icon>
      <span>本月共 <strong>{{ totalMonth }}</strong> 个任务</span>
      <span class="month-bar-sep">·</span>
      <span>进行中 <strong>{{ monthDoing }}</strong></span>
      <span class="month-bar-sep">·</span>
      <span>待启动 <strong>{{ monthWait }}</strong></span>
      <span class="month-bar-sep">·</span>
      <span>已完成 <strong>{{ monthDone }}</strong></span>
    </div>
```

- [ ] **Step 2: Add Calendar icon to import**

Update the import: `import { List, Loading, Clock, WarningFilled, Calendar } from '@element-plus/icons-vue'`

- [ ] **Step 3: Add month bar styles**

```css
/* ===== 月度概览条 ===== */
.month-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  margin-bottom: 16px;
}

.month-bar strong {
  font-weight: 600;
  color: #1e293b;
}

.month-bar-sep {
  color: #cbd5e1;
  margin: 0 2px;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/MyTasks.vue
git commit -m "feat: add monthly overview bar to tasks dashboard"
```

---

### Task 3: FullCalendar Container and Style Overhaul

**Files:**
- Modify: `client/src/views/MyTasks.vue` (FullCalendar wrapper container, event colors, global CSS overrides)

- [ ] **Step 1: Wrap FullCalendar in white card container**

In the template, wrap the `<FullCalendar :options="calendarOptions" />` line:

```vue
    <!-- 日历卡片容器 -->
    <div class="calendar-card">
      <FullCalendar :options="calendarOptions" />
    </div>
```

- [ ] **Step 2: Update event color mapping**

In the `events` computed property, update the `colorMap` to use richer, more distinguishable colors:

```js
const colorMap = {
  '普通': '#6b7280',
  '次要': '#3b82f6',
  '重要': '#ca8a04',
  '紧急': '#ea580c',
  '至关重要': '#dc2626'
}
```

Also add status prefix styling. Update the `title` generation line inside the event push to include an emoji status marker for visual scan:

```js
const statusEmoji = { 0: '📋', 1: '⚡', 2: '✅', 3: '⏸️' }
arr.push({
  resourceId: String(tagId),
  title: `${statusEmoji[task.status] || ''} ${task.title}`,
  start: dateFormatter(task.create_time),
  end: dateFormatter(task.close_time),
  color: colorMap[task.importance] || colorMap.普通,
})
```

Wait — emoji might look weird in calendar. Let me keep it cleaner. Use the existing `statusMap` prefix but without brackets, just a small colored dot indicator. Actually, let's keep it simple — just use clean text prefix but remove the brackets to save space:

```js
const statusMap = { 0: '待启动', 1: '进行中', 2: '已完成', 3: '挂起中' }
// In the push:
title: `${statusMap[task.status]} ${task.title}`,
```

So the final events code block becomes:

```js
const events = computed(() => {
  const arr = []
  taskList.value.forEach(task => {
    try {
      const tagIds = JSON.parse(task.tags || '[]')
      tagIds.forEach(tagId => {
        const statusMap = { 0: '待启动', 1: '进行中', 2: '已完成', 3: '挂起中' }
        const colorMap = {
          '普通': '#6b7280',
          '次要': '#3b82f6',
          '重要': '#ca8a04',
          '紧急': '#ea580c',
          '至关重要': '#dc2626'
        }
        arr.push({
          resourceId: String(tagId),
          title: `${statusMap[task.status]} ${task.title}`,
          start: dateFormatter(task.create_time),
          end: dateFormatter(task.close_time),
          color: colorMap[task.importance] || colorMap.普通,
        })
      })
    } catch {}
  })
  return arr
})
```

- [ ] **Step 3: Add calendar card + FullCalendar style overrides**

Replace the existing `<style>` block content with:

```css
/* ===== 日历卡片容器 ===== */
.calendar-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 16px;
}

/* ===== FullCalendar 样式覆盖 ===== */

/* 左上角标签信息表头 */
.fc-scrollgrid thead .fc-datagrid-cell-main {
  font-size: 0 !important;
}
.fc-scrollgrid thead .fc-datagrid-cell-main::before {
  content: "标签信息" !important;
  font-size: 14px !important;
  font-weight: 600;
  color: #1e293b;
}

/* 任务事件条 */
.fc-timeline-event {
  height: 36px !important;
  overflow: hidden !important;
  border-radius: 6px !important;
  margin: 2px 4px !important;
}

.fc-event-main {
  display: flex !important;
  align-items: center !important;
}

.fc-event-title {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: block !important;
  line-height: 32px !important;
  padding: 0 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

/* 今天列高亮 */
.fc-timeline-header .fc-day-today {
  background-color: #eff6ff !important;
}

.fc-timeline-header .fc-day-today .fc-datagrid-cell-main {
  font-weight: 700 !important;
}

.fc .fc-day-today {
  background-color: #f8fafc !important;
}

/* 标签列行高与事件条匹配 */
.fc-datagrid-cell.fc-resource {
  line-height: 40px !important;
  padding: 0 8px !important;
}

/* 去掉一些不必要的边框 */
.fc-scrollgrid {
  border: none !important;
}

.fc-scrollgrid td {
  border-color: #e2e8f0 !important;
}

/* 表头样式 */
.fc-col-header-cell {
  padding: 4px 0 !important;
}

.fc-col-header-cell-cushion {
  font-size: 13px !important;
  color: #475569 !important;
  font-weight: 500 !important;
}

/* 容器高度 */
.my-tasks-container {
  height: auto;
  min-height: 700px;
}

/* 顶部去除容器原有padding调整 */
.my-tasks-container {
  padding: 24px;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/views/MyTasks.vue
git commit -m "feat: overhaul FullCalendar styling for tasks dashboard"
```

---

### Task 4: Final Verification

**Files:**
- Test: `client/src/views/MyTasks.vue` (visual/functional check)

- [ ] **Step 1: Verify the page loads without errors**

Run the dev server and navigate to `http://localhost/tasks` (via nginx) or `http://localhost:5173/tasks`.

Check:
- [ ] 4 stat cards render with correct numbers
- [ ] Monthly bar shows correct data
- [ ] FullCalendar renders with white card container
- [ ] Task events have proper height (36px) and rounded corners
- [ ] Events use the new color scheme per importance level
- [ ] Today column is highlighted
- [ ] No console errors

- [ ] **Step 2: Commit final verification**

```bash
git add client/src/views/MyTasks.vue
git commit -m "style: final polish for tasks dashboard redesign"
```
