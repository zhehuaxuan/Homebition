<template>
  <div class="my-tasks-container">
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

    <div class="view-controls">
      <div class="month-nav">
        <el-button size="small" circle @click="changeMonth(-1)">‹</el-button>
        <span class="month-title">{{ year }}年{{ month + 1 }}月</span>
        <el-button size="small" circle @click="changeMonth(1)">›</el-button>
        <el-button size="small" @click="goToday" class="today-btn">今天</el-button>
      </div>
    </div>

    <div class="month-grid">
      <div class="grid-header">
        <div class="day-header" v-for="d in weekDays" :key="d">{{ d }}</div>
      </div>
      <div class="grid-body">
        <div v-for="wk in 6" :key="wk" class="week-row" :style="{ height: weekRowHeight(wk - 1) + 'px' }">
          <div class="week-bg" :style="{ minHeight: '28px' }">
            <div v-for="d in 7" :key="(wk-1)*7+d"
              class="day-cell"
              :class="dayCellClass(calendarDays[(wk-1)*7+(d-1)])">
              <span class="day-num">{{ calendarDays[(wk-1)*7+(d-1)].num }}</span>
            </div>
          </div>
          <div class="week-overlay">
            <div v-for="seg in weekSegments(wk - 1)" :key="seg.id"
              class="task-bar"
              :class="'status-' + seg.status"
              :style="weekTaskBarStyle(seg)"
              :title="seg.title">
              <span class="bar-text">{{ seg.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { List, Loading, Clock, WarningFilled, Calendar } from '@element-plus/icons-vue'
import axios from 'axios'

const taskList = ref([])
const tagList = ref([])
const viewDate = ref(new Date())

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateFormatter(time) {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, '0')}-${(d.getDate() + '').padStart(2, '0')}`
}

function dateToObj(time) {
  if (!time) return new Date()
  return new Date(time)
}

const calendarDays = computed(() => {
  const y = year.value, m = month.value
  const first = new Date(y, m, 1)
  let startDow = first.getDay()
  startDow = startDow === 0 ? 6 : startDow - 1
  const gridStart = new Date(first)
  gridStart.setDate(gridStart.getDate() - startDow)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    days.push({
      date: d,
      num: d.getDate(),
      isCurrent: d.getMonth() === m,
      isToday: isSameDay(d, new Date())
    })
  }
  return days
})

function dayCellClass(day) {
  return { 'other-month': !day.isCurrent, 'is-today': day.isToday }
}

function changeMonth(delta) {
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() + delta)
  viewDate.value = d
}

function goToday() {
  viewDate.value = new Date()
}

function getTaskColRange(task) {
  const taskStart = dateToObj(task.create_time)
  const taskEnd = dateToObj(task.close_time)
  const gridStart = calendarDays.value[0].date
  const gridEnd = calendarDays.value[41].date
  const monthStart = new Date(year.value, month.value, 1)
  const monthEnd = new Date(year.value, month.value + 1, 0, 23, 59, 59)
  if (taskEnd < monthStart || taskStart > monthEnd) return null
  const visStart = taskStart < gridStart ? gridStart : (taskStart < monthStart ? monthStart : taskStart)
  let clipEnd = taskEnd > monthEnd ? monthEnd : taskEnd
  clipEnd = clipEnd > gridEnd ? gridEnd : clipEnd
  clipEnd.setHours(0, 0, 0, 0)
  if (visStart > clipEnd) return null
  let startIdx = -1, endIdx = -1
  for (let i = 0; i < 42; i++) {
    if (isSameDay(calendarDays.value[i].date, visStart)) startIdx = i
    if (isSameDay(calendarDays.value[i].date, clipEnd)) endIdx = i
  }
  if (startIdx === -1 || endIdx === -1) return null
  return { startIdx, span: endIdx - startIdx + 1 }
}

function splitIntoSegments(task, range) {
  const segs = []
  let idx = range.startIdx
  let remaining = range.span
  let firstTag = ''
  try {
    const tagIds = JSON.parse(task.tags || '[]')
    if (tagIds.length > 0) {
      const tag = tagList.value.find(t => t.id === tagIds[0])
      if (tag) firstTag = tag.name
    }
  } catch {}
  while (remaining > 0) {
    const weekEnd = (Math.floor(idx / 7) + 1) * 7
    const inWeek = Math.min(remaining, weekEnd - idx)
    segs.push({
      id: `${task.id}-${idx}`,
      title: task.title,
      label: `【${firstTag}】【${task.importance}】【${dateFormatter(task.create_time)}-${dateFormatter(task.close_time)}】${task.title}`,
      status: task.status,
      importance: task.importance,
      week: Math.floor(idx / 7),
      col: idx % 7,
      span: inWeek,
      track: 0
    })
    idx += inWeek
    remaining -= inWeek
  }
  return segs
}

const segmentsMap = computed(() => {
  const weeks = [[], [], [], [], [], []]
  taskList.value.forEach(task => {
    const range = getTaskColRange(task)
    if (!range) return
    const segs = splitIntoSegments(task, range)
    segs.forEach(s => weeks[s.week].push(s))
  })
  weeks.forEach(wkSegs => {
    wkSegs.sort((a, b) => a.col - b.col)
    const tracks = []
    wkSegs.forEach(seg => {
      let placed = false
      for (let ti = 0; ti < tracks.length; ti++) {
        if (tracks[ti] <= seg.col) {
          seg.track = ti
          tracks[ti] = seg.col + seg.span
          placed = true
          break
        }
      }
      if (!placed) {
        seg.track = tracks.length
        tracks.push(seg.col + seg.span)
      }
    })
  })
  return weeks
})

function weekRowHeight(week) {
  const segs = segmentsMap.value[week]
  if (!segs || segs.length === 0) return 28
  const tracks = Math.max(...segs.map(s => s.track)) + 1
  return tracks * 30 + 4
}

function weekSegments(week) {
  const segs = segmentsMap.value[week]
  if (!segs) return []
  return segs.map(seg => ({
    ...seg,
    pixelTop: seg.track * 30 + 2,
    pixelHeight: 26
  }))
}

function weekTaskBarStyle(seg) {
  const hue = (seg.id.split('-')[0] * 47 + 200) % 360
  return {
    left: (seg.col / 7 * 100) + '%',
    width: (seg.span / 7 * 100) + '%',
    top: seg.pixelTop + 'px',
    height: seg.pixelHeight + 'px',
    backgroundColor: `hsl(${hue}, 55%, 45%)`,
    borderLeft: `3px solid hsl(${hue}, 70%, 35%)`
  }
}

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
    if (item.status === 0) item.statusText = '待启动'
    else if (item.status === 1) item.statusText = '进行中'
    else if (item.status === 2) item.statusText = '已完成'
    else if (item.status === 3) item.statusText = '挂起中'
    item.create_time = dateFormatter(item.create_time)
    item.close_time = dateFormatter(item.close_time)
    return item
  })
  const now = Date.now()
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const d = new Date()
  today.value = `${d.getFullYear()}-${(d.getMonth() + 1 + '').padStart(2, 0)}-${(d.getDate() + '').padStart(2, 0)}`
  totalAll.value = list.length
  totalDoing.value = list.filter(i => i.statusText === '进行中').length
  totalWait.value = list.filter(i => i.statusText === '待启动').length
  totalDone.value = list.filter(i => i.statusText === '已完成').length
  totalOverdue.value = list.filter(i => {
    const isNotDone = i.statusText !== '已完成'
    const isOver = new Date(i.close_time).getTime() < now
    return isNotDone && isOver
  }).length
  const monthList = list.filter(i => {
    const createDate = new Date(i.create_time)
    return createDate.getFullYear() === currentYear && createDate.getMonth() === currentMonth
  })
  totalMonth.value = monthList.length
  monthDoing.value = monthList.filter(i => i.statusText === '进行中').length
  monthWait.value = monthList.filter(i => i.statusText === '待启动').length
  monthDone.value = monthList.filter(i => i.statusText === '已完成').length
})

watch(taskList, () => { computeStats.value }, { immediate: true })

const fetchData = async () => {
  try {
    const taskRes = await axios.get('/api/tasks')
    taskList.value = taskRes.data.list || []
    const tagRes = await axios.get('/api/tags')
    tagList.value = tagRes.data.list || []
  } catch (err) {}
}

onMounted(() => { fetchData() })
</script>

<style scoped>
.my-tasks-container { padding: 24px; }

.stat-cards { display: flex; gap: 16px; margin-bottom: 16px; }
.stat-card { flex: 1; display: flex; align-items: center; gap: 14px; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); min-width: 0; }
.stat-card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card-body { display: flex; flex-direction: column; min-width: 0; }
.stat-card-number { font-size: 24px; font-weight: 700; line-height: 1.2; color: #1e293b; }
.stat-card-number-danger { color: #dc2626; }
.stat-card-label { font-size: 13px; color: #64748b; margin-top: 2px; }
.stat-card-total { background: #eef2ff; }
.stat-card-total .stat-card-icon { background: #6366f1; color: #fff; }
.stat-card-doing { background: #f0fdf4; }
.stat-card-doing .stat-card-icon { background: #22c55e; color: #fff; }
.stat-card-wait { background: #f8fafc; }
.stat-card-wait .stat-card-icon { background: #94a3b8; color: #fff; }
.stat-card-overdue { background: #fef2f2; }
.stat-card-overdue .stat-card-icon { background: #ef4444; color: #fff; }

.month-bar { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f1f5f9; border-radius: 8px; font-size: 13px; color: #475569; margin-bottom: 16px; }
.month-bar strong { font-weight: 600; color: #1e293b; }
.month-bar-sep { color: #cbd5e1; margin: 0 2px; }

.view-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.month-nav { display: flex; align-items: center; gap: 8px; }
.month-title { font-size: 20px; font-weight: 700; color: #ffffff; min-width: 120px; text-align: center; letter-spacing: 1px; }

.month-grid { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
.grid-header { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
.day-header { display: flex; align-items: center; justify-content: center; padding: 8px 0; font-size: 13px; font-weight: 500; color: #64748b; }

.week-row { position: relative; border-bottom: 1px solid #f1f5f9; }
.week-row:last-child { border-bottom: none; }

.week-bg { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 28px; height: 100%; }
.day-cell { display: flex; align-items: center; justify-content: center; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
.day-cell.other-month { color: #e2e8f0; }
.day-cell.is-today { background: #eff6ff; }
.day-cell.is-today .day-num { background: #3b82f6; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }

.week-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; }

.task-bar { position: absolute; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; cursor: pointer; pointer-events: auto; transition: opacity 0.15s; overflow: hidden; white-space: nowrap; }
.task-bar:hover { opacity: 0.85; }
.bar-text { font-size: 11px; color: #fff; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1; }
.task-bar.status-0 { opacity: 0.8; }
.task-bar.status-2 { opacity: 0.65; }
</style>
