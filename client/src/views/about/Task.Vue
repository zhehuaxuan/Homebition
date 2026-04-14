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
      <el-table-column prop="title" label="任务名称" min-width="180" />

      <!-- 目标（包含类型、紧急度、重要性） -->
      <el-table-column prop="target" label="目标" min-width="260" />

      <!-- 标签 -->
      <el-table-column prop="tags" label="标签" min-width="150">
        <template #default="scope">
          <!-- 这里必须用 scope.row.tags -->
          <el-tag v-for="tag in scope.row.tags" :key="tag" class="mr-2">
            {{ tag }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 创建时间 -->
      <el-table-column prop="create_time" label="创建时间" min-width="160" />

      <!-- 闭环时间 -->
      <el-table-column prop="close_time" label="闭环时间" min-width="160" />

      <!-- 状态（进行中/已完成/待启动） -->
      <el-table-column label="状态" min-width="100">
        <template #default="scope">
          <el-tag :type="getStatusCodeType(scope.row.status)" effect="plain">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 剩余时间 -->
      <el-table-column prop="remainDays" label="剩余时间（天）" min-width="130" />

      <!-- 操作列 -->
      <el-table-column label="操作" min-width="200" align="center">
        <template #default="scope">
          <el-button size="small" type="primary" @click="handleDetail(scope.row.id)">详情</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          <el-button size="small" type="warning" @click="handleDelay(scope.row.id)">延期</el-button>
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

      <!-- 目标 -->
      <el-form-item label="目标">
        <el-input v-model="taskForm.target" type="textarea" rows="3" placeholder="请输入任务目标" style="width: 100%" />
      </el-form-item>

      <!-- 创建日期 -->
      <el-form-item label="创建日期" required>
        <el-date-picker v-model="taskForm.create_time" type="datetime" placeholder="选择创建日期"
          value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
      </el-form-item>

      <!-- 关闭日期 -->
      <el-form-item label="关闭日期" required>
        <el-date-picker v-model="taskForm.close_time" type="datetime" placeholder="选择关闭日期"
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
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

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

// 操作事件
const handleDetail = (row) => {
  ElMessage.info(`查看任务：${row.name}`)
  console.log('详情数据：', row)
}

// 删除任务
const handleDelete = async (id) => {
  // 确认弹窗
  await ElMessageBox.confirm('确定要删除该任务吗？', '提示', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).catch(() => {
    ElMessage.info('已取消删除')
    // 抛出错误终止执行
    throw new Error('cancel')
  })

  try {
    // 调用 DELETE 接口
    await axios.delete(`/api/task/delete/${id}`)
    ElMessage.success('删除成功')
    // 刷新列表
    getList()
  } catch (err) {
    // 取消删除不提示错误
    if (err.message === 'cancel') return
    ElMessage.error('删除失败：' + (err.response?.data?.message || '网络异常'))
  }
}

const handleDelay = (row) => {
  ElMessage.primary(`申请延期任务：${row.name}`)
  // 这里可以弹出延期时间选择框
}

// 弹窗显示
const taskDialogVisible = ref(false)
const taskFormRef = ref(null)

// 表单数据
const taskForm = reactive({
  title: '',
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
  taskForm.target = ''
  taskForm.create_time = ''
  taskForm.close_time = ''
  taskForm.tagIds = []
  taskDialogVisible.value = true
}

//刷新任务列表
const getList = ()=>{
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
      // 修改状态栏
      if (item.status === 0) item.status = '待启动'
      else if (item.status === 1) item.status = '进行中'
      else if (item.status === 2) item.status = '已完成'

      // 显示标签
      const tags =  loadTagsByTask(item.tags,tagList.value);
      item.tags = tags;

      item.remainDays = getRemainDays(item.create_time, item.close_time);      
      return item
    });
    // 遍历拿到所有标签名
    tagList.value.forEach(item => {
      console.log(item) 
    })
    taskList.value = list
  } catch (e) {
    console.log(e)
    ElMessage.error('任务加载失败')
  }
}

// 计算剩余天数（返回整数，无小数点）
const getRemainDays = (create_time, close_time) => {
  // 转成时间戳
  const start = new Date(create_time).getTime()
  const end = new Date(close_time).getTime()
  const now = Date.now()

  // 如果已经超过闭环时间，返回 0
  if (now >= end) return 0

  // 时间差（毫秒）
  const diff = end - now

  // 毫秒 → 天数（向上取整，保证无小数）
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
    const tag = realTagList.find(item => item.id == id) // == 兼容数字/字符串
    return tag ? tag.name : id
  })
}


// 关闭日期禁止选择早于创建日期
const disabledCloseDate = (time) => {
  if (!taskForm.create_time) return false
  return time.getTime() < new Date(taskForm.create_time).getTime()
}

// 提交任务
const handleSubmitTask = async () => {
  // 基础校验
  if (!taskForm.title) return ElMessage.warning('请输入任务名称')
  if (!taskForm.create_time) return ElMessage.warning('请选择创建日期')
  if (!taskForm.close_time) return ElMessage.warning('请选择关闭日期')
  if (taskForm.tagIds.length === 0) return ElMessage.warning('请选择至少一个标签')

  // 时间逻辑校验
  const create = new Date(taskForm.create_time)
  const close = new Date(taskForm.close_time)
  if (create >= close) {
    return ElMessage.warning('创建时间必须小于关闭时间')
  }

  try {
    await axios.post('/api/task/add', {
      title: taskForm.title,
      target: taskForm.target,
      create_time: taskForm.create_time,
      close_time: taskForm.close_time,
      tagIds: taskForm.tagIds,
      status: 0
    })
    ElMessage.success('创建成功')
    taskDialogVisible.value = false
    // 可在这里刷新任务列表
    loadTaskList();
  } catch (err) {
    ElMessage.error('创建失败')
  }
}

onMounted(async () => {
  try {
    // 先加载标签 → 等待完成
    await loadTagList();
    
    // 再加载任务 → 等待完成
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

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>