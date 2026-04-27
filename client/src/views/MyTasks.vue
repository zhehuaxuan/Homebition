<template>
  <div style="padding: 20px; height: 700px;">
    <FullCalendar :options="calendarOptions" />
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import resourcePlugin from '@fullcalendar/resource'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import zhCn from '@fullcalendar/core/locales/zh-cn'
import axios from 'axios'

const taskList = ref([])
const tagList = ref([])

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

const fetchData = async () => {
  try {
    const taskRes = await axios.get('/api/tasks')
    taskList.value = taskRes.data.list || []
    const tagRes = await axios.get('/api/tags')
    tagList.value = tagRes.data.list || []
  } catch (err) {}
}

const resources = computed(() => {
  return tagList.value.map(tag => ({
    id: String(tag.id),
    title: tag.name
  }))
})

const events = computed(() => {
  const arr = []
  taskList.value.forEach(task => {
    try {
      const tagIds = JSON.parse(task.tags || '[]')
      tagIds.forEach(tagId => {
        const statusMap = {0:'[待启动]',1:'[进行中]',2:'[已完成]',3:'[已挂起]'}
        const colorMap = {
          '普通':'rgba(144,147,153)',
          '次要':'rgba(64,158,255)',
          '重要':'rgba(103,194,58)',
          '紧急':'rgba(245,108,108)',
          '至关重要':'rgba(230,162,60)'
        }
        arr.push({
          resourceId: String(tagId),
          title: `${statusMap[task.status]||''}${task.title}`,
          start: dateFormatter(task.create_time),
          end: dateFormatter(task.close_time),
          color: colorMap[task.importance] || colorMap.普通,
        })
        console.log(arr);
      })
    } catch {}
  })
  return arr
})

watch([resources, events], () => {
  calendarOptions.value.resources = resources.value
  calendarOptions.value.events = events.value
}, { immediate: true })

function dateFormatter(time) {
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth()+1+'').padStart(2,0)}-${(d.getDate()+'').padStart(2,0)}`
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
  background-color: #e6f7ff !important; /* 浅蓝色背景 */
  color: #1890ff !important;              /* 蓝色文字 */
  font-weight: bold !important;
  border-radius: 4px !important;
}

/* 可选：今天整个日期列背景淡一点 */
.fc-timeline-header  .fc-day-today {
  background-color: #fafdff !important;
}
</style>