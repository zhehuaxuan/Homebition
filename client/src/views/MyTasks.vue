<template>
  <div style="padding: 20px; height: 700px;">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import zhCn from '@fullcalendar/core/locales/zh-cn'
import axios from 'axios'

// 1. 任务列表 + 标签列表
const taskList = ref([])
const tagList = ref([]) // 存储接口返回的标签 {id, name}

// 2. 获取两个接口数据
const fetchData = async () => {
  try {
    // 获取任务
    const taskRes = await axios.get('/api/tasks')
    taskList.value = taskRes.data.list || []

    // 获取标签（关键！）
    const tagRes = await axios.get('/api/tags')
    tagList.value = tagRes.data.list || []
  } catch (err) {
    console.error('数据加载失败', err)
  }
}

// 3. 生成日历左侧资源：显示标签 NAME，不是数字
const resources = computed(() => {
  return tagList.value.map(tag => ({
    id: String(tag.id),    // 用标签ID作为资源ID
    title: tag.name       // 显示标签名称：日常随记、AI Agent
  }))
})

// 4. 状态图标
const getStatusIcon = (status) => {
  switch (status) {
    case 0: return '⏳ '
    case 1: return '🚀 '
    case 2: return '✅ '
    case 3: return '⏸️ '
    default: return ''
  }
}

// 5. 重要性颜色（半透明）
const getEventColor = (importance) => {
  switch (importance) {
    case '普通':
      return 'rgba(144, 147, 153, 0.25)'
    case '次要':
      return 'rgba(64, 158, 255, 0.25)'
    case '重要':
      return 'rgba(103, 194, 58, 0.25)'
    case '紧急':
      return 'rgba(245, 108, 108, 0.25)'
    case '至关重要':
      return 'rgba(230, 162, 60, 0.25)'
    default:
      return 'rgba(144, 147, 153, 0.25)'
  }
}

// 6. 处理任务事件（自动匹配标签ID → 显示到对应行）
const events = computed(() => {
  const eventsArr = []

  taskList.value.forEach(task => {
    try {
      // 解析任务身上的标签ID数组 [3,4]
      const tagIds = JSON.parse(task.tags || '[]')
      if (!tagIds.length) return

      tagIds.forEach(tagId => {
        const icon = getStatusIcon(task.status)

        eventsArr.push({
          resourceId: String(tagId), // 匹配标签ID
          title: `${icon}${task.title}`,
          start: dateFormatter(task.create_time),
          end: dateFormatter(task.close_time),
          color: getEventColor(task.importance),
          extendedProps: {
            id: task.id,
            target: task.target,
            status: task.status
          }
        })
      })
    } catch {}
  })

  return eventsArr
})

// 日期格式化
const dateFormatter = time => {
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, 0)}-${(d.getDate() + '').padStart(2, 0)}`
}

// 日历配置
const calendarOptions = computed(() => ({
  plugins: [resourcePlugin, resourceTimelinePlugin],
  initialView: 'resourceTimelineMonth',
  schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
  locale: zhCn,
  resourceAreaWidth: '180px',
  editable: true,

  views: {
    resourceTimelineMonth: {
      dayHeaderContent(arg) {
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
        return days[arg.date.getDay()]
      }
    }
  },

  resources: resources.value,
  events: events.value
}))

// 页面加载
onMounted(() => {
  fetchData()
})
</script>