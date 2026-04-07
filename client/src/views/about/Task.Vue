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
      <el-table-column prop="name" label="任务名称" min-width="180" />

      <!-- 目标（包含类型、紧急度、重要性） -->
      <el-table-column prop="dest" label="目标" min-width="260" />

      <!-- 标签 -->
      <el-table-column label="标签" min-width="100">
        <template #default="scope">
          <el-tag :type="scope.row.tag === '工作' ? 'primary' : (scope.row.tag === '学习' ? 'success' : 'info')">
            {{ scope.row.tag }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 创建时间 -->
      <el-table-column prop="createTime" label="创建时间" min-width="160" />

      <!-- 闭环时间 -->
      <el-table-column prop="endTime" label="闭环时间" min-width="160" />

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
          <el-button size="small" type="primary" @click="handleDetail(scope.row)">详情</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          <el-button size="small" type="warning" @click="handleDelay(scope.row)">延期</el-button>
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

// 定义表格数据（2条示例数据）
const taskList = ref([
  {
    id: 1,
    name: "完成项目需求文档",
    target: {
      type: "工作",
      urgent: "高",
      important: "高"
    },
    dest: "123",
    tag: "工作",
    createTime: "2026-04-01 10:30",
    endTime: "2026-04-05 18:00",
    status: "进行中",
    remainDays: 3 // 模拟剩余3天
  },
  {
    id: 2,
    name: "学习 Vue3 + Element Plus 实战",
    dest: "123",
    target: {
      type: "学习",
      urgent: "中",
      important: "高"
    },
    tag: "学习",
    createTime: "2026-04-02 14:00",
    endTime: "2026-04-10 23:59",
    status: "待启动",
    remainDays: 8 // 模拟剩余8天
  }
])

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

const handleDelete = (row) => {
  ElMessage.warning(`删除任务：${row.name}`)
  // 这里可以添加确认框逻辑
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

// 加载标签
const loadTagList = async () => {
  try {
    const { data } = await axios.get('/api/tags')
    tagList.value = data.list || []
  } catch (e) {
    ElMessage.error('标签加载失败')
  }
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
  } catch (err) {
    ElMessage.error('创建失败')
  }
}

onMounted(() => {
  loadTagList()
})
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