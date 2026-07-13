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

    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { List, Loading, Clock, WarningFilled } from '@element-plus/icons-vue'
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
        const statusMap = { 0: '[待启动]', 1: '[进行中]', 2: '[已完成]', 3: '[已挂起]' }
        const colorMap = {
          '普通': 'rgba(144,147,153)',
          '次要': 'rgba(64,158,255)',
          '重要': 'rgba(103,194,58)',
          '紧急': 'rgba(245,108,108)',
          '至关重要': 'rgba(230,162,60)'
        }
        arr.push({
          resourceId: String(tagId),
          title: `${statusMap[task.status] || ''}${task.title}`,
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
/* 左上角标题 */
.fc-scrollgrid thead .fc-datagrid-cell-main {
  font-size: 0 !important;
}
.fc-scrollgrid thead .fc-datagrid-cell-main::before {
  content: "标签信息" !important;
  font-size: 1rem !important;
  font-weight: bold;
}

/* 事件不换行 + 省略号 */
.fc-timeline-event {
  height: 26px !important;
  overflow: hidden !important;
}
.fc-event-title {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  display: block !important;
  line-height: 22px !important;
  padding: 0 4px !important;
}
/* 行头：今天日期表头高亮 */
.fc-timeline-header .fc-day-today {
  background-color: #e6f7ff !important;
  color: #1890ff !important;
  font-weight: bold !important;
  border-radius: 4px !important;
}

/* 桌面端保持固定高度 */
.my-tasks-container {
  height: 700px;
}

/* ===== 顶部指标卡片 ===== */
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

@media (max-width: 768px) {
  .my-tasks-container {
    height: calc(100vh - 160px) !important;
    padding: 10px !important;
  }
}
</style>