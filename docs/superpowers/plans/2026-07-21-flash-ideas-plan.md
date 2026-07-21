# 闪念（Flash Idea）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight flash idea system allowing users to quickly capture thoughts on the homepage, manage them in the admin panel, and track their status lifecycle (sapling → tree → forest) by associating with tasks.

**Architecture:** New database table `flash_ideas` with a new Express route (`/api/flash-ideas`). Frontend adds a FlashInput component (shared between Home.vue and new FlashIdeas.vue page), with a FlashList component for the management view. Navigation entries added to Index.vue (homepage quick entry) and About.vue (admin menu).

**Tech Stack:** Express.js + MySQL (raw queries), Vue 3 + Element Plus, no new dependencies.

## Global Constraints

- Use `req.db.query()` with raw SQL (existing project pattern)
- Follow dark theme: cards `#1e293b`, border `#334155`, primary text `#e2e8f0`, secondary `#cbd5e1`, muted `#64748b`
- Route prefix: `/api` (existing pattern)
- Mobile-responsive: all new pages must include `@media (max-width: 768px)` styles
- Status ENUM values: `sapling`, `tree`, `forest`
- All API responses follow `{ code: 0, data: ... }` success / `{ code: 500, message: ... }` error pattern

---

### Task 1: Database migration + Server route

**Files:**
- Create: `server/migrations/005_add_flash_ideas.sql`
- Create: `server/routes/flashIdeas.js`
- Modify: `server/index.js` (add route after line 76)

**Interfaces:**
- Consumes: MySQL pool via `req.db.query()`, existing `task` table for JOIN
- Produces: `GET /api/flash-ideas`, `POST /api/flash-ideas`, `PUT /api/flash-ideas/:id`, `DELETE /api/flash-ideas/:id`

- [ ] **Step 1: Create migration SQL**

Write `server/migrations/005_add_flash_ideas.sql`:
```sql
-- 闪念功能
-- 创建时间：2026-07-21

CREATE TABLE IF NOT EXISTS flash_ideas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    content     TEXT NOT NULL,
    status      ENUM('sapling','tree','forest') NOT NULL DEFAULT 'sapling',
    task_id     INT DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Create the route file**

Write `server/routes/flashIdeas.js`:
```javascript
const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// GET /api/flash-ideas — 获取闪念列表（按创建时间倒序，状态自动检测 forest）
router.get('/flash-ideas', async (req, res) => {
    try {
        const [rows] = await req.db.query(`
            SELECT f.id, f.content, f.status, f.task_id, f.created_at, f.updated_at,
                   t.title AS task_title, t.status AS task_status
            FROM flash_ideas f
            LEFT JOIN task t ON f.task_id = t.id
            ORDER BY f.created_at DESC
        `);
        // 自动检测：如果关联的任务已完成，状态升为 forest
        const updated = rows.map(row => {
            if (row.task_id && row.task_status === 1 && row.status !== 'forest') {
                // 异步更新数据库（不阻塞返回）
                req.db.query('UPDATE flash_ideas SET status = ? WHERE id = ?', ['forest', row.id]);
                return { ...row, status: 'forest' };
            }
            return row;
        });
        res.json({ code: 0, data: updated });
    } catch (err) {
        logger.error('[flashIdeas] 查询列表失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// POST /api/flash-ideas — 新建闪念（仅 content）
router.post('/flash-ideas', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ code: 400, message: '内容不能为空' });
        }
        const [result] = await req.db.query(
            'INSERT INTO flash_ideas (content) VALUES (?)',
            [content.trim()]
        );
        const [rows] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [result.insertId]);
        res.json({ code: 0, data: rows[0] });
    } catch (err) {
        logger.error('[flashIdeas] 创建失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// PUT /api/flash-ideas/:id — 更新闪念（content 或 task_id）
router.put('/flash-ideas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, task_id } = req.body;

        // 如果关联 task_id，自动升为 tree
        let newStatus = undefined;
        if (task_id) {
            newStatus = 'tree';
        }

        const [existing] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ code: 404, message: '闪念不存在' });
        }

        const updates = [];
        const params = [];
        if (content !== undefined) {
            updates.push('content = ?');
            params.push(content);
        }
        if (task_id !== undefined) {
            updates.push('task_id = ?');
            params.push(task_id || null);
        }
        if (newStatus) {
            updates.push('status = ?');
            params.push(newStatus);
        }
        if (updates.length === 0) {
            return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
        }

        params.push(id);
        await req.db.query(`UPDATE flash_ideas SET ${updates.join(', ')} WHERE id = ?`, params);

        const [rows] = await req.db.query('SELECT * FROM flash_ideas WHERE id = ?', [id]);
        res.json({ code: 0, data: rows[0] });
    } catch (err) {
        logger.error('[flashIdeas] 更新失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

// DELETE /api/flash-ideas/:id — 删除闪念
router.delete('/flash-ideas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await req.db.query('SELECT id FROM flash_ideas WHERE id = ?', [id]);
        if (!existing.length) {
            return res.status(404).json({ code: 404, message: '闪念不存在' });
        }
        await req.db.query('DELETE FROM flash_ideas WHERE id = ?', [id]);
        res.json({ code: 0, message: '删除成功' });
    } catch (err) {
        logger.error('[flashIdeas] 删除失败', { error: err.message });
        res.status(500).json({ code: 500, message: err.message });
    }
});

module.exports = router;
```

- [ ] **Step 3: Register route in server/index.js**

After line 76 (`app.use('/api', dashboardRouter);`), add:
```javascript
const flashIdeasRouter = require('./routes/flashIdeas');
app.use('/api', flashIdeasRouter);
```

- [ ] **Step 4: Run migration manually**

Run the SQL migration against the database to create the table.

- [ ] **Step 5: Test the API endpoints**

Test with curl or the running app:
```bash
# Create
curl -X POST http://localhost:3000/api/flash-ideas -H "Content-Type: application/json" -d '{"content":"测试闪念"}'
# List
curl http://localhost:3000/api/flash-ideas
# Update (associate task)
curl -X PUT http://localhost:3000/api/flash-ideas/1 -H "Content-Type: application/json" -d '{"task_id":1}'
# Delete
curl -X DELETE http://localhost:3000/api/flash-ideas/1
```

- [ ] **Step 6: Commit**

```bash
git add server/migrations/005_add_flash_ideas.sql server/routes/flashIdeas.js server/index.js
git commit -m "feat: add flash ideas backend API"
```

---

### Task 2: Router config + About.vue menu + Index.vue nav

**Files:**
- Modify: `client/src/router/index.js` (add flash-ideas route in /about children)
- Modify: `client/src/views/About.vue` (add "闪念管理" menu item + mobile tab label)
- Modify: `client/src/Index.vue` (add "闪念" nav entry after "我的文章")

**Interfaces:**
- Consumes: FlashIdeas.vue component (created in Task 3)
- Produces: navigable route `/about/flash-ideas`, clickable nav/menu entries

- [ ] **Step 1: Add route to router/index.js**

In the `/about` children array, before the `subscription-list` entry (around line 57), add:
```javascript
      }, {
        path: 'flash-ideas',
        name: 'FlashIdeas',
        component: () => import('../views/about/FlashIdeas.vue')
      },{
```

- [ ] **Step 2: Add menu item to About.vue**

In the `tasks` group children array, add as the first child before "任务清单":
```javascript
children: [
  { to: '/about/flash-ideas', label: '闪念管理', icon: '💡' },
  { to: '/about/task-list', label: '任务清单', icon: '📋' },
```

Also add the mobile tab label in `tabLabels`:
```javascript
const tabLabels = {
  '/about/flash-ideas': '闪念',
  // ...existing entries
```

- [ ] **Step 3: Add nav entry to Index.vue**

In the `nav-links` `<ul>`, after "我的文章" `<li>`:
```html
<li><router-link to="/about/flash-ideas" @click="closeMenu">闪念</router-link></li>
```

In `mobileLinks` computed, after `{ path: '/articles', ... }`:
```javascript
{ path: '/about/flash-ideas', label: '闪念', icon: '💡' },
```

Both entries should be inside `if (authStore.isLoggedIn())` block.

- [ ] **Step 4: Commit**

```bash
git add client/src/router/index.js client/src/views/About.vue client/src/Index.vue
git commit -m "feat: add flash ideas route, nav and menu entries"
```

---

### Task 3: FlashInput shared component

**Files:**
- Create: `client/src/components/FlashInput.vue`
- Modify: `client/src/views/Home.vue` (integrate FlashInput + recent flashes)

**Interfaces:**
- Consumes: `POST /api/flash-ideas`
- Produces: emits `saved` event when a flash is successfully created

- [ ] **Step 1: Create FlashInput.vue component**

```vue
<template>
  <div class="flash-input-card">
    <div class="flash-header">
      <span class="flash-title">💡 闪念</span>
    </div>
    <el-input
      v-model="content"
      type="textarea"
      :rows="isFocused ? 4 : 2"
      :placeholder="placeholder"
      class="flash-textarea"
      @focus="isFocused = true"
      @keydown="handleKeydown"
    />
    <div class="flash-footer">
      <span class="flash-hint">Ctrl+Enter 发送，Enter 换行</span>
      <el-button type="primary" :loading="saving" @click="submit">
        记录闪念
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const emit = defineEmits(['saved'])
const props = defineProps({
  placeholder: { type: String, default: '此刻闪过什么念头？写下它...' }
})

const content = ref('')
const isFocused = ref(false)
const saving = ref(false)

const handleKeydown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    submit()
  }
}

const submit = async () => {
  const text = content.value.trim()
  if (!text) {
    ElMessage.warning('请输入内容')
    return
  }
  saving.value = true
  try {
    const { data } = await axios.post('/api/flash-ideas', { content: text })
    if (data.code === 0) {
      ElMessage.success('闪念已记录')
      content.value = ''
      isFocused.value = false
      emit('saved', data.data)
    }
  } catch (err) {
    ElMessage.error('记录失败: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.flash-input-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}
.flash-header {
  margin-bottom: 16px;
}
.flash-title {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
}
.flash-textarea {
  margin-bottom: 12px;
}
.flash-textarea :deep(.el-textarea__inner) {
  background: #0f172a;
  border: 1px solid #334155;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 8px;
  transition: border-color 0.2s;
}
.flash-textarea :deep(.el-textarea__inner:focus) {
  border-color: #409eff;
}
.flash-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flash-hint {
  font-size: 12px;
  color: #64748b;
}
@media (max-width: 768px) {
  .flash-input-card {
    padding: 16px;
    border-radius: 8px;
  }
  .flash-footer {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  .flash-hint {
    text-align: center;
  }
}
</style>
```

- [ ] **Step 2: Integrate into Home.vue**

In Home.vue's template, after the `.work-section` div (or in the `.content-section` area), add:
```html
<FlashInput @saved="onFlashSaved" />
<div v-if="recentFlashes.length" class="recent-flashes">
  <div class="recent-header">
    <span class="recent-title">最近闪念</span>
    <router-link to="/about/flash-ideas" class="recent-more">查看全部 →</router-link>
  </div>
  <div v-for="flash in recentFlashes" :key="flash.id" class="recent-item">
    <span class="recent-text">{{ truncate(flash.content, 50) }}</span>
    <span class="recent-time">{{ formatTime(flash.created_at) }}</span>
  </div>
</div>
```

In the `<script setup>`, import FlashInput and add data:
```javascript
import FlashInput from '../components/FlashInput.vue'

const recentFlashes = ref([])

const fetchRecentFlashes = async () => {
  try {
    const { data } = await axios.get('/api/flash-ideas')
    if (data.code === 0) {
      recentFlashes.value = data.data.slice(0, 3)
    }
  } catch (e) { /* ignore */ }
}

const onFlashSaved = (newFlash) => {
  recentFlashes.value.unshift(newFlash)
  if (recentFlashes.value.length > 3) recentFlashes.value.pop()
}

const formatTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth()+1}/${d.getDate()}`
}

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

onMounted(() => {
  fetchProfile()
  fetchRecentFlashes()
})
```

Add CSS:
```css
.recent-flashes {
  margin-top: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 14px 16px;
}
.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.recent-title {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}
.recent-more {
  font-size: 12px;
  color: #409eff;
  text-decoration: none;
}
.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #334155;
}
.recent-item:last-child {
  border-bottom: none;
}
.recent-text {
  font-size: 13px;
  color: #cbd5e1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
}
.recent-time {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
}
@media (max-width: 768px) {
  .recent-flashes {
    padding: 12px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/FlashInput.vue client/src/views/Home.vue
git commit -m "feat: add FlashInput component and integrate into homepage"
```

---

### Task 4: FlashIdeas management page

**Files:**
- Create: `client/src/views/about/FlashIdeas.vue`

**Interfaces:**
- Consumes: `GET /api/flash-ideas`, `POST /api/flash-ideas`, `PUT /api/flash-ideas/:id`, `DELETE /api/flash-ideas/:id`, `GET /api/tasks`
- Produces: Full management UI with list, create, edit, associate-task, delete

- [ ] **Step 1: Create FlashIdeas.vue management page**

This page has:
1. A FlashInput at the top for quick capture
2. A card list of all flash ideas
3. Each card shows: content, time, status tag, associated task name (if any)
4. Actions per card: edit content (inline), associate task (dialog), delete

```vue
<template>
  <div class="flash-page">
    <div class="page-header">
      <h2 class="page-title">闪念管理</h2>
    </div>

    <!-- 快速录入 -->
    <FlashInput @saved="onFlashSaved" />

    <!-- 闪念列表 -->
    <div v-if="loading" class="loading-text">加载中...</div>
    <div v-else-if="list.length === 0" class="empty-text">暂无闪念记录</div>
    <div v-else class="flash-list">
      <div v-for="item in list" :key="item.id" class="flash-card">
        <div class="flash-card-header">
          <span class="flash-card-status" :class="'status-' + item.status">
            {{ statusLabels[item.status] || item.status }}
          </span>
          <span class="flash-card-time">{{ formatTime(item.created_at) }}</span>
        </div>

        <!-- 查看模式 -->
        <div v-if="editingId !== item.id" class="flash-card-body">
          <p class="flash-card-content">{{ item.content }}</p>
          <div v-if="item.task_id" class="flash-card-task">
            关联任务：<el-tag size="small" type="info">{{ item.task_title || '已删除' }}</el-tag>
          </div>
        </div>

        <!-- 编辑模式 -->
        <div v-else class="flash-card-edit">
          <el-input v-model="editContent" type="textarea" :rows="3" />
        </div>

        <div class="flash-card-actions">
          <template v-if="editingId === item.id">
            <el-button size="small" type="primary" @click="saveEdit(item)">保存</el-button>
            <el-button size="small" @click="editingId = null">取消</el-button>
          </template>
          <template v-else>
            <el-button size="small" text @click="startEdit(item)">编辑</el-button>
            <el-button size="small" text @click="openTaskDialog(item)">关联任务</el-button>
            <el-popconfirm title="确定删除此闪念？" @confirm="handleDelete(item.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </div>
      </div>
    </div>

    <!-- 关联任务弹窗 -->
    <el-dialog v-model="taskDialogVisible" title="关联任务" width="400px">
      <el-select
        v-model="selectedTaskId"
        filterable
        remote
        :remote-method="searchTasks"
        :loading="taskSearchLoading"
        placeholder="搜索并选择任务"
        style="width: 100%"
      >
        <el-option
          v-for="t in taskOptions"
          :key="t.id"
          :label="t.title"
          :value="t.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTaskAssociation" :loading="associating">确认关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import FlashInput from '../../components/FlashInput.vue'

const list = ref([])
const loading = ref(true)

const statusLabels = {
  sapling: '🌱 小树苗',
  tree: '🌳 大树',
  forest: '🌲 森林'
}

const editingId = ref(null)
const editContent = ref('')

// 关联任务弹窗
const taskDialogVisible = ref(false)
const selectedTaskId = ref(null)
const associating = ref(false)
const taskOptions = ref([])
const taskSearchLoading = ref(false)
let associatingIdeaId = null

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await axios.get('/api/flash-ideas')
    if (data.code === 0) {
      list.value = data.data
    }
  } catch (err) {
    ElMessage.error('获取闪念列表失败')
  } finally {
    loading.value = false
  }
}

const onFlashSaved = () => {
  fetchList()
}

const startEdit = (item) => {
  editingId.value = item.id
  editContent.value = item.content
}

const saveEdit = async (item) => {
  if (!editContent.value.trim()) {
    ElMessage.warning('内容不能为空')
    return
  }
  try {
    const { data } = await axios.put(`/api/flash-ideas/${item.id}`, { content: editContent.value })
    if (data.code === 0) {
      ElMessage.success('更新成功')
      editingId.value = null
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('更新失败')
  }
}

const openTaskDialog = (item) => {
  associatingIdeaId = item.id
  selectedTaskId.value = item.task_id || null
  // 加载全部任务作为初始选项
  searchTasks('')
  taskDialogVisible.value = true
}

const searchTasks = async (query) => {
  taskSearchLoading.value = true
  try {
    const { data } = await axios.get('/api/tasks')
    if (data.code === 0) {
      const all = data.data || []
      taskOptions.value = query
        ? all.filter(t => t.title && t.title.includes(query))
        : all.slice(0, 50)
    }
  } catch (e) {
    taskOptions.value = []
  } finally {
    taskSearchLoading.value = false
  }
}

const confirmTaskAssociation = async () => {
  if (!associatingIdeaId) return
  associating.value = true
  try {
    const { data } = await axios.put(`/api/flash-ideas/${associatingIdeaId}`, { task_id: selectedTaskId })
    if (data.code === 0) {
      ElMessage.success('关联成功')
      taskDialogVisible.value = false
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('关联失败')
  } finally {
    associating.value = false
  }
}

const handleDelete = async (id) => {
  try {
    const { data } = await axios.delete(`/api/flash-ideas/${id}`)
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
  const y = d.getFullYear()
  const m = (d.getMonth() + 1 + '').padStart(2, '0')
  const day = (d.getDate() + '').padStart(2, '0')
  const h = (d.getHours() + '').padStart(2, '0')
  const min = (d.getMinutes() + '').padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.flash-page {
  padding: 20px;
}
.page-header {
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
}
.loading-text, .empty-text {
  text-align: center;
  padding: 40px;
  color: #64748b;
  font-size: 14px;
}
.flash-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}
.flash-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
}
.flash-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #334155;
}
.flash-card-status {
  font-size: 13px;
  font-weight: 500;
}
.flash-card-time {
  font-size: 12px;
  color: #64748b;
}
.flash-card-content {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.flash-card-task {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}
.flash-card-edit {
  margin: 8px 0;
}
.flash-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #334155;
}

@media (max-width: 768px) {
  .flash-page {
    padding: 0;
  }
  .flash-card {
    padding: 12px;
  }
  .flash-card-actions {
    flex-wrap: wrap;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/about/FlashIdeas.vue
git commit -m "feat: add flash ideas management page"
```

---

### Task 5: Mobile adaptation verification

**Files:** (verify only, no changes unless issues found)
- `client/src/views/about/FlashIdeas.vue` — verify mobile styles
- `client/src/components/FlashInput.vue` — verify mobile styles
- `client/src/views/Home.vue` — verify recent flashes section mobile styles

- [ ] **Step 1: Manual verification checklist**

1. Open the app on a < 768px viewport
2. Verify the navigation "闪念" entry appears in both desktop nav and mobile hamburger menu (after "我的文章")
3. Verify the Home page flash input card has proper spacing and the textarea is usable
4. Verify the "最近闪念" section shows 3 items with proper truncation
5. Navigate to `/about/flash-ideas`, verify:
   - The FlashInput at top works
   - Card list renders correctly
   - Status tags show correct emoji/label
   - Edit/associate/delete actions are usable on mobile (touch targets >= 44px)
6. Verify the task association dialog is usable on mobile (full width select)

- [ ] **Step 2: Fix any mobile issues found**

(No code changes planned — fix only if issues are discovered during verification)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: mobile adaptation adjustments for flash ideas"
```
