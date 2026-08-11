<template>
  <div class="page-container">
    <h2 class="page-title">工作流任务</h2>

    <div class="action-bar">
      <el-input v-model="searchKeyword" placeholder="搜索任务标题" clearable style="width: 260px" @input="fetchList" class="search-input" />

      <el-select v-model="statusFilter" placeholder="状态过滤" clearable style="width: 150px" @change="fetchList" class="desktop-only">
        <el-option label="全部" value="" />
        <el-option :value="0" label="待启动" />
        <el-option :value="1" label="进行中" />
        <el-option :value="2" label="已完成" />
      </el-select>

      <el-button @click="resetFilter" class="desktop-only">重置</el-button>

      <div class="spacer"></div>

      <el-button type="primary" @click="$router.push('/about/workflow-tasks/create')">新建工作流</el-button>
    </div>

    <div v-loading="loading" class="table-container">
      <el-table :data="list" border style="width: 100%">
        <el-table-column prop="title" label="任务名称" min-width="160" />
        <el-table-column label="步骤进度" width="110" class-name="hide-on-mobile">
          <template #default="scope">
            <span>{{ scope.row.current_step_order }}/{{ scope.row.total_steps }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" sortable :sort-method="(a,b) => a.status - b.status">
          <template #default="scope">
            <el-tag :type="statusTagType(scope.row.status)" effect="plain">
              {{ statusLabel(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" class-name="hide-on-mobile">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="finished_at" label="完成时间" width="180" class-name="hide-on-mobile">
          <template #default="scope">
            {{ scope.row.finished_at ? formatDateTime(scope.row.finished_at) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <div class="action-btns">
              <el-button v-if="scope.row.status === 0 || scope.row.status === 1" size="small" @click="$router.push(`/about/workflow-tasks/${scope.row.id}/edit`)">编辑</el-button>
              <el-button v-if="scope.row.status === 2" size="small" @click="$router.push(`/about/workflow-tasks/${scope.row.id}`)">查看</el-button>
              <el-button v-if="scope.row.status === 0" size="small" @click="handleStart(scope.row.id)">启动</el-button>
              <el-button v-if="scope.row.status === 1" size="small" type="success" @click="$router.push(`/about/workflow-tasks/${scope.row.id}/progress`)">反馈进展</el-button>
              <el-popconfirm title="确定删除此任务？" @confirm="handleDelete(scope.row.id)">
                <template #reference>
                  <el-button size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && list.length === 0" class="empty-text">暂无工作流任务</div>

    <div class="mobile-task-cards">
      <div v-for="task in list" :key="task.id" class="mobile-task-card">
        <div class="card-header">
          <span class="card-title">{{ task.title }}</span>
          <el-tag :type="statusTagType(task.status)" size="small" effect="plain">{{ statusLabel(task.status) }}</el-tag>
        </div>
        <div class="card-body">
          <span>步骤：{{ task.current_step_order }}/{{ task.total_steps }}</span>
          <span>创建：{{ formatDate(task.created_at) }}</span>
        </div>
        <div class="card-actions">
          <el-button v-if="task.status === 0 || task.status === 1" size="small" @click="$router.push(`/about/workflow-tasks/${task.id}/edit`)">编辑</el-button>
          <el-button v-if="task.status === 2" size="small" @click="$router.push(`/about/workflow-tasks/${task.id}`)">查看</el-button>
          <el-button v-if="task.status === 0" size="small" @click="handleStart(task.id)">启动</el-button>
          <el-button v-if="task.status === 1" size="small" type="success" @click="$router.push(`/about/workflow-tasks/${task.id}/progress`)">进展</el-button>
          <el-popconfirm title="确定删除？" @confirm="handleDelete(task.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

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

const resetFilter = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  fetchList()
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

const formatDateTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (t) => {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(fetchList)
</script>

<style scoped>
.page-container { padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.page-title { margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #e2e8f0; }

.action-bar {
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
}
.spacer { flex: 1; }

.empty-text { text-align: center; padding: 60px 20px; color: #64748b; font-size: 14px; }

.mobile-task-cards { display: none; }

@media (max-width: 768px) {
  .page-container { padding: 12px; }
  .table-container { display: none; }
  .desktop-only { display: none !important; }

  .mobile-task-cards {
    display: flex; flex-direction: column; gap: 10px;
  }
  .mobile-task-card {
    background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 14px;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
  }
  .card-title { font-size: 15px; font-weight: 600; color: #e2e8f0; flex: 1; margin-right: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-body {
    display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 10px;
  }
  .card-actions {
    display: flex; gap: 6px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid #334155;
  }
}
</style>
