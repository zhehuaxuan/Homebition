# 工作流任务（Workflow Task）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone workflow task module allowing users to create tasks with a linear sequence of steps, provide progress feedback via a wizard-style interface, and complete tasks step-by-step until closure.

**Architecture:** Two new database tables `workflow_task` and `workflow_step` with a new Express route (`/api/workflow-tasks`). Frontend adds four new pages: list, create/edit, progress wizard, and detail view. Navigation entry added to About.vue (admin menu).

**Tech Stack:** Express.js + MySQL (raw queries), Vue 3 + Element Plus, no new dependencies.

## Global Constraints

- Use `req.db.query()` with raw SQL (existing project pattern)
- Follow dark theme: cards `#1e293b`, border `#334155`, primary text `#e2e8f0`, secondary `#cbd5e1`, muted `#64748b`
- Route prefix: `/api` (existing pattern)
- Mobile-responsive: all new pages must include `@media (max-width: 768px)` styles
- All API responses follow `{ code: 0, data: ... }` success / `{ code: 500, message: ... }` error pattern
- New module is completely independent from existing `task` / `taskdetail` tables

---

### Task 1: Database migration + Server route

**Files:**
- Create: `server/migrations/006_add_workflow_task.sql`
- Create: `server/routes/workflowTask.js`
- Modify: `server/index.js` (register route)

**Interfaces:**
- Consumes: MySQL pool via `req.db.query()`
- Produces: 8 API endpoints under `/api/workflow-tasks`

- [ ] **Step 1: Create migration SQL**

Write `server/migrations/006_add_workflow_task.sql`:
```sql
-- 工作流任务模块
-- 创建时间：2026-07-25

CREATE TABLE IF NOT EXISTS workflow_task (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(255) NOT NULL COMMENT '任务标题',
    description      TEXT COMMENT '任务描述',
    status           TINYINT NOT NULL DEFAULT 0 COMMENT '0=待启动 1=进行中 2=已完成',
    current_step_order INT NOT NULL DEFAULT 0 COMMENT '当前步骤序号(1开始,0未启动)',
    total_steps      INT NOT NULL DEFAULT 0 COMMENT '总步骤数',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    finished_at      DATETIME DEFAULT NULL COMMENT '任务完成时间',
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS workflow_step (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    task_id          INT NOT NULL COMMENT '关联工作流任务ID',
    step_order       INT NOT NULL COMMENT '步骤序号(1,2,3...)',
    name             VARCHAR(255) NOT NULL COMMENT '节点名称',
    guide            TEXT COMMENT '操作说明',
    estimated_duration VARCHAR(100) COMMENT '预计耗时',
    progress         TEXT COMMENT '步骤进展反馈文本',
    status           TINYINT NOT NULL DEFAULT 0 COMMENT '0=待开始 1=进行中 2=已完成',
    finished_at      DATETIME DEFAULT NULL COMMENT '步骤完成时间',
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_step_order (task_id, step_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Create the route file**

Write `server/routes/workflowTask.js` implementing:

1. `GET /api/workflow-tasks` — List all workflow tasks (with step summary count per status)
2. `GET /api/workflow-tasks/:id` — Task detail with all steps ordered by step_order
3. `POST /api/workflow-tasks` — Create task + steps (transaction: insert task, then insert each step with step_order)
4. `PUT /api/workflow-tasks/:id` — Update task title/description (only when status=0)
5. `DELETE /api/workflow-tasks/:id` — Delete task and cascade delete its steps
6. `POST /api/workflow-tasks/:id/start` — Start task (set status=1, current_step_order=1, first step status=1)
7. `POST /api/workflow-tasks/:id/step/:stepId/complete` — Complete a step (set progress text, status=2, finished_at; if not last step, advance to next; if last step, set task status=2 and finished_at)
8. `GET /api/workflow-tasks/:id/current-step` — Get current pending step info

Each endpoint must include `logger.error()` for error handling and proper HTTP status codes.

- [ ] **Step 3: Register route in server/index.js**

After other route registrations, add:
```javascript
const workflowTaskRouter = require('./routes/workflowTask');
app.use('/api', workflowTaskRouter);
```

- [ ] **Step 4: Run migration manually**

Run the SQL migration against the database.

- [ ] **Step 5: Test API endpoints**

Test with curl:
```bash
# Create task with steps
curl -X POST http://localhost:3000/api/workflow-tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"烧鱼","description":"做一道红烧鱼","steps":[{"name":"杀鱼","guide":"去鳞去内脏洗净","estimated_duration":"10分钟"},{"name":"起锅烧油","guide":"大火烧油至七成热","estimated_duration":"5分钟"},{"name":"翻炒","guide":"翻炒至两面金黄","estimated_duration":"15分钟"}]}'

# List
curl http://localhost:3000/api/workflow-tasks

# Start
curl -X POST http://localhost:3000/api/workflow-tasks/1/start

# Complete step
curl -X POST http://localhost:3000/api/workflow-tasks/1/step/1/complete \
  -H "Content-Type: application/json" \
  -d '{"progress":"鱼已杀好洗净"}'
```

- [ ] **Step 6: Commit**

```bash
git add server/migrations/006_add_workflow_task.sql server/routes/workflowTask.js server/index.js
git commit -m "feat: add workflow task backend API"
```

---

### Task 2: Router config + About.vue menu entry

**Files:**
- Modify: `client/src/router/index.js` (add workflow task routes)
- Modify: `client/src/views/About.vue` (add menu item)

- [ ] **Step 1: Add routes to router/index.js**

In the `/about` children array, add before `flash-ideas` route:
```javascript
      }, {
        path: 'workflow-tasks',
        name: 'WorkflowTaskList',
        component: () => import('../views/about/WorkflowTaskList.vue')
      }, {
        path: 'workflow-tasks/create',
        name: 'WorkflowTaskCreate',
        component: () => import('../views/about/WorkflowTaskForm.vue')
      }, {
        path: 'workflow-tasks/:id',
        name: 'WorkflowTaskDetail',
        component: () => import('../views/about/WorkflowTaskDetail.vue')
      }, {
        path: 'workflow-tasks/:id/edit',
        name: 'WorkflowTaskEdit',
        component: () => import('../views/about/WorkflowTaskForm.vue')
      }, {
        path: 'workflow-tasks/:id/progress',
        name: 'WorkflowTaskProgress',
        component: () => import('../views/about/WorkflowTaskProgress.vue')
      }, {
```

- [ ] **Step 2: Add menu item to About.vue**

In the `tasks` group children array, add as first child before "闪念管理":
```javascript
children: [
  { to: '/about/workflow-tasks', label: '工作流任务', icon: '📋' },
  { to: '/about/flash-ideas', label: '闪念管理', icon: '💡' },
  { to: '/about/task-list', label: '任务清单', icon: '📋' },
```

Also add mobile tab label:
```javascript
const tabLabels = {
  '/about/workflow-tasks': '工作流',
  // ...existing entries
```

- [ ] **Step 3: Commit**

```bash
git add client/src/router/index.js client/src/views/About.vue
git commit -m "feat: add workflow task routes and menu entry"
```

---

### Task 3: WorkflowTaskList.vue — 工作流任务列表页

**File:**
- Create: `client/src/views/about/WorkflowTaskList.vue`

**Features:**
- Page header with title and "新建工作流" button
- Status filter tabs: 全部 / 待启动 / 进行中 / 已完成
- Search input for title search
- Card list (each card shows):
  - Task title
  - Step progress indicator: "3/5 步骤"
  - Status tag with color (待启动/gray, 进行中/blue, 已完成/green)
  - Created time
  - Actions: 详情, 编辑(仅待启动), 删除(带确认), 启动(仅待启动), 反馈进展(仅进行中)
- Empty state: "暂无工作流任务"
- Loading state
- Mobile responsive

```vue
<template>
  <div class="workflow-list-page">
    <div class="page-header">
      <h2 class="page-title">工作流任务</h2>
      <el-button type="primary" @click="$router.push('/about/workflow-tasks/create')">新建工作流</el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" @change="fetchList">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button :value="0">待启动</el-radio-button>
        <el-radio-button :value="1">进行中</el-radio-button>
        <el-radio-button :value="2">已完成</el-radio-button>
      </el-radio-group>
      <el-input v-model="searchKeyword" placeholder="搜索任务标题" clearable class="search-input" @input="fetchList" />
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="loading-text">加载中...</div>
    <div v-else-if="list.length === 0" class="empty-text">暂无工作流任务</div>
    <div v-else class="task-card-list">
      <div v-for="task in list" :key="task.id" class="task-card">
        <div class="card-top">
          <span class="card-title">{{ task.title }}</span>
          <el-tag :type="statusTagType(task.status)" size="small">
            {{ statusLabel(task.status) }}
          </el-tag>
        </div>
        <div class="card-progress">
          <span class="step-text">{{ task.current_step_order }}/{{ task.total_steps }} 步骤</span>
        </div>
        <div class="card-footer">
          <span class="card-time">{{ formatTime(task.created_at) }}</span>
          <div class="card-actions">
            <el-button size="small" text @click="$router.push(`/about/workflow-tasks/${task.id}`)">详情</el-button>
            <el-button v-if="task.status === 0" size="small" text @click="handleStart(task.id)">启动</el-button>
            <el-button v-if="task.status === 0" size="small" text @click="$router.push(`/about/workflow-tasks/${task.id}/edit`)">编辑</el-button>
            <el-button v-if="task.status === 1" size="small" type="primary" @click="$router.push(`/about/workflow-tasks/${task.id}/progress`)">反馈进展</el-button>
            <el-popconfirm title="确定删除此任务？" @confirm="handleDelete(task.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const list = ref([])
const loading = ref(true)
const statusFilter = ref('')
const searchKeyword = ref('')

const statusTagType = (s) => {
  if (s === 0) return 'info'
  if (s === 1) return 'primary'
  return 'success'
}
const statusLabel = (s) => ['待启动', '进行中', '已完成'][s] || '未知'

const fetchList = async () => {
  loading.value = true
  try {
    const params = {}
    if (statusFilter.value !== '') params.status = statusFilter.value
    if (searchKeyword.value) params.keyword = searchKeyword.value
    const { data } = await axios.get('/api/workflow-tasks', { params })
    if (data.code === 0) list.value = data.data
  } catch (err) {
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

const handleStart = async (id) => {
  try {
    const { data } = await axios.post(`/api/workflow-tasks/${id}/start`)
    if (data.code === 0) {
      ElMessage.success('任务已启动')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('启动失败')
  }
}

const handleDelete = async (id) => {
  try {
    const { data } = await axios.delete(`/api/workflow-tasks/${id}`)
    if (data.code === 0) {
      ElMessage.success('删除成功')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

onMounted(fetchList)
</script>

<style scoped>
.workflow-list-page { padding: 20px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #e2e8f0; }
.filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.search-input { width: 240px; }
.loading-text, .empty-text { text-align: center; padding: 60px 20px; color: #64748b; font-size: 14px; }
.task-card-list { display: flex; flex-direction: column; gap: 12px; }
.task-card {
  background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px;
  transition: border-color 0.2s;
}
.task-card:hover { border-color: #475569; }
.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.card-title { font-size: 16px; font-weight: 500; color: #e2e8f0; flex: 1; margin-right: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-progress { margin-bottom: 12px; }
.step-text { font-size: 13px; color: #64748b; }
.card-footer { display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #334155; }
.card-time { font-size: 12px; color: #64748b; }
.card-actions { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }

@media (max-width: 768px) {
  .workflow-list-page { padding: 12px; }
  .filter-bar { flex-direction: column; align-items: stretch; }
  .search-input { width: 100%; }
  .task-card { padding: 12px; }
  .card-footer { flex-direction: column; gap: 8px; align-items: stretch; }
  .card-actions { justify-content: flex-start; }
}
</style>
```

- [ ] **Step 1: Implement WorkflowTaskList.vue** as specified above
- [ ] **Step 2: Commit**

```bash
git add client/src/views/about/WorkflowTaskList.vue
git commit -m "feat: add workflow task list page"
```

---

### Task 4: WorkflowTaskForm.vue — 任务创建/编辑页

**File:**
- Create: `client/src/views/about/WorkflowTaskForm.vue`

**Features:**
- Reused for both create and edit (detect by route: `:id` param present = edit mode)
- Create mode: empty form, title input, description textarea
- Edit mode: load existing task data (only status=0 allowed)
- Steps management:
  - List of step cards, each with: name input, guide textarea, estimated_duration input
  - "添加步骤" button appends new step card
  - Each step card has a delete button (if more than 1 step)
  - Up/down arrow buttons to reorder steps
  - Validation: step name required
- Submit: POST for create, PUT for edit
- Cancel button returns to list
- Loading state, validation errors, submit errors

**Key behaviors:**
- On create: POST `/api/workflow-tasks` with title + description + steps array
- On edit (status=0): PUT `/api/workflow-tasks/:id` with title + description; steps can be modified via separate API or reloaded

(Due to the complexity of step editing, the create flow sends all steps in one POST. For edit mode, re-fetch and re-submit the full step list.)

- [ ] **Step 1: Implement WorkflowTaskForm.vue**
- [ ] **Step 2: Commit**

```bash
git add client/src/views/about/WorkflowTaskForm.vue
git commit -m "feat: add workflow task create/edit form page"
```

---

### Task 5: WorkflowTaskDetail.vue — 任务详情页

**File:**
- Create: `client/src/views/about/WorkflowTaskDetail.vue`

**Features:**
- Load task by `:id`, show all info
- Top section: title, description, status tag, created/updated/finished time
- Step timeline/list:
  - Each step displayed as a card
  - Shows: step_order, name, guide, estimated_duration
  - Status indicator icon: ⏳待开始 / 🔄进行中 / ✅已完成
  - If completed: show progress feedback text and finished_at
- Action buttons at bottom:
  - 编辑 (only if status=0)
  - 启动 (only if status=0)
  - 反馈进展 (only if status=1, navigating to progress wizard)
  - 删除 (with confirmation)
  - 返回列表
- Loading state, not-found state

- [ ] **Step 1: Implement WorkflowTaskDetail.vue**
- [ ] **Step 2: Commit**

```bash
git add client/src/views/about/WorkflowTaskDetail.vue
git commit -m "feat: add workflow task detail page"
```

---

### Task 6: WorkflowTaskProgress.vue — 向导式进展反馈页

**File:**
- Create: `client/src/views/about/WorkflowTaskProgress.vue`

**Features:**
- Load task with all steps
- Top progress stepper: visual step indicator showing completed / current / pending steps
  - Use Element Plus el-steps component with process status
- Main content area for current step:
  - Step name (large heading)
  - Guide text (how-to instructions)
  - Estimated duration display
  - Progress textarea：填写该步骤的进展反馈
  - Button: "完成本步骤" (disabled if no text entered)
- On step complete:
  - Call POST `/api/workflow-tasks/:id/step/:stepId/complete`
  - If success, advance to next step (refresh data)
  - If it was the last step: show success dialog "所有步骤已完成！任务已闭环"
- Edge cases:
  - If all steps completed: show congratulations view instead of wizard
  - If task status is 0 (not started): show message and button to start first
  - If task status is 2 (completed): redirect to detail page
- Back button returns to detail page
- Loading state

- [ ] **Step 1: Implement WorkflowTaskProgress.vue**
- [ ] **Step 2: Commit**

```bash
git add client/src/views/about/WorkflowTaskProgress.vue
git commit -m "feat: add workflow task progress wizard page"
```

---

### Task 7: Mobile adaptation verification

**Files:** (verify only)
- `client/src/views/about/WorkflowTaskList.vue`
- `client/src/views/about/WorkflowTaskForm.vue`
- `client/src/views/about/WorkflowTaskDetail.vue`
- `client/src/views/about/WorkflowTaskProgress.vue`

- [ ] **Step 1: Manual verification checklist**

1. Open the app on a < 768px viewport
2. Verify About.vue menu shows "工作流任务" entry
3. Verify mobile tab label shows "工作流"
4. Navigate to `/about/workflow-tasks`:
   - Card layout renders correctly
   - Status filter tabs wrap properly
   - Search input full width
   - Action buttons accessible on touch
5. Create a new workflow task with 3 steps on mobile:
   - Form inputs usable
   - Step cards stack vertically
   - Add/remove step buttons tappable
6. Start the task, go to progress wizard:
   - Progress stepper readable on small screen
   - Textarea usable
   - Complete button tappable
7. View task detail page:
   - Step timeline readable
   - Action buttons accessible

- [ ] **Step 2: Fix any mobile issues found and commit**

```bash
git add -A
git commit -m "fix: mobile adaptation adjustments for workflow task"
```
