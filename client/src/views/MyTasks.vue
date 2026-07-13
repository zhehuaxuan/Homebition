<template>
  <div class="my-tasks-container" style="padding: 20px;">
    <!-- 顶部指标卡片行 -->
    <div class="stat-cards">
      <div class="stat-card stat-card-total">
        <div class="stat-card-icon"><el-icon size="24"><List /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalAll }}</div>
          <div class="stat-card-label">全部任务</div>
        </div>
      </div>
      <div class="stat-card stat-card-doing">
        <div class="stat-card-icon"><el-icon size="24"><Loading /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalDoing }}</div>
          <div class="stat-card-label">进行中</div>
        </div>
      </div>
      <div class="stat-card stat-card-wait">
        <div class="stat-card-icon"><el-icon size="24"><Clock /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number">{{ totalWait }}</div>
          <div class="stat-card-label">待启动</div>
        </div>
      </div>
      <div class="stat-card stat-card-overdue">
        <div class="stat-card-icon"><el-icon size="24"><WarningFilled /></el-icon></div>
        <div class="stat-card-body">
          <div class="stat-card-number stat-card-number-danger">{{ totalOverdue }}</div>
          <div class="stat-card-label">已超期</div>
        </div>
      </div>
    </div>

    <!-- 月度概览条 -->
    <div class="month-bar">
      <el-icon size="16"><Calendar /></el-icon>
      <span>本月共 <strong>{{ totalMonth }}</strong> 个任务</span>
      <span class="month-bar-sep">·</span>
      <span>进行中 <strong>{{ monthDoing }}</strong></span>
      <span class="month-bar-sep">·</span>
      <span>待启动 <strong>{{ monthWait }}</strong></span>
      <span class="month-bar-sep">·</span>
      <span>已完成 <strong>{{ monthDone }}</strong></span>
    </div>

    <!-- 日历卡片容器 -->
    <div class="calendar-card">
      <FullCalendar :options="calendarOptions" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { List, Loading, Clock, WarningFilled, Calendar } from '@element-plus/icons-vue'
import FullCalendar from '@fullcalendar/vue3'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import zhCn from '@fullcalendar/core/locales/zh-cn'
import axios from 'axios'

const taskList = ref([])
const tagList = ref([])

// ==================== 日历配置 ====================
const calendarOptions = ref({
  plugins: [resourcePlugin, resourceTimelinePlugin],
  initialView: 'resourceTimelineMonth',
  schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  locale: zhCn,
  resourceAreaWidth: '180px',
  editable: true,

  eventMouseEnter(info) {
    info.el.setAttribute('title', info.event.title)
  },

  views: {
    resourceTimelineMonth: {
      dayHeaderContent(arg) {
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        return days[arg.date.getDay()]
      }
    }
  },
  resources: [],
  events: []
})

// ==================== 数据请求 ====================
const fetchData = async () => {
  try {
    const taskRes = await axios.get('/api/tasks')
    taskList.value = taskRes.data.list || []
    const tagRes = await axios.get('/api/tags')
    tagList.value = tagRes.data.list || []
  } catch (err) {}
}

// ==================== 资源（标签） ====================
const resources = computed(() => {
  return tagList.value.map(tag => ({
    id: String(tag.id),
    title: tag.name
  }))
})

// ==================== 事件（任务） ====================
const events = computed(() => {
  const arr = []
  taskList.value.forEach(task => {
    try {
      const tagIds = JSON.parse(task.tags || '[]')
      tagIds.forEach(tagId => {
        const statusMap = { 0: '待启动', 1: '进行中', 2: '已完成', 3: '挂起中' }
        const colorMap = {
          '普通': '#6b7280',
          '次要': '#3b82f6',
          '重要': '#ca8a04',
          '紧急': '#ea580c',
          '至关重要': '#dc2626'
        }
        arr.push({
          resourceId: String(tagId),
          title: `${statusMap[task.status]} ${task.title}`,
          start: dateFormatter(task.create_time),
          end: dateFormatter(task.close_time),
          color: colorMap[task.importance] || colorMap.普通,
        })
      })
    } catch {}
  })
  return arr
})

// ==================== 统计数据 ====================
const today = ref('')
const totalAll = ref(0)
const totalDoing = ref(0)
const totalWait = ref(0)
const totalDone = ref(0)
const totalOverdue = ref(0)
const totalMonth = ref(0)
const monthDoing = ref(0)
const monthWait = ref(0)
const monthDone = ref(0)

const computeStats = computed(() => {
  const list = taskList.value.map(item => {
    // 状态映射
    if (item.status === 0) item.statusText = '待启动'
    else if (item.status === 1) item.statusText = '进行中'
    else if (item.status === 2) item.statusText = '已完成'
    else if (item.status === 3) item.statusText = '挂起中'
    // 日期格式化
    item.create_time = dateFormatter(item.create_time)
    item.close_time = dateFormatter(item.close_time)
    return item
  })

  const now = Date.now()
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // 今天日期
  const d = new Date()
  today.value = `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, 0)}-${(d.getDate() + '').padStart(2, 0)}`

  // 总数统计
  totalAll.value = list.length
  totalDoing.value = list.filter(i => i.statusText === '进行中').length
  totalWait.value = list.filter(i => i.statusText === '待启动').length
  totalDone.value = list.filter(i => i.statusText === '已完成').length

  // 超期任务
  totalOverdue.value = list.filter(i => {
    const isNotDone = i.statusText !== '已完成'
    const isOver = new Date(i.close_time).getTime() < now
    return isNotDone && isOver
  }).length

  // 本月统计
  const monthList = list.filter(i => {
    const createDate = new Date(i.create_time)
    return createDate.getFullYear() === currentYear && createDate.getMonth() === currentMonth
  })
  totalMonth.value = monthList.length
  monthDoing.value = monthList.filter(i => i.statusText === '进行中').length
  monthWait.value = monthList.filter(i => i.statusText === '待启动').length
  monthDone.value = monthList.filter(i => i.statusText === '已完成').length
})

// ==================== 监听更新 ====================
watch([resources, events, taskList], () => {
  calendarOptions.value.resources = resources.value
  calendarOptions.value.events = events.value
  computeStats.value // 触发统计更新
}, { immediate: true })

// ==================== 工具函数 ====================
function dateFormatter(time) {
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, 0)}-${(d.getDate() + '').padStart(2, 0)}`
}

onMounted(() => {
  fetchData()
})
</script>

<style>
/* ===== 统计卡片 ===== */
.stat-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  min-width: 0;
}

.stat-card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-card-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-card-number {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: #1e293b;
}

.stat-card-number-danger {
  color: #dc2626;
}

.stat-card-label {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.stat-card-total {
  background: #eef2ff;
}
.stat-card-total .stat-card-icon {
  background: #6366f1;
  color: #fff;
}

.stat-card-doing {
  background: #f0fdf4;
}
.stat-card-doing .stat-card-icon {
  background: #22c55e;
  color: #fff;
}

.stat-card-wait {
  background: #f8fafc;
}
.stat-card-wait .stat-card-icon {
  background: #94a3b8;
  color: #fff;
}

.stat-card-overdue {
  background: #fef2f2;
}
.stat-card-overdue .stat-card-icon {
  background: #ef4444;
  color: #fff;
}

/* ===== 月度概览条 ===== */
.month-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
  margin-bottom: 16px;
}

.month-bar strong {
  font-weight: 600;
  color: #1e293b;
}

.month-bar-sep {
  color: #cbd5e1;
  margin: 0 2px;
}

/* ===== 日历卡片容器 ===== */
.calendar-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 16px;
}

/* ===== FullCalendar 样式覆盖 ===== */

/* 左上角标签信息表头 */
.fc-scrollgrid thead .fc-datagrid-cell-main {
  font-size: 0 !important;
}
.fc-scrollgrid thead .fc-datagrid-cell-main::before {
  content: "标签信息" !important;
  font-size: 14px !important;
  font-weight: 600;
  color: #1e293b;
}

/* 任务事件条 */
.fc-timeline-event {
  height: 36px !important;
  overflow: hidden !important;
  border-radius: 6px !important;
  margin: 2px 4px !important;
}

.fc-event-main {
  display: flex !important;
  align-items: center !important;
}

.fc-event-title {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: block !important;
  line-height: 32px !important;
  padding: 0 8px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

/* 今天列高亮 */
.fc-timeline-header .fc-day-today {
  background-color: #eff6ff !important;
}

.fc-timeline-header .fc-day-today .fc-datagrid-cell-main {
  font-weight: 700 !important;
}

.fc .fc-day-today {
  background-color: #f8fafc !important;
}

/* 标签列行高与事件条匹配 */
.fc-datagrid-cell.fc-resource {
  line-height: 40px !important;
  padding: 0 8px !important;
}

/* 去掉一些不必要的边框 */
.fc-scrollgrid {
  border: none !important;
}

.fc-scrollgrid td {
  border-color: #e2e8f0 !important;
}

/* 表头样式 */
.fc-col-header-cell {
  padding: 4px 0 !important;
}

.fc-col-header-cell-cushion {
  font-size: 13px !important;
  color: #475569 !important;
  font-weight: 500 !important;
}

/* 容器 */
.my-tasks-container {
  padding: 24px;
}

@media (max-width: 768px) {
  .my-tasks-container {
    padding: 10px !important;
  }
  .my-tasks-container .stats-bar {
    font-size: 12px;
    line-height: 1.8;
  }
}
</style>