<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">每日总结</h2>
      <div class="header-actions">
        <el-button :icon="Refresh" circle @click="fetchList" :loading="loading" />
        <el-button type="primary" @click="openAdd">+ 新建日报</el-button>
      </div>
    </div>

    <el-table
      :data="list"
      v-loading="loading"
      stripe
      style="width: 100%"
      empty-text="暂无日报记录"
    >
      <el-table-column label="日期" width="120" sortable>
        <template #default="{ row }">
          {{ formatDate(row.date) }}
        </template>
      </el-table-column>
      <el-table-column label="本日工作任务及进展" min-width="200">
        <template #default="{ row }">
          <span class="cell-text">{{ truncate(row.work_progress, 60) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="下一步工作内容" min-width="200">
        <template #default="{ row }">
          <span class="cell-text">{{ truncate(row.next_plan, 60) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="关键遗留风险项" min-width="160">
        <template #default="{ row }">
          <span class="cell-text">{{ truncate(row.risk_items, 60) || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="170">
        <template #default="{ row }">
          {{ row.submitted_at ? formatTime(row.submitted_at) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定要删除此日报吗？" @confirm="handleDelete(row.date)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 查看/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '新建日报' : (dialogMode === 'edit' ? '编辑日报 - ' + formatDate(dialogForm.date) : formatDate(dialogForm.date) + ' 日报')"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item v-if="dialogMode === 'add'" label="日期">
          <el-date-picker
            v-model="dialogForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            :disabled-date="disabledDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="📋 本日工作任务及进展">
          <el-input
            v-model="dialogForm.work_progress"
            type="textarea"
            :rows="4"
            placeholder="请填写今日完成的工作任务及进展"
            :disabled="dialogMode === 'view'"
          />
        </el-form-item>
        <el-form-item label="🎯 下一步工作内容">
          <el-input
            v-model="dialogForm.next_plan"
            type="textarea"
            :rows="4"
            placeholder="请填写下一步工作计划"
            :disabled="dialogMode === 'view'"
          />
        </el-form-item>
        <el-form-item label="⚠️ 关键遗留风险项">
          <el-input
            v-model="dialogForm.risk_items"
            type="textarea"
            :rows="4"
            placeholder="请填写需要关注的风险事项"
            :disabled="dialogMode === 'view'"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-if="dialogMode !== 'view'" type="primary" @click="handleSave" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

const list = ref([])
const loading = ref(true)
const saving = ref(false)

const dialogVisible = ref(false)
const dialogMode = ref('view')
const dialogForm = ref({ date: '', work_progress: '', next_plan: '', risk_items: '' })

const fetchList = async () => {
  loading.value = true
  try {
    const { data } = await axios.get('/api/daily-summary')
    if (data.code === 0) {
      list.value = data.data
      // 构建已有日期集合（用于新建时禁用已存在的日期）
      existingDates.value = new Set(data.data.map(item => formatDate(item.date)))
    }
  } catch (err) {
    console.error('获取日报列表失败', err)
    ElMessage.error('获取日报列表失败')
  } finally {
    loading.value = false
  }
}

const openAdd = () => {
  dialogMode.value = 'add'
  dialogForm.value = { date: '', work_progress: '', next_plan: '', risk_items: '' }
  dialogVisible.value = true
}

const openEdit = (item) => {
  dialogMode.value = 'edit'
  dialogForm.value = { ...item }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (dialogMode.value === 'add' && !dialogForm.value.date) {
    ElMessage.warning('请选择日期')
    return
  }
  if (!dialogForm.value.work_progress && !dialogForm.value.next_plan && !dialogForm.value.risk_items) {
    ElMessage.warning('至少填写一项内容')
    return
  }

  saving.value = true
  try {
    const dateStr = formatDate(dialogForm.value.date)
    const { data } = await axios.put(`/api/daily-summary/${dateStr}`, {
      work_progress: dialogForm.value.work_progress,
      next_plan: dialogForm.value.next_plan,
      risk_items: dialogForm.value.risk_items
    })
    if (data.code === 0) {
      ElMessage.success('保存成功')
      dialogVisible.value = false
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (date) => {
  try {
    const { data } = await axios.delete(`/api/daily-summary/${formatDate(date)}`)
    if (data.code === 0) {
      ElMessage.success('删除成功')
      await fetchList()
    }
  } catch (err) {
    ElMessage.error('删除失败')
  }
}

const truncate = (text, len) => {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

// 已有日报的日期集合（用于禁用日期选择器）
const existingDates = ref(new Set())

const disabledDate = (date) => {
  // 不能选未来日期
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (date > today) return true

  // 不能选已有日报的日期
  const y = date.getFullYear()
  const m = (date.getMonth() + 1 + '').padStart(2, '0')
  const d = (date.getDate() + '').padStart(2, '0')
  return existingDates.value.has(`${y}-${m}-${d}`)
}

const formatDate = (d) => {
  if (!d) return ''
  // 处理 ISO 字符串或 Date 对象，转为 YYYY-MM-DD
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  const y = date.getFullYear()
  const m = (date.getMonth() + 1 + '').padStart(2, '0')
  const day = (date.getDate() + '').padStart(2, '0')
  return `${y}-${m}-${day}`
}

const formatTime = (time) => {
  if (!time) return ''
  return time.slice(0, 19).replace('T', ' ')
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}
.cell-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.5;
}
</style>
