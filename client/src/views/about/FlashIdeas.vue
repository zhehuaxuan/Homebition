<template>
  <div class="flash-page">
    <div class="page-header">
      <h2 class="page-title">闪念管理</h2>
    </div>

    <!-- 快速录入 -->
    <FlashInput @saved="onFlashSaved" />

    <!-- 统计栏 -->
    <div class="stats-bar">
      <span>✅ 已完成：{{ stats.completed }}</span>
      <span>📌 关联完成：{{ stats.associated }}（+2分）</span>
      <span>✍️ 独立完成：{{ stats.independent }}（+1分）</span>
      <span class="stats-total">🏆 总积分：{{ stats.score }}</span>
    </div>

    <!-- 搜索 + 状态筛选 -->
    <div class="filter-bar">
      <el-input v-model="searchKeyword" placeholder="搜索闪念内容" clearable style="width: 260px" class="search-input" />
      <el-radio-group v-model="statusFilter" class="status-tabs">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="pending">进行中</el-radio-button>
        <el-radio-button value="completed">已完成</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 闪念列表 -->
    <div v-if="loading" class="loading-text">加载中...</div>
    <div v-else-if="filteredList.length === 0" class="empty-text">暂无闪念记录</div>
    <div v-else class="flash-list">
      <div v-for="item in filteredList" :key="item.id" class="flash-card" :class="{ 'is-completed': item.status === 'completed' }">
        <div class="flash-card-header">
          <el-dropdown trigger="click" @command="(cmd) => onChangeStatus(item, cmd)">
            <span class="flash-card-status" :class="'status-' + item.status">
              {{ item.status === 'pending' ? '⏳ 进行中' : '✅ 已完成' }} <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="pending">⏳ 进行中</el-dropdown-item>
                <el-dropdown-item command="completed">✅ 已完成</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span class="flash-card-time">{{ formatTime(item.created_at) }}</span>
        </div>

        <!-- 查看模式 -->
        <div v-if="editingId !== item.id" class="flash-card-body">
          <p class="flash-card-content">{{ item.content }}</p>
          <!-- 已完成且有小结 -->
          <div v-if="item.status === 'completed' && item.summary" class="flash-summary">
            <div class="summary-label">完成小结</div>
            <div class="summary-text">{{ item.summary }}</div>
          </div>
          <!-- 关联任务完成（无小结） -->
          <div v-else-if="item.status === 'completed' && !item.summary && item.task_id" class="flash-summary flash-summary-auto">
            关联任务已完成
          </div>
          <div v-if="item.task_id" class="flash-card-task">
            关联任务：
            <el-tag size="small" :type="item.task_status === 2 ? 'success' : 'info'">
              {{ item.task_title || '已删除' }}
            </el-tag>
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
            <el-button v-if="item.task_id" size="small" text type="warning" @click="removeTaskAssociation(item.id)">解除关联</el-button>
            <el-popconfirm title="确定删除此闪念？" @confirm="handleDelete(item.id)">
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </div>
      </div>
    </div>

    <!-- 完成小结弹窗 -->
    <el-dialog v-model="summaryDialogVisible" title="完成小结" width="420px" :close-on-click-modal="false" destroy-on-close>
      <div class="summary-dialog-body">
        <p class="summary-dialog-tip">请为这条闪念写下完成小结（2-3句话）：</p>
        <el-input
          v-model="summaryText"
          type="textarea"
          :rows="4"
          placeholder="总结一下完成了什么、有什么收获..."
        />
      </div>
      <template #footer>
        <el-button @click="summaryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="summarySubmitting" :disabled="!summaryText.trim()" @click="confirmComplete">
          确认完成
        </el-button>
      </template>
    </el-dialog>

    <!-- 关联任务弹窗 -->
    <el-dialog v-model="taskDialogVisible" title="关联任务" width="400px">
      <el-select
        v-model="selectedTaskId"
        filterable
        remote
        clearable
        :remote-method="searchTasks"
        :loading="taskSearchLoading"
        placeholder="搜索并选择任务（清空可取消关联）"
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import axios from 'axios'
import FlashInput from '../../components/FlashInput.vue'

const list = ref([])
const loading = ref(true)
const searchKeyword = ref('')
const statusFilter = ref('')

// 列表过滤
const filteredList = computed(() => {
  let result = list.value
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(item => item.content.toLowerCase().includes(kw))
  }
  return result
})

// 统计（仅最近一年）
const oneYearAgo = new Date()
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

const stats = computed(() => {
  const recent = list.value.filter(item => {
    const d = new Date(item.created_at)
    return d >= oneYearAgo && item.status === 'completed'
  })
  const associated = recent.filter(item => item.task_id)
  const independent = recent.filter(item => !item.task_id)
  return {
    completed: recent.length,
    associated: associated.length,
    independent: independent.length,
    score: associated.length * 2 + independent.length * 1
  }
})

const editingId = ref(null)
const editContent = ref('')

// 完成小结弹窗
const summaryDialogVisible = ref(false)
const summaryText = ref('')
const summarySubmitting = ref(false)
let pendingCompleteIdea = null

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

// 状态变更
const onChangeStatus = async (item, status) => {
  if (item.status === status) return
  if (status === 'completed' && !item.task_id) {
    // 无关联任务 → 弹完成小结框
    pendingCompleteIdea = item
    summaryText.value = ''
    summaryDialogVisible.value = true
    return
  }
  await doChangeStatus(item.id, status)
}

const doChangeStatus = async (id, status, summary) => {
  try {
    const payload = { status }
    if (summary !== undefined) payload.summary = summary
    const { data } = await axios.put(`/api/flash-ideas/${id}`, payload)
    if (data.code === 0) {
      ElMessage.success(status === 'completed' ? '已完成' : '已设为进行中')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

const confirmComplete = async () => {
  if (!summaryText.value.trim() || !pendingCompleteIdea || summarySubmitting.value) return
  summarySubmitting.value = true
  try {
    await doChangeStatus(pendingCompleteIdea.id, 'completed', summaryText.value.trim())
    summaryDialogVisible.value = false
    pendingCompleteIdea = null
  } finally {
    summarySubmitting.value = false
  }
}

const openTaskDialog = (item) => {
  associatingIdeaId = item.id
  selectedTaskId.value = item.task_id || null
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
    const { data } = await axios.put(`/api/flash-ideas/${associatingIdeaId}`, { task_id: selectedTaskId.value })
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

const removeTaskAssociation = async (id) => {
  try {
    const { data } = await axios.put(`/api/flash-ideas/${id}`, { task_id: null })
    if (data.code === 0) {
      ElMessage.success('已解除任务关联')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('解除关联失败')
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

/* 统计栏 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  margin: 12px 0;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  font-size: 13px;
  color: #94a3b8;
  flex-wrap: wrap;
}
.stats-total {
  color: #fbbf24;
  font-weight: 600;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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
  margin-top: 4px;
}
.flash-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  transition: opacity 0.2s;
}
.flash-card.is-completed {
  opacity: 0.7;
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
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

/* 完成小结展示 */
.flash-summary {
  margin-top: 10px;
  padding: 12px 14px;
  background: #0f172a;
  border-radius: 8px;
  border-left: 3px solid #059669;
}
.flash-summary-auto {
  border-left-color: #64748b;
  font-size: 12px;
  color: #64748b;
}
.summary-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.summary-text {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 完成小结弹窗 */
.summary-dialog-body {
  padding: 4px 0;
}
.summary-dialog-tip {
  font-size: 14px;
  color: #e2e8f0;
  margin: 0 0 12px;
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
  .stats-bar {
    gap: 8px;
    font-size: 12px;
    padding: 10px 12px;
  }
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-bar .search-input {
    width: 100% !important;
  }
  .status-tabs {
    width: 100%;
  }
}
</style>
