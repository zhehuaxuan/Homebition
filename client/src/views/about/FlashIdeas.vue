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
      <div v-for="item in list" :key="item.id" class="flash-card" :class="{ 'is-forest': item.status === 'forest' }">
        <div class="flash-card-header">
          <el-dropdown trigger="click" @command="(cmd) => changeStatus(item, cmd)">
            <span class="flash-card-status" :class="'status-' + item.status">
              {{ statusLabels[item.status] || item.status }} <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="sapling">🌱 小树苗</el-dropdown-item>
                <el-dropdown-item command="tree">🌳 大树</el-dropdown-item>
                <el-dropdown-item command="forest">🌲 森林</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <span class="flash-card-time">{{ formatTime(item.created_at) }}</span>
        </div>

        <!-- 查看模式 -->
        <div v-if="editingId !== item.id" class="flash-card-body">
          <p class="flash-card-content">{{ item.content }}</p>
          <div v-if="item.task_id" class="flash-card-task">
            关联任务：
            <el-tag size="small" :type="item.task_status === 1 ? 'success' : 'info'">
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
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

const changeStatus = async (item, status) => {
  if (item.status === status) return
  try {
    const { data } = await axios.put(`/api/flash-ideas/${item.id}`, { status })
    if (data.code === 0) {
      ElMessage.success('状态已更新')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('状态更新失败')
  }
}

const removeTaskAssociation = async (id) => {
  try {
    const { data } = await axios.put(`/api/flash-ideas/${id}`, { task_id: null, status: 'sapling' })
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
  transition: opacity 0.2s;
}
.flash-card.is-forest {
  opacity: 0.65;
  border-color: #1e293b;
  background: #162032;
}
.flash-card.is-forest .flash-card-content {
  color: #64748b;
}
.flash-card.is-forest .flash-card-time {
  color: #475569;
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
