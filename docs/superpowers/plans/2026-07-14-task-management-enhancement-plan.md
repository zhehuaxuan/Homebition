# 任务管理增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在任务管理模块中增加工作量（人天）、进度百分比、实际耗时、逾期高亮、进展删除和统计栏增强。

**Architecture:** 在 task 表新增 workload/progress/actual_days/finished_at 四个字段；task.js 路由新增 workload 和 progress 参数处理，完成时自动计算实际耗时；Task.Vue 和 MyTasks.vue 同步增加进度条、滑块、删除按钮和统计增强。

**Tech Stack:** Node.js (Express + mysql2), Vue 3 (Element Plus), MySQL

## Global Constraints

- Node.js v18+
- API 响应格式: `{ code: 0, data, message }`
- 所有用户可见文字使用中文
- Task.Vue 和 MyTasks.vue 的详情弹窗功能必须保持同步
- 不自动重启前后端服务、不自动 git 操作（用户偏好）

---

### Task 1: 数据库迁移 — task 表新增 4 个字段

**Files:**
- Create: `E:/Homebition/server/migrations/003_add_task_workload_progress.sql` (reference only)

**Interfaces:**
- Consumes: existing `task` table
- Produces: `task.workload` (DECIMAL(5,1)), `task.progress` (TINYINT 0-100), `task.actual_days` (INT), `task.finished_at` (DATETIME)

- [ ] **Step 1: 运行 ALTER TABLE**

```sql
ALTER TABLE task
  ADD COLUMN workload DECIMAL(5,1) DEFAULT 0 COMMENT '预估工作量（人天）',
  ADD COLUMN progress TINYINT DEFAULT 0 COMMENT '进度百分比 0-100',
  ADD COLUMN actual_days INT DEFAULT NULL COMMENT '实际耗时（天），完成时自动计算',
  ADD COLUMN finished_at DATETIME DEFAULT NULL COMMENT '任务完成时间';
```

通过 Node.js 执行：

```bash
cd E:/Homebition/server && node -e "
const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({host:'localhost',user:'root',password:'admin',database:'homebition'});
  const cols = ['workload','progress','actual_days','finished_at'];
  for (const col of cols) {
    const [r] = await pool.query('SHOW COLUMNS FROM task LIKE ?', [col]);
    if (r.length === 0) {
      if (col === 'workload') await pool.query(\"ALTER TABLE task ADD COLUMN workload DECIMAL(5,1) DEFAULT 0 COMMENT '预估工作量（人天）'\");
      if (col === 'progress') await pool.query(\"ALTER TABLE task ADD COLUMN progress TINYINT DEFAULT 0 COMMENT '进度百分比 0-100'\");
      if (col === 'actual_days') await pool.query(\"ALTER TABLE task ADD COLUMN actual_days INT DEFAULT NULL COMMENT '实际耗时（天），完成时自动计算'\");
      if (col === 'finished_at') await pool.query(\"ALTER TABLE task ADD COLUMN finished_at DATETIME DEFAULT NULL COMMENT '任务完成时间'\");
      console.log('Added column: ' + col);
    } else { console.log('Column already exists: ' + col); }
  }
  const [verify] = await pool.query('SHOW COLUMNS FROM task');
  verify.forEach(c => console.log('  ' + c.Field.padEnd(20) + c.Type));
  await pool.end();
})()
"
```

- [ ] **Step 2: 创建迁移 SQL 文件（仅供记录）**

```sql
-- 003_add_task_workload_progress.sql
ALTER TABLE task
  ADD COLUMN workload DECIMAL(5,1) DEFAULT 0 COMMENT '预估工作量（人天）',
  ADD COLUMN progress TINYINT DEFAULT 0 COMMENT '进度百分比 0-100',
  ADD COLUMN actual_days INT DEFAULT NULL COMMENT '实际耗时（天），完成时自动计算',
  ADD COLUMN finished_at DATETIME DEFAULT NULL COMMENT '任务完成时间';
```

写入 `E:/Homebition/server/migrations/003_add_task_workload_progress.sql`

---

### Task 2: 后端 — 修改 task.js 路由

**Files:**
- Modify: `E:/Homebition/server/routes/task.js`

**Interfaces:**
- Consumes: `req.db` (mysql2 pool), `task` table (with new columns), `taskdetail` table
- Produces: updated routes that accept/produce `workload`, `progress`, `actual_days`; new `DELETE /task/progress/delete/:id` route

- [ ] **Step 1: 修改 POST /task/add — 接收 workload**

找到 `router.post('/task/add', ...)` (约第 15 行)，将：

```javascript
const { title, target, create_time, close_time, status, importance, tagIds } = req.body;
```

改为：

```javascript
const { title, target, create_time, close_time, status, importance, tagIds, workload } = req.body;
```

将 INSERT SQL 从：

```javascript
const sql = `INSERT INTO task (title, target, create_time, close_time, tags, status,importance) VALUES (?, ?, ?, ?, ?, ?, ?)`;
const [result] = await req.db.query(sql, [
  title,
  target || '',
  create_time,
  close_time,
  JSON.stringify(tagIds),
  status || 0,
  importance
]);
```

改为：

```javascript
const sql = `INSERT INTO task (title, target, create_time, close_time, tags, status, importance, workload) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
const [result] = await req.db.query(sql, [
  title,
  target || '',
  create_time,
  close_time,
  JSON.stringify(tagIds),
  status || 0,
  importance,
  workload || 0
]);
```

- [ ] **Step 2: 修改 POST /task/update — 接收 workload**

找到 `router.post('/task/update', ...)` (约第 88 行)，将解构：

```javascript
const { id, title, importance, target, create_time, close_time, tagIds } = req.body;
```

改为：

```javascript
const { id, title, importance, target, create_time, close_time, tagIds, workload } = req.body;
```

将 UPDATE SQL 从：

```javascript
const updateSql = `
  UPDATE task
  SET
    title = ?,
    importance = ?,
    target = ?,
    create_time = ?,
    close_time = ?,
    tags=?
    WHERE id = ?
`;
const tagsStr = JSON.stringify(tagIds);
const [result] = await req.db.query(updateSql, [
  title,
  importance,
  target || '',
  create_time,
  close_time,
  tagsStr,
  id
]);
```

改为：

```javascript
const updateSql = `
  UPDATE task
  SET
    title = ?,
    importance = ?,
    target = ?,
    create_time = ?,
    close_time = ?,
    tags = ?,
    workload = ?
    WHERE id = ?
`;
const tagsStr = JSON.stringify(tagIds);
const [result] = await req.db.query(updateSql, [
  title,
  importance,
  target || '',
  create_time,
  close_time,
  tagsStr,
  workload || 0,
  id
]);
```

- [ ] **Step 3: 修改 POST /task/progress/add — 接收 progress 并更新 task 表**

找到 `router.post('/task/progress/add', ...)` (约第 41 行)，将解构：

```javascript
const { taskId, content } = req.body;
```

改为：

```javascript
const { taskId, content, progress } = req.body;
```

在插入 taskdetail 之后，增加更新 task.progress 的逻辑。完整替换该路由为：

```javascript
router.post('/task/progress/add', async (req, res) => {
  try {
    const { taskId, content, progress } = req.body;

    if (!taskId || !content) {
      return res.status(400).json({ code: 400, message: '参数缺失' });
    }
    // 插入 taskdetail 表
    const [result] = await req.db.query(
      'INSERT INTO taskdetail (task_id, content, create_time) VALUES (?, ?, ?)',
      [taskId, content, new Date()]
    );

    // 如果传了 progress，同步更新 task 表
    if (progress !== undefined && progress !== null) {
      await req.db.query(
        'UPDATE task SET progress = ? WHERE id = ?',
        [Math.max(0, Math.min(100, parseInt(progress) || 0)), taskId]
      );
    }

    res.json({
      code: 0,
      message: '进展提交成功',
      data: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: '提交失败' });
  }
});
```

- [ ] **Step 4: 修改 POST /task/updateStatus — 完成时自动计算 actual_days 和写进展**

找到 `router.post('/task/updateStatus', ...)` (约第 160 行)，在 `UPDATE task SET status = ? WHERE id = ?` 更新之后（res.json 之前），增加完成时的自动逻辑。完整替换该路由：

```javascript
router.post('/task/updateStatus', async (req, res) => {
  try {
    const { id, status } = req.body

    if (!id || status === undefined) {
      return res.status(400).json({
        code: 400,
        message: '参数缺失：id 和 status 不能为空'
      })
    }

    if (![0, 1, 2, 3].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '状态值不合法'
      })
    }

    const [result] = await req.db.query(
      'UPDATE task SET status = ? WHERE id = ?',
      [status, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        code: 404,
        message: '任务不存在'
      })
    }

    // 状态改为"已完成"(2)时，自动计算实际耗时、记录完成时间、进度设 100
    if (status === 2) {
      await req.db.query(
        'UPDATE task SET progress = 100, actual_days = DATEDIFF(NOW(), create_time), finished_at = NOW() WHERE id = ?',
        [id]
      );
      // 自动写一条完成进展
      await req.db.query(
        'INSERT INTO taskdetail (task_id, content, create_time) VALUES (?, ?, NOW())',
        [id, '任务已完成']
      );
    }

    return res.json({
      code: 0,
      message: '状态修改成功'
    })

  } catch (err) {
    console.error('更新状态失败：', err)
    return res.status(500).json({
      code: 500,
      message: '服务器异常'
    })
  }
})
```

- [ ] **Step 5: 新增 DELETE /task/progress/delete/:id 路由**

在 `module.exports = router;` 之前插入：

```javascript
// 删除进展记录
router.delete('/task/progress/delete/:id', async (req, res) => {
  try {
    const [result] = await req.db.query('DELETE FROM taskdetail WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '进展记录不存在' });
    }
    res.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('删除进展记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器异常' });
  }
});
```

---

### Task 3: 前端 — 修改 Task.Vue（管理视图）

**Files:**
- Modify: `E:/Homebition/client/src/views/about/Task.Vue`

**Interfaces:**
- Consumes: `GET /api/tasks`, `POST /api/task/add`, `POST /api/task/update`, `POST /api/task/progress/add`, `DELETE /api/task/progress/delete/:id`
- Produces: updated UI with workload, progress, overdue highlighting, stats

- [ ] **Step 1: taskForm 增加 workload 字段**

在 `<script setup>` 区域，`taskForm` reactive 对象（约第 286 行），从：

```javascript
const taskForm = reactive({
  title: '',
  importance: '',
  target: '',
  create_time: '',
  close_time: '',
  tagIds: []
})
```

改为：

```javascript
const taskForm = reactive({
  title: '',
  importance: '',
  target: '',
  create_time: '',
  close_time: '',
  tagIds: [],
  workload: 0
})
```

- [ ] **Step 2: handleAdd 重置时包含 workload**

找到 `const handleAdd = () => {`，将 Object.assign 改为：

```javascript
const handleAdd = () => {
  isEdit.value = false
  Object.assign(taskForm, {
    title: '', importance: '', target: '', create_time: '', close_time: '', tagIds: [], workload: 0
  })
  taskDialogVisible.value = true
}
```

- [ ] **Step 3: handleEdit 回填时读取 workload**

找到 `const handleEdit = (row) => {`，在回填代码末尾增加 workload：

```javascript
const handleEdit = (row) => {
  isEdit.value = true
  currentTaskId.value = row.id
  taskForm.title = row.title || ''
  taskForm.importance = row.importance || ''
  taskForm.target = row.target || ''
  taskForm.workload = row.workload || 0
  taskForm.create_time = row.create_time ? row.create_time + ' 00:00:00' : ''
  taskForm.close_time = row.close_time ? row.close_time + ' 00:00:00' : ''
  try {
    taskForm.tagIds = JSON.parse(row.tags) || []
  } catch (err) {
    taskForm.tagIds = []
  }
  taskDialogVisible.value = true
}
```

- [ ] **Step 4: 创建/修改弹窗 — 增加工作量输入**

在模板的"标签"表单项（约第 218 行）之后，`</el-form>` 之前，加入：

```html
<el-form-item label="工作量（人天）">
  <el-input-number v-model="taskForm.workload" :min="0" :step="0.5" :precision="1" style="width: 100%" />
</el-form-item>
```

- [ ] **Step 5: 新增反馈进度 ref**

在 script 区域的 `const feedbackContent = ref('')` 后面加入：

```javascript
const feedbackProgress = ref(0)
```

- [ ] **Step 6: 打开详情时初始化进度**

找到 `const handleDetail = async (row) => {`，改为：

```javascript
const handleDetail = async (row) => {
  detailData.value = row
  feedbackContent.value = ''
  feedbackProgress.value = row.progress || 0
  await loadProgressList(row.id)
  detailVisible.value = true
}
```

- [ ] **Step 7: 提交进展时携带 progress**

找到 `const submitProgress = async () => {`（约第 402 行），改为：

```javascript
const submitProgress = async () => {
  if (!feedbackContent.value.trim()) {
    return ElMessage.warning('请输入进展内容')
  }
  await axios.post('/api/task/progress/add', {
    taskId: detailData.value.id,
    content: feedbackContent.value,
    progress: feedbackProgress.value
  })
  ElMessage.success('提交成功')
  feedbackContent.value = ''
  // 同步更新列表中的进度
  detailData.value.progress = feedbackProgress.value
  loadProgressList(detailData.value.id)
  getList()
}
```

- [ ] **Step 8: 新增删除进展方法**

在 `submitProgress` 函数之后加入：

```javascript
// 删除进展记录
const handleDeleteProgress = async (progressId) => {
  try {
    await ElMessageBox.confirm('确定删除该进展记录？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await axios.delete(`/api/task/progress/delete/${progressId}`)
  ElMessage.success('删除成功')
  loadProgressList(detailData.value.id)
  getList()
}
```

- [ ] **Step 9: 详情弹窗模板 — 基本信息加工作量和实际耗时**

在详情弹窗的 `el-descriptions` 区域（约第 153 行 "剩余时间" 之后，"创建日期" 之前），插入：

```html
<el-descriptions-item label="工作量">{{ detailData.workload || 0 }} 人天</el-descriptions-item>
<el-descriptions-item label="实际耗时">{{ detailData.actual_days != null ? detailData.actual_days + ' 天' : '-' }}</el-descriptions-item>
```

- [ ] **Step 10: 详情弹窗模板 — 反馈区增加进度滑块**

在反馈输入框（约第 178 行）之前加入：

```html
<div class="feedback-progress" style="margin-bottom:12px;">
  <div class="title">任务进度</div>
  <el-progress :percentage="detailData.progress" :color="customProgressColor" style="margin-bottom:8px;" />
  <el-slider v-model="feedbackProgress" :min="0" :max="100" show-input :step="5" />
</div>
```

同时在 `<script setup>` 中加入进度条颜色函数：

```javascript
const customProgressColor = (percentage) => {
  if (percentage >= 100) return '#67c23a'
  if (percentage >= 60) return '#409eff'
  if (percentage >= 30) return '#e6a23c'
  return '#f56c6c'
}
```

- [ ] **Step 11: 详情弹窗模板 — 进展记录加删除按钮**

将进展记录每条渲染（约第 168 行）改为：

```html
<div v-for="(item, idx) in progressList" :key="idx" class="progress-item">
  <div class="time">{{ item.create_time }}</div>
  <div class="progress-item-body">
    <div class="content">{{ item.content }}</div>
    <el-button type="danger" size="small" text @click="handleDeleteProgress(item.id)" class="delete-progress-btn">
      <el-icon><Close /></el-icon>
    </el-button>
  </div>
</div>
```

同时在 `<script setup>` 的 import 中加上 `Close` 图标：

```javascript
import { Close, ArrowDown } from '@element-plus/icons-vue'
```

CSS 加一条：

```css
.progress-item-body { display: flex; align-items: center; justify-content: space-between; }
.progress-item-body .content { flex: 1; }
.delete-progress-btn { flex-shrink: 0; margin-left: 8px; opacity: 0.6; }
.delete-progress-btn:hover { opacity: 1; }
```

- [ ] **Step 12: 任务列表 — 新增"进度"和"工作量"列，逾期高亮**

在 `<el-table>` 的"状态"列之后、"剩余时间"列之前，插入进度列：

```html
<el-table-column prop="progress" label="进度" width="80" sortable :sort-method="sortNumber">
  <template #default="scope">
    <span :style="{ color: scope.row.status === '已完成' ? '#67c23a' : (scope.row.remainDays < 0 ? '#f56c6c' : '#333'), fontWeight: scope.row.remainDays < 0 && scope.row.status !== '已完成' ? 'bold' : 'normal' }">
      {{ scope.row.progress || 0 }}%
    </span>
  </template>
</el-table-column>
```

在"重要性"列之后、"标签"列之前，插入工作量列（仅桌面端）：

```html
<el-table-column prop="workload" label="工作量(人天)" width="110" class-name="hide-on-mobile" sortable :sort-method="sortNumber">
  <template #default="scope">
    <span>{{ scope.row.workload || 0 }} 人天</span>
  </template>
</el-table-column>
```

`el-table` 增加 `:row-class-name="tableRowClassName"` 属性：

```html
<el-table :data="filteredList" border stripe style="width: 100%" @sort-change="handleSortChange" :row-class-name="tableRowClassName">
```

在 script 中增加方法：

```javascript
const tableRowClassName = ({ row }) => {
  if (row.remainDays < 0 && row.status !== '已完成') {
    return 'row-overdue'
  }
  return ''
}
```

在 `<style scoped>` 中增加：

```css
:deep(.row-overdue) { background-color: #fef0f0 !important; }
:deep(.row-overdue td) { background-color: transparent !important; }
```

- [ ] **Step 13: 剩余天数列逾期红色**

将"剩余时间"列的模板改为：

```html
<el-table-column prop="remainDays" label="剩余时间（天）" min-width="110" sortable :sort-method="sortNumber" class-name="hide-on-mobile">
  <template #default="scope">
    <span :style="{ color: scope.row.remainDays < 0 && scope.row.status !== '已完成' ? '#f56c6c' : '#333', fontWeight: scope.row.remainDays < 0 && scope.row.status !== '已完成' ? 'bold' : 'normal' }">
      {{ scope.row.remainDays }}
    </span>
  </template>
</el-table-column>
```

- [ ] **Step 14: 统计栏增强**

在 script 中新增计算属性（放在 `totalOverdue` 相关代码下面）：

```javascript
const totalWorkload = computed(() => {
  return taskList.value.reduce((sum, item) => sum + (parseFloat(item.workload) || 0), 0).toFixed(1)
})

const avgProgress = computed(() => {
  const unfinished = taskList.value.filter(i => i.status !== '已完成')
  if (unfinished.length === 0) return 0
  return Math.round(unfinished.reduce((sum, i) => sum + (parseInt(i.progress) || 0), 0) / unfinished.length)
})

const monthDoneRate = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthTasks = taskList.value.filter(i => {
    const d = new Date(i.create_time)
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })
  if (monthTasks.length === 0) return 0
  return Math.round(monthTasks.filter(i => i.status === '已完成').length / monthTasks.length * 100)
})
```

将统计栏 HTML（约第 124 行）替换为：

```html
<div class="stats-bar" style="margin-top: 16px; font-size: 14px;">
  截止{{ today }}，当前共计任务数{{ totalAll }}个，总预估工作量{{ totalWorkload }}人天，
  其中
  <el-tag type="primary">进行中</el-tag>：{{ totalDoing }}个，
  <el-tag type="info">待启动</el-tag>：{{ totalWait }}个，
  <el-tag type="success">已完成</el-tag>：{{ totalDone }}个，
  平均进度 {{ avgProgress }}%；
  当前已超期任务：<span style="color:red; font-weight:bold;">{{ totalOverdue }}</span>个；

  本月共计任务数{{ totalMonth }}个，
  其中
  <el-tag type="primary">进行中</el-tag>：{{ monthDoing }}个，
  <el-tag type="info">待启动</el-tag>：{{ monthWait }}个，
  <el-tag type="success">已完成</el-tag>：{{ monthDone }}个，
  月完成率 {{ monthDoneRate }}%。
</div>
```

- [ ] **Step 15: getList 中映射 workload 和 progress**

`getList` 函数的 map 中 already returns `item` with `statusText` etc. Since `workload`, `progress`, `actual_days` come from DB directly via `SELECT *`, no extra mapping is needed — they're already on the item. But need to ensure `workload` is available for stats. Add to the map:

```javascript
item.progress = item.progress || 0
item.workload = item.workload || 0
```

插入到 getList 的 map 回调中（已有 statusText 映射之后）。

- [ ] **Step 16: 移动端卡片适配**

在移动端卡片的 `card-meta` div 中，状态标签后面加入进度：

```html
<span class="card-remain" :class="{ overdue: item.remainDays < 0 && item.status !== '已完成' }">
  {{ item.remainDays }} 天 | {{ item.progress || 0 }}%
</span>
```

在 `card-dates` 下方加入工作量行：

```html
<div class="card-row"><span class="card-label">工作量</span>{{ item.workload || 0 }} 人天</div>
```

---

### Task 4: 前端 — 修改 MyTasks.vue（日历视图同步）

**Files:**
- Modify: `E:/Homebition/client/src/views/MyTasks.vue`

**Interfaces:**
- Consumes: `GET /api/tasks`, `POST /api/task/progress/add`, `DELETE /api/task/progress/delete/:id`
- Produces: synced detail dialog with progress slider and delete buttons; calendar task bars with progress %

- [ ] **Step 1: 新增 feedbackProgress ref**

在 `const feedbackContent = ref('')` 后加入：

```javascript
const feedbackProgress = ref(0)
```

- [ ] **Step 2: 打开详情时初始化进度**

`handleGridTaskClick` 函数中，设置 feedbackContent 后添加：

```javascript
async function handleGridTaskClick(seg) {
  const task = taskList.value.find(t => t.id === parseInt(seg.id.split('-')[0]))
  if (!task) return
  detailData.value = { ...task }
  feedbackContent.value = ''
  feedbackProgress.value = task.progress || 0
  loadProgressList(task.id)
  detailVisible.value = true
}
```

- [ ] **Step 3: 提交进展携带 progress**

`subProgress` 函数改为：

```javascript
async function subProgress() {
  if (!feedbackContent.value.trim()) return ElMessage.warning('请输入进展内容')
  await axios.post('/api/task/progress/add', {
    taskId: detailData.value.id,
    content: feedbackContent.value,
    progress: feedbackProgress.value
  })
  ElMessage.success('提交成功')
  feedbackContent.value = ''
  // 同步列表中的进度
  const task = taskList.value.find(t => t.id === detailData.value.id)
  if (task) task.progress = feedbackProgress.value
  detailData.value.progress = feedbackProgress.value
  loadProgressList(detailData.value.id)
}
```

- [ ] **Step 4: 新增 handleDeleteProgress 方法**

在 `subProgress` 函数之后加入：

```javascript
async function handleDeleteProgress(progressId) {
  try {
    await ElMessageBox.confirm('确定删除该进展记录？', '提示', { type: 'warning' })
  } catch {
    return
  }
  await axios.delete('/api/task/progress/delete/' + progressId)
  ElMessage.success('删除成功')
  loadProgressList(detailData.value.id)
}
```

注意：需要在 import 中加上 `ElMessageBox`：

```javascript
import { ElMessage, ElMessageBox } from 'element-plus'
```

- [ ] **Step 5: 详情弹窗模板 — 加进度条和滑块**

在 MyTasks.vue 的详情弹窗模板中，反馈输入框上方插入：

```html
<div style="margin-bottom:12px;">
  <div style="font-weight:600; margin-bottom:6px;">任务进度</div>
  <el-progress :percentage="detailData.progress || 0" :stroke-width="8" :color="(p) => p >= 100 ? '#67c23a' : p >= 50 ? '#409eff' : '#e6a23c'" style="margin-bottom:8px;" />
  <el-slider v-model="feedbackProgress" :min="0" :max="100" show-input :step="5" />
</div>
```

- [ ] **Step 6: 详情弹窗模板 — 进展记录加删除按钮**

将进展记录渲染部分改为（找到 `v-for="(item, idx) in progressList"` 部分）：

```html
<div v-for="(item, idx) in progressList" :key="idx" style="display:flex; align-items:flex-start; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
  <div style="flex:1;">
    <div style="font-size:12px; color:#999;">{{ item.create_time }}</div>
    <div style="margin-top:4px;">{{ item.content }}</div>
  </div>
  <el-button type="danger" size="small" text @click="handleDeleteProgress(item.id)" style="flex-shrink:0; margin-left:8px;">✕</el-button>
</div>
```

- [ ] **Step 7: 日历任务条标注进度**

找到日历模板中渲染任务条的部分（约 MyTasks.vue 模板区域），在任务标题后面加上进度文字。找到 `{{ seg.title }}` 之类的输出，改为：

```html
{{ seg.title }} <span style="font-size:10px;opacity:0.8;">{{ seg.status === '已完成' ? '100%' : (seg.progress || 0) + '%' }}</span>
```

注意：日历视图中 `seg` 是从 `splitIntoSegments` 生成的，需要在 `splitIntoSegments` 函数中将 `task.progress` 传递下去。找到 `splitIntoSegments` 函数，在每个 seg 对象中加 `progress: task.progress`：

```javascript
segs.push({
  id: `${task.id}-${idx}`,
  title: task.title,
  progress: task.progress || 0,
  label: `【${firstTag}】【${task.importance}】【${dateFormatter(task.create_time)}-${dateFormatter(task.close_time)}】${task.title}`,
  status: task.status,
  importance: task.importance,
  week: Math.floor(idx / 7),
  col: idx % 7,
  span: inWeek,
  track: 0
})
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ workload/progress/actual_days/finished_at DB columns → Task 1
- ✅ POST /task/add and /task/update accept workload → Task 2 Steps 1-2
- ✅ POST /task/progress/add accepts progress → Task 2 Step 3
- ✅ POST /task/updateStatus auto-calculates actual_days → Task 2 Step 4
- ✅ DELETE /task/progress/delete/:id → Task 2 Step 5
- ✅ Task list: progress column, workload column, overdue highlight → Task 3 Steps 12-13
- ✅ Task form: workload input → Task 3 Steps 1-4
- ✅ Detail dialog: progress bar + slider, delete progress → Task 3 Steps 5-11
- ✅ Stats bar: workload, avgProgress, monthDoneRate → Task 3 Step 14
- ✅ Mobile card adapt → Task 3 Step 16
- ✅ MyTasks.vue detail sync → Task 4 Steps 1-6
- ✅ Calendar bar progress → Task 4 Step 7

**2. Placeholder scan:**
No TODOs, TBDs, or vague placeholders. All code is complete.

**3. Type consistency:**
`workload` (DECIMAL/number), `progress` (TINYINT/number 0-100), `actual_days` (INT/number), `finished_at` (DATETIME/string) — consistent across all tasks. `feedbackProgress` ref consistent between Task.Vue and MyTasks.vue.
