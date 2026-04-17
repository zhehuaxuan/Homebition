<template>
  <div class="page-container">
    <!-- 顶部标题 + 新增按钮 + 刷新按钮 -->
    <div class="header-bar">
      <h2>任务管理</h2>
      <div class="header-buttons">
        <el-button type="primary" @click="handleAdd">新增</el-button>
        <el-button type="success" @click="getList">
          刷新
        </el-button>
      </div>
    </div>
    <!-- 表格容器 -->
    <el-table :data="taskList" border stripe style="width: 100%">
      <!-- 任务名称 -->
      <el-table-column prop="title" label="任务名称" />

      <!-- 目标（包含类型、紧急度、重要性） -->
      <el-table-column label="目标" prop="target" min-width="120">
        <template #default="scope">
          <!-- 关键：加个样式保留换行 -->
          <div style="white-space: pre-wrap; word-break: break-all">
            {{ scope.row.target }}
          </div>
        </template>
      </el-table-column>

      <!-- 重要性 -->
      <el-table-column prop="importance" label="重要性">
        <template #default="scope">
          <el-tag :type="getImportanceTagType(scope.row.importance)" size="small">
            {{ scope.row.importance }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 标签 -->
      <el-table-column prop="tags" label="标签" min-width="150">
        <template #default="scope">
          <el-tag v-for="tag in scope.row.tags" :key="tag" class="mr-2">
            {{ tag }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 创建时间 -->
      <el-table-column prop="create_time" label="开始日期" />

      <!-- 闭环时间 -->
      <el-table-column prop="close_time" label="闭环日期" />

      <!-- 状态（进行中/已完成/待启动） -->
      <el-table-column label="状态">
        <template #default="scope">
          <el-tag :type="getStatusCodeType(scope.row.status)" effect="plain">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 剩余时间 -->
      <el-table-column prop="remainDays" label="剩余时间（天）" min-width="90" />

      <!-- 操作列 -->
      <el-table-column label="操作" min-width="200" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" @click="handleDetail(scope.row)">详情</el-button>
          <!-- 修改状态按钮 -->
          <el-button size="small" type="success" @click="openStatusDialog(scope.row)">修改状态</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          <el-button size="small" type="warning" @click="openDelayDialog(scope.row)">延期</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <!-- 创建任务弹窗 -->
  <el-dialog v-model="taskDialogVisible" title="创建任务" width="600px">
    <el-form :model="taskForm" ref="taskFormRef" label-width="85px" class="task-form">
      <!-- 任务名称 -->
      <el-form-item label="任务名称" required>
        <el-input v-model="taskForm.title" placeholder="请输入任务名称" style="width: 100%" />
      </el-form-item>

      <!-- 重要性 新增下拉框 -->
      <el-form-item label="重要性" required>
        <el-select v-model="taskForm.importance" placeholder="请选择重要性" style="width: 100%">
          <el-option label="普通" value="普通" />
          <el-option label="次要" value="次要" />
          <el-option label="重要" value="重要" />
          <el-option label="紧急" value="紧急" />
          <el-option label="至关重要" value="至关重要" />
        </el-select>
      </el-form-item>

      <!-- 目标 -->
      <el-form-item label="目标">
        <el-input v-model="taskForm.target" type="textarea" rows="3" placeholder="请输入任务目标" style="width: 100%" />
      </el-form-item>

      <!-- 创建日期 -->
      <el-form-item label="创建日期" required>
        <el-date-picker v-model="taskForm.create_time" type="date" placeholder="选择创建日期"
          value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </el-form-item>

      <!-- 关闭日期 -->
      <el-form-item label="关闭日期" required>
        <el-date-picker v-model="taskForm.close_time" type="date" placeholder="选择关闭日期"
          value-format="YYYY-MM-DD HH:mm:ss" :disabled-date="disabledCloseDate" style="width: 100%" />
      </el-form-item>

      <!-- 标签 多选 -->
      <el-form-item label="标签" required>
        <el-select v-model="taskForm.tagIds" multiple placeholder="请选择标签" style="width: 100%">
          <el-option v-for="item in tagList" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="taskDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmitTask">确认创建</el-button>
    </template>
  </el-dialog>


  <!-- 修改状态弹窗（新增） -->
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
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="statusDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleUpdateStatus">确认修改</el-button>
    </template>
  </el-dialog>


  <!-- 延期弹窗（新增） -->
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
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 定义表格数据
const taskList = ref([])

// 状态映射 Element Plus 标签类型
const getStatusCodeType = (status) => {
  const map = {
    '进行中': 'primary',
    '已完成': 'success',
    '待启动': 'info'
  }
  return map[status] || 'default'
}

// 重要性标签颜色映射
const getImportanceTagType = (importance) => {
  const map = {
    '普通': 'info',
    '次要': '',
    '重要': 'warning',
    '紧急': 'danger',
    '至关重要': 'danger'
  }
  return map[importance] || 'info'
}

// 操作事件
const handleDetail = (row) => {
  ElMessage.info(`查看任务：${row.title}`)
  console.log('详情数据：', row)
}

// 删除任务
const handleDelete = async (id) => {
  await ElMessageBox.confirm('确定要删除该任务吗？', '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).catch(() => {
    ElMessage.info('已取消删除')
    throw new Error('cancel')
  })

  try {
    await axios.delete(`/api/task/delete/${id}`)
    ElMessage.success('删除成功')
    getList()
  } catch (err) {
    if (err.message === 'cancel') return
    ElMessage.error('删除失败：' + (err.response?.data?.message || '网络异常'))
  }
}

// ================== 新增：修改状态功能 ==================
const statusDialogVisible = ref(false)
const statusForm = reactive({
  taskId: null,
  currentStatus: '',
  newStatus: ''
})

// 打开状态弹窗
const openStatusDialog = (row) => {
  statusForm.taskId = row.id
  statusForm.currentStatus = row.status
  statusForm.newStatus = row.status
  statusDialogVisible.value = true
}

// 提交修改状态
const handleUpdateStatus = async () => {
  if (!statusForm.newStatus) {
    return ElMessage.warning('请选择状态')
  }

  // 文字转数字状态
  let status = 0
  if (statusForm.newStatus === '进行中') status = 1
  if (statusForm.newStatus === '已完成') status = 2

  try {
    await axios.post('/api/task/updateStatus', {
      id: statusForm.taskId,
      status: status
    })
    ElMessage.success('状态修改成功')
    statusDialogVisible.value = false
    loadTaskList()
  } catch (e) {
    ElMessage.error('修改失败')
  }
}

// 弹窗显示
const taskDialogVisible = ref(false)
const taskFormRef = ref(null)

// 表单数据 ✅ 增加了 importance
const taskForm = reactive({
  title: '',
  importance: '', // 重要性
  target: '',
  create_time: '',
  close_time: '',
  tagIds: []
})

// 标签列表
const tagList = ref([])

// 打开弹窗
const handleAdd = () => {
  taskForm.title = ''
  taskForm.importance = '' // 重置重要性
  taskForm.target = ''
  taskForm.create_time = ''
  taskForm.close_time = ''
  taskForm.tagIds = []
  taskDialogVisible.value = true
}

//刷新任务列表
const getList = () => {
  loadTaskList();
}

// 加载标签
const loadTagList = async () => {
  try {
    const { data } = await axios.get('/api/tags')
    tagList.value = data.list || []
  } catch (e) {
    ElMessage.error('标签加载失败')
  }
}

//加载任务
const loadTaskList = async () => {
  try {
    const { data } = await axios.get('/api/tasks')
    const list = (data.list || []).map(item => {
      if (item.status === 0) item.status = '待启动'
      else if (item.status === 1) item.status = '进行中'
      else if (item.status === 2) item.status = '已完成'

      item.tags = loadTagsByTask(item.tags, tagList.value);
      item.create_time = dateFormatter(item.create_time);
      item.close_time = dateFormatter(item.close_time);
      item.remainDays = getRemainDays(item.create_time, item.close_time);
      return item;
    });
    taskList.value = list
  } catch (e) {
    console.log(e)
    ElMessage.error('任务加载失败')
  }
}

const dateFormatter = (time) => {
  const date = new Date(time)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 计算剩余天数
const getRemainDays = (create_time, close_time) => {
  const start = new Date(create_time).getTime()
  const end = new Date(close_time).getTime()
  const now = Date.now()
  if (now >= end) return 0
  const diff = end - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days
}

const loadTagsByTask = (tagStr, tagList) => {
  const realTagList = Array.isArray(tagList) ? tagList : []
  let tagIds = []
  try {
    tagIds = JSON.parse(tagStr)
  } catch (e) {
    return []
  }
  return tagIds.map(id => {
    const tag = realTagList.find(item => item.id == id)
    return tag ? tag.name : id
  })
}

// 关闭日期禁止选择早于创建日期
const disabledCloseDate = (time) => {
  if (!taskForm.create_time) return false
  return time.getTime() < new Date(taskForm.create_time).getTime()
}

// 提交任务 ✅ 已带上 importance
const handleSubmitTask = async () => {
  if (!taskForm.title) return ElMessage.warning('请输入任务名称')
  if (!taskForm.importance) return ElMessage.warning('请选择重要性')
  if (!taskForm.create_time) return ElMessage.warning('请选择创建日期')
  if (!taskForm.close_time) return ElMessage.warning('请选择关闭日期')
  if (taskForm.tagIds.length === 0) return ElMessage.warning('请选择至少一个标签')

  const create = new Date(taskForm.create_time)
  const close = new Date(taskForm.close_time)
  if (create >= close) {
    return ElMessage.warning('创建时间必须小于关闭时间')
  }

  try {
    await axios.post('/api/task/add', {
      title: taskForm.title,
      importance: taskForm.importance, // 提交重要性
      target: taskForm.target,
      create_time: taskForm.create_time,
      close_time: taskForm.close_time,
      tagIds: taskForm.tagIds,
      status: 0
    })
    ElMessage.success('创建成功')
    taskDialogVisible.value = false
    loadTaskList();
  } catch (err) {
    ElMessage.error('创建失败')
  }
}

// 延期功能（新增）
const delayDialogVisible = ref(false)
const delayForm = reactive({
  taskId: null,
  oldCloseTime: '',
  newCloseTime: ''
})
// 打开延期弹窗
const openDelayDialog = (row) => {
  delayForm.taskId = row.id
  console.log(row);
  delayForm.oldCloseTime = row.close_time
  delayForm.newCloseTime = row.close_time
  delayDialogVisible.value = true
}
// 新日期不能早于当前日期
const disabledDelayDate = (time) => {
  return time.getTime() < Date.now()
}
// 提交延期
const handleSubmitDelay = async () => {
  if (!delayForm.newCloseTime) return ElMessage.warning('请选择新闭环时间')
  try {
    await axios.post('/api/task/delay', {
      id: delayForm.taskId,
      close_time: delayForm.newCloseTime
    })
    ElMessage.success('延期成功')
    delayDialogVisible.value = false
    loadTaskList()
  } catch (e) {
    ElMessage.error('延期失败')
  }
}

onMounted(async () => {
  try {
    await loadTagList();
    await loadTaskList();
  } catch (err) {
    console.error('初始化失败', err);
  }
});
</script>

<style scoped>
.page-container {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>