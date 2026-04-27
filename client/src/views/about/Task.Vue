<template>
  <div class="page-container">
    <h2 class="page-title">任务管理</h2>

    <div class="action-bar">
      <el-input v-model="queryParams.keyword" placeholder="搜索任务名称/目标" clearable style="width: 260px"
        @keyup.enter="getList" />

      <el-select v-model="queryParams.status" placeholder="状态过滤" clearable style="width: 150px">
        <el-option label="待启动" value="待启动" />
        <el-option label="进行中" value="进行中" />
        <el-option label="已完成" value="已完成" />
        <el-option label="挂起中" value="挂起中" />
      </el-select>

      <el-button type="primary" @click="getList">查询</el-button>
      <el-button @click="resetQuery">重置</el-button>

      <div class="spacer"></div>

      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button type="success" @click="getList">刷新</el-button>
    </div>

    <el-table :data="filteredList" border stripe style="width: 100%" @sort-change="handleSortChange">
      <el-table-column prop="title" label="任务名称" />
      <el-table-column label="目标" prop="target" min-width="160">
        <template #default="scope">
          <el-tooltip placement="top-start" :width="360" effect="light" :disabled="!scope.row.target">
            <template #content>
              <pre style="margin:0; white-space:pre-wrap; font-size:12px;">{{ scope.row.target }}</pre>
            </template>
            <div class="single-line-ellipsis">
              {{ scope.row.target }}
            </div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="importance" label="重要性" sortable :sort-method="sortImportance">
        <template #default="scope">
          <el-tag :type="getImportanceTagType(scope.row.importance)" size="small">{{ scope.row.importance }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tagsShow" label="标签" min-width="150">
        <template #default="scope">
          <div class="tag-list">
            <el-tag v-for="tag in scope.row.tagsShow" :key="tag" size="small" class="custom-tag">
              {{ tag }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="create_time" label="开始日期" />
      <el-table-column prop="close_time" label="闭环日期" sortable :sort-method="sortDate" />
      <el-table-column prop="status" label="状态" sortable :sort-method="sortStatus">
        <template #default="scope">
          <el-tag :type="getStatusCodeType(scope.row.status)" effect="plain">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remainDays" label="剩余时间（天）" min-width="110" sortable :sort-method="sortNumber" />
      <el-table-column label="操作" width="200" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" @click="handleDetail(scope.row)">详情</el-button>
          <el-button size="small" type="warning" @click="handleEdit(scope.row)">修改</el-button>

          <el-dropdown @command="(cmd) => handleMoreAction(cmd, scope.row)">
            <el-button size="small" type="info" text>
              更多
              <el-icon class="el-icon--right">
                <ArrowDown />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="status">修改状态</el-dropdown-item>
                <el-dropdown-item command="delay">延期</el-dropdown-item>
                <el-dropdown-item command="delete" divided type="danger">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <!-- 任务详情弹窗 + 进展反馈 -->
  <el-dialog v-model="detailVisible" title="任务详情" width="700px" append-to-body>
    <div v-if="detailData" class="detail-box">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="任务名称">{{ detailData.title }}</el-descriptions-item>
        <el-descriptions-item label="重要性">
          <el-tag :type="getImportanceTagType(detailData.importance)" size="small">{{ detailData.importance }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusCodeType(detailData.status)" size="small" effect="plain">{{ detailData.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="剩余时间">{{ detailData.remainDays }} 天</el-descriptions-item>
        <el-descriptions-item label="创建日期">{{ detailData.create_time }}</el-descriptions-item>
        <el-descriptions-item label="闭环日期">{{ detailData.close_time }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="t in detailData.tagsShow" :key="t" size="small" class="custom-tag">{{ t }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务目标" :span="2">
          <div style="white-space:pre-wrap; min-height:40px;">{{ detailData.target || '无' }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 历史进展 -->
      <div class="progress-section" style="margin-top:15px;">
        <div class="title">任务进展记录</div>
        <div class="progress-list" v-if="progressList.length">
          <div v-for="(item, idx) in progressList" :key="idx" class="progress-item">
            <div class="time">{{ item.create_time }}</div>
            <div class="content">{{ item.content }}</div>
          </div>
        </div>
        <div v-else style="color:#999; padding:10px 0;">暂无进展记录</div>
      </div>

      <!-- 进展反馈输入框 -->
      <div class="feedback-section" style="margin-top:15px;">
        <div class="title">添加进展反馈</div>
        <el-input v-model="feedbackContent" type="textarea" rows="3" placeholder="请输入任务进展反馈..." maxlength="500"
          show-word-limit />
      </div>
    </div>

    <template #footer>
      <el-button @click="detailVisible = false">关闭</el-button>
      <el-button type="primary" @click="submitProgress">提交进展</el-button>
    </template>
  </el-dialog>

  <!-- 创建/修改弹窗 -->
  <el-dialog v-model="taskDialogVisible" :title="isEdit ? '修改任务' : '创建任务'" width="600px">
    <el-form :model="taskForm" ref="taskFormRef" label-width="85px" class="task-form">
      <el-form-item label="任务名称" required>
        <el-input v-model="taskForm.title" placeholder="请输入任务名称" style="width: 100%" />
      </el-form-item>
      <el-form-item label="重要性" required>
        <el-select v-model="taskForm.importance" placeholder="请选择重要性" style="width: 100%">
          <el-option label="普通" value="普通" />
          <el-option label="次要" value="次要" />
          <el-option label="重要" value="重要" />
          <el-option label="紧急" value="紧急" />
          <el-option label="至关重要" value="至关重要" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标">
        <el-input v-model="taskForm.target" type="textarea" rows="3" placeholder="请输入任务目标" style="width: 100%" />
      </el-form-item>
      <el-form-item label="创建日期" required>
        <el-date-picker v-model="taskForm.create_time" type="date" placeholder="选择创建日期"
          value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </el-form-item>
      <el-form-item label="关闭日期" required>
        <el-date-picker v-model="taskForm.close_time" type="date" placeholder="选择关闭日期"
          value-format="YYYY-MM-DD HH:mm:ss" :disabled-date="disabledCloseDate" style="width: 100%" />
      </el-form-item>
      <el-form-item label="标签" required>
        <el-select v-model="taskForm.tagIds" multiple placeholder="请选择标签" style="width: 100%">
          <el-option v-for="item in tagList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="taskDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmitTask">确认</el-button>
    </template>
  </el-dialog>

  <!-- 修改状态弹窗 -->
  <el-dialog v-model="statusDialogVisible" title="修改任务状态" width="500px">
    <el-form :model="statusForm" label-width="80px" style="margin-top: 10px;">
      <el-form-item label="当前状态">
        <span>{{ statusForm.currentStatus }}</span>
      </el-form-item>
      <el-form-item label="修改为" required>
        <el-select v-model="statusForm.newStatus" placeholder="请选择状态" style="width: 100%">
          <el-option label="待启动" value="待启动" />
          <el-option label="进行中" value="进行中" />
          <el-option label="已完成" value="已完成" />
          <el-option label="挂起中" value="挂起中" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="statusDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleUpdateStatus">确认修改</el-button>
    </template>
  </el-dialog>

  <!-- 延期弹窗 -->
  <el-dialog v-model="delayDialogVisible" title="任务延期" width="550px">
    <el-form label-width="100px">
      <el-form-item label="当前闭环时间">
        <span class="text-gray">{{ delayForm.oldCloseTime }}</span>
      </el-form-item>
      <el-form-item label="新闭环时间" required>
        <el-date-picker v-model="delayForm.newCloseTime" type="date" value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择新的闭环日期" :disabled-date="disabledDelayDate" style="width:100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="delayDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmitDelay">确认延期</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'

const taskList = ref([])
const statusDialogVisible = ref(false)
const taskDialogVisible = ref(false)
const delayDialogVisible = ref(false)
const taskFormRef = ref(null)
const isEdit = ref(false)
const currentTaskId = ref(null)

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref(null)
const progressList = ref([])
const feedbackContent = ref('')

const taskForm = reactive({
  title: '',
  importance: '',
  target: '',
  create_time: '',
  close_time: '',
  tagIds: []
})

const statusForm = reactive({ taskId: null, currentStatus: '', newStatus: '' })
const delayForm = reactive({ taskId: null, oldCloseTime: '', newCloseTime: '' })
const tagList = ref([])

const queryParams = reactive({
  keyword: '',
  status: ''
})

const filteredList = computed(() => {
  let data = [...taskList.value]
  if (queryParams.keyword) {
    const kw = queryParams.keyword.toLowerCase()
    data = data.filter(item =>
      item.title?.toLowerCase().includes(kw) ||
      item.target?.toLowerCase().includes(kw)
    )
  }
  if (queryParams.status) {
    data = data.filter(item => item.status === queryParams.status)
  }
  return data
})

// 状态标签颜色
const getStatusCodeType = status => {
  const map = { '进行中': 'primary', '已完成': 'success', '待启动': 'info','挂起中':'warning' }
  return map[status] || 'default'
}

const getImportanceTagType = importance => {
  const map = {
    '普通': 'info',
    '次要': '',
    '重要': 'warning',
    '紧急': 'danger',
    '至关重要': 'danger'
  }
  return map[importance] || 'info'
}

// 打开详情
const handleDetail = async (row) => {
  detailData.value = row
  feedbackContent.value = ''
  // 加载进展记录
  await loadProgressList(row.id)
  detailVisible.value = true
}

// 加载任务进展 + 时间格式化
const loadProgressList = async (taskId) => {
  try {
    const { data } = await axios.get(`/api/task/progress/${taskId}`)
    // 格式化时间
    progressList.value = (data.list || []).map(item => {
      item.create_time = formatDateTime(item.create_time)
      return item
    })
  } catch (e) {
    progressList.value = []
  }
}

// 日期时间格式化函数（处理 ISO 时间）
const formatDateTime = (time) => {
  if (!time) return ''
  const d = new Date(time)
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
}

// 提交进展
const submitProgress = async () => {
  if (!feedbackContent.value.trim()) {
    return ElMessage.warning('请输入进展内容')
  }
  await axios.post('/api/task/progress/add', {
    taskId: detailData.value.id,
    content: feedbackContent.value
  })
  ElMessage.success('提交成功')
  feedbackContent.value = ''
  loadProgressList(detailData.value.id)
}

// 删除
const handleDelete = async id => {
  await ElMessageBox.confirm('确定删除？', '提示', { type: 'warning' }).catch(() => {
    throw new Error('cancel')
  })
  await axios.delete(`/api/task/delete/${id}`)
  ElMessage.success('删除成功')
  getList()
}

// 更多操作下拉
const handleMoreAction = (cmd, row) => {
  if (cmd === 'status') openStatusDialog(row)
  if (cmd === 'delay') openDelayDialog(row)
  if (cmd === 'delete') handleDelete(row.id)
}

// 修改状态
const openStatusDialog = row => {
  statusForm.taskId = row.id
  statusForm.currentStatus = row.status
  statusForm.newStatus = row.status
  statusDialogVisible.value = true
}
const handleUpdateStatus = async () => {
  if (!statusForm.newStatus) return ElMessage.warning('请选择状态')
  const statusMap = { '待启动': 0, '进行中': 1, '已完成': 2,'挂起中':3 }
  const status = statusMap[statusForm.newStatus]
  await axios.post('/api/task/updateStatus', { id: statusForm.taskId, status })
  ElMessage.success('状态修改成功')
  statusDialogVisible.value = false
  getList()
}

// 新增任务
const handleAdd = () => {
  isEdit.value = false
  Object.assign(taskForm, {
    title: '', importance: '', target: '', create_time: '', close_time: '', tagIds: []
  })
  taskDialogVisible.value = true
}

// 修改任务回填
const handleEdit = (row) => {
  isEdit.value = true
  currentTaskId.value = row.id
  taskForm.title = row.title || ''
  taskForm.importance = row.importance || ''
  taskForm.target = row.target || ''
  taskForm.create_time = row.create_time ? row.create_time + ' 00:00:00' : ''
  taskForm.close_time = row.close_time ? row.close_time + ' 00:00:00' : ''
  try {
    taskForm.tagIds = JSON.parse(row.tags) || []
  } catch (err) {
    taskForm.tagIds = []
  }
  taskDialogVisible.value = true
}

// 重置查询
const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.status = ''
}

// 获取任务列表
const getList = async () => {
  const { data } = await axios.get('/api/tasks')
  taskList.value = (data.list || []).map(item => {
    if (item.status === 0) item.status = '待启动'
    else if (item.status === 1) item.status = '进行中'
    else if (item.status === 2) item.status = '已完成'
    else if (item.status === 3) item.status = '挂起中'
    item.tagsShow = loadTagsByTask(item.tags, tagList.value)
    item.create_time = dateFormatter(item.create_time)
    item.close_time = dateFormatter(item.close_time)
    item.remainDays = getRemainDays(item.create_time, item.close_time)
    return item
  })
}

// 日期格式化
const dateFormatter = time => {
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, 0)}-${(d.getDate() + '').padStart(2, 0)}`
}

// 剩余天数计算
const getRemainDays = (s, e) => {
  const now = Date.now()
  const end = new Date(e).getTime()
  return now >= end ? 0 : Math.ceil((end - now) / 86400000)
}

// 标签名称转换
const loadTagsByTask = (tagStr, list) => {
  try {
    return JSON.parse(tagStr).map(id => {
      const t = list.find(x => x.id == id)
      return t ? t.name : id
    })
  } catch {
    return []
  }
}

// 日期禁用
const disabledCloseDate = t => {
  if (!taskForm.create_time) return false
  return t.getTime() < new Date(taskForm.create_time).getTime()
}

// 提交新增/修改
const handleSubmitTask = async () => {
  if (!taskForm.title || !taskForm.importance || !taskForm.create_time || !taskForm.close_time || taskForm.tagIds.length === 0) {
    return ElMessage.warning('请完善所有必填项')
  }
  if (new Date(taskForm.create_time) >= new Date(taskForm.close_time)) {
    return ElMessage.warning('创建时间必须小于关闭时间')
  }

  try {
    if (isEdit.value) {
      await axios.post('/api/task/update', { id: currentTaskId.value, ...taskForm })
      ElMessage.success('修改成功')
    } else {
      await axios.post('/api/task/add', { ...taskForm, status: 0 })
      ElMessage.success('创建成功')
    }
    taskDialogVisible.value = false
    getList()
  } catch (err) {
    ElMessage.error(isEdit.value ? '修改失败' : '创建失败')
  }
}

// 任务延期
const openDelayDialog = row => {
  delayForm.taskId = row.id
  delayForm.oldCloseTime = row.close_time
  delayForm.newCloseTime = row.close_time
  delayDialogVisible.value = true
}
const disabledDelayDate = t => t.getTime() < Date.now()
const handleSubmitDelay = async () => {
  if (!delayForm.newCloseTime) return ElMessage.warning('请选择新日期')
  await axios.post('/api/task/delay', { id: delayForm.taskId, close_time: delayForm.newCloseTime })
  ElMessage.success('延期成功')
  delayDialogVisible.value = false
  getList()
}

// 表格排序
const handleSortChange = () => { }
const sortImportance = (a, b) => {
  const weight = { '普通': 1, '次要': 2, '重要': 3, '紧急': 4, '至关重要': 5 }
  return weight[a.importance] - weight[b.importance]
}
const sortStatus = (a, b) => {
  const map = { '待启动': 0, '进行中': 1, '已完成': 2,'挂起中': 3 }
  return map[a.status] - map[b.status]
}
const sortDate = (a, b) => new Date(a.close_time) - new Date(b.close_time)
const sortNumber = (a, b) => a.remainDays - b.remainDays

// 加载标签
const loadTagList = async () => {
  const { data } = await axios.get('/api/tags')
  tagList.value = data.list || []
}

onMounted(async () => {
  await loadTagList()
  await getList()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.spacer {
  flex: 1;
}

.single-line-ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 详情样式 */
.detail-box {
  padding: 5px;
}

.progress-section .title,
.feedback-section .title {
  font-weight: bold;
  margin-bottom: 8px;
  color: white;
}

.progress-item {
  padding: 8px 0px;
  border-radius: 4px;
  margin-bottom: 6px;
}

.progress-item .time {
  font-size: 12px;
  margin-bottom: 4px;
}

.progress-item .content {
  line-height: 1.4;
}

/* 彩色标签 */
:deep(.custom-tag) {
  background-color: #409eff !important;
  color: #fff !important;
  border-color: #409eff !important;
  opacity: 1 !important;
}

:deep(.custom-tag):nth-child(5n+1) {
  background: #409eff !important;
  color: #fff;
}

:deep(.custom-tag):nth-child(5n+2) {
  background: #67c23a !important;
  color: #fff;
}

:deep(.custom-tag):nth-child(5n+3) {
  background: #e6a23c !important;
  color: #fff;
}

:deep(.custom-tag):nth-child(5n+4) {
  background: #f56c6c !important;
  color: #fff;
}

:deep(.custom-tag):nth-child(5n+5) {
  background: #909399 !important;
  color: #fff;
}
</style>