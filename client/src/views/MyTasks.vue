<template>
  <div class="my-tasks-container">
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

    <!-- 月份导航 + 视图切换 -->
    <div class="view-controls">
      <div class="month-nav">
        <el-button size="small" circle @click="changeMonth(-1)">‹</el-button>
        <span class="month-title">{{ year }}年{{ month + 1 }}月</span>
        <el-button size="small" circle @click="changeMonth(1)">›</el-button>
        <el-button size="small" @click="goToday" class="today-btn">今天</el-button>
      </div>
      <el-radio-group v-model="viewMode" size="small">
        <el-radio-button value="month">月视图</el-radio-button>
        <el-radio-button value="week">周列表</el-radio-button>
      </el-radio-group>
    </div>

    <!-- View A: 月历网格 -->
    <div v-if="viewMode === 'month'" class="month-grid">
      <div class="grid-header">
        <div class="grid-corner">标签</div>
        <div class="day-header" v-for="d in weekDays" :key="d">{{ d }}</div>
      </div>
      <div class="grid-body">
        <template v-for="tag in tagList" :key="tag.id">
          <div class="grid-row">
            <div class="tag-cell">{{ tag.name }}</div>
            <div class="lane-cell">
              <div class="lane" :style="{ height: laneHeight(tag.id) + 'px' }">
                <!-- 背景天数网格 -->
                <div class="week-bg" v-for="wk in 6" :key="wk">
                  <div v-for="d in 7" :key="(wk-1)*7+d"
                    class="day-cell"
                    :class="dayCellClass(calendarDays[(wk-1)*7+(d-1)])">
                    <span class="day-num">{{ calendarDays[(wk-1)*7+(d-1)].num }}</span>
                  </div>
                </div>
                <!-- 任务条层 -->
                <div class="task-overlay">
                  <div v-for="seg in weekSegmentsByTag(tag.id)" :key="seg.id"
                    class="task-bar"
                    :class="'status-' + seg.status"
                    :style="taskBarStyle(seg)"
                    :title="seg.title">
                    <span class="bar-text">{{ seg.label }}</span>
                  </div>
                </div>
                <!-- 展开/折叠 -->
                <button v-if="tagHasMore(tag.id)" class="expand-btn"
                  @click="toggleExpand(tag.id)">
                  {{ expandedTags[tag.id] ? '▲ 收起' : '▼ ' + tagMoreCount(tag.id) + ' 个更多' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- View B: 周列表 -->
    <div v-else class="week-list">
      <div v-for="(week, wi) in calendarWeeks" :key="wi" class="week-group">
        <div class="week-title">
          {{ weekLabel(wi) }}
          <span class="week-task-count">{{ weekTasks(wi).length }} 个任务</span>
        </div>
        <div v-if="weekTasks(wi).length === 0" class="week-empty">本周暂无任务</div>
        <div v-for="task in weekTasks(wi)" :key="task.id" class="week-card"
          :style="{ borderLeftColor: importanceColors[task.importance] || '#6b7280' }">
          <div class="card-top">
            <span class="card-title">{{ task.title }}</span>
            <el-tag :type="statusTagType(task.status)" size="small" effect="plain">
              {{ statusLabel(task.status) }}
            </el-tag>
          </div>
          <div class="card-meta">
            <span class="card-importance" :style="{ color: importanceColors[task.importance] || '#6b7280' }">
              {{ task.importance }}
            </span>
            <span class="card-dates">{{ dateFormatter(task.create_time) }} → {{ dateFormatter(task.close_time) }}</span>
          </div>
          <div v-if="task.target" class="card-target">{{ task.target }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { List, Loading, Clock, WarningFilled, Calendar } from '@element-plus/icons-vue'
import axios from 'axios'

// ========== 数据 ==========
const taskList = ref([])
const tagList = ref([])
const viewMode = ref('month')
const viewDate = ref(new Date())

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())
const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// ========== 工具函数 ==========
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

const statusLabels = ['待启动', '进行中', '已完成', '挂起中']
const statusTagTypes = ['info', 'primary', 'success', 'warning']

function statusLabel(s) { return statusLabels[s] ?? '' }
function statusTagType(s) { return statusTagTypes[s] ?? 'info' }

const importanceColors = {
  '普通': '#6b7280',
  '次要': '#3b82f6',
  '重要': '#ca8a04',
  '紧急': '#ea580c',
  '至关重要': '#dc2626'
}

// ========== 日历网格数据 ==========
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
  return {
    'other-month': !day.isCurrent,
    'is-today': day.isToday
  }
}

// ========== 月份导航 ==========
function changeMonth(delta) {
  const d = new Date(viewDate.value)
  d.setMonth(d.getMonth() + delta)
  viewDate.value = d
}

function goToday() {
  viewDate.value = new Date()
}

// ========== 任务段分割 ==========
function getTaskColRange(task) {
  const taskStart = dateToObj(task.create_time)
  const taskEnd = dateToObj(task.close_time)
  const gridStart = calendarDays.value[0].date
  const gridEnd = calendarDays.value[41].date

  const visStart = taskStart < gridStart ? gridStart : taskStart
  const visEnd = taskEnd > gridEnd ? gridEnd : taskEnd

  if (visStart > visEnd) return null

  let startIdx = -1, endIdx = -1
  for (let i = 0; i < 42; i++) {
    if (isSameDay(calendarDays.value[i].date, visStart)) startIdx = i
    if (isSameDay(calendarDays.value[i].date, visEnd)) endIdx = i
  }

  if (startIdx === -1 || endIdx === -1) return null
  return { startIdx, span: endIdx - startIdx + 1 }
}

function splitIntoSegments(task, range) {
  const segs = []
  let idx = range.startIdx
  let remaining = range.span
  while (remaining > 0) {
    const weekEnd = (Math.floor(idx / 7) + 1) * 7
    const inWeek = Math.min(remaining, weekEnd - idx)
    segs.push({
      id: `${task.id}-${idx}`,
      title: task.title,
      label: `${statusLabel(task.status)} ${task.title}`,
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

// ========== 标签-任务段映射 + 堆叠 ==========
const tagSegmentsMap = computed(() => {
  const map = {}

  tagList.value.forEach(tag => {
    const weeks = [[], [], [], [], [], []]

    taskList.value.forEach(task => {
      let tagIds = []
      try { tagIds = JSON.parse(task.tags || '[]') } catch {}
      if (!tagIds.includes(tag.id)) return

      const range = getTaskColRange(task)
      if (!range) return

      const segs = splitIntoSegments(task, range)
      segs.forEach(s => weeks[s.week].push(s))
    })

    // 堆叠算法：每周独立排布
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

    map[tag.id] = weeks
  })

  return map
})

// ========== 展开/折叠 ==========
const expandedTags = ref({})

function toggleExpand(tagId) {
  expandedTags.value[tagId] = !expandedTags.value[tagId]
}

const MAX_TRACKS = 3

function maxTracksInWeek(tagId, week) {
  const segs = tagSegmentsMap.value[tagId]?.[week]
  if (!segs || segs.length === 0) return 0
  return Math.max(...segs.map(s => s.track)) + 1
}

function tagHasMore(tagId) {
  for (let w = 0; w < 6; w++) {
    if (maxTracksInWeek(tagId, w) > MAX_TRACKS) return true
  }
  return false
}

function tagMoreCount(tagId) {
  let count = 0
  for (let w = 0; w < 6; w++) {
    const segs = tagSegmentsMap.value[tagId]?.[w] || []
    const visible = Math.min(maxTracksInWeek(tagId, w), expandedTags.value[tagId] ? 999 : MAX_TRACKS)
    count += segs.filter(s => s.track >= visible).length
  }
  return count
}

function trackLimit(tagId) {
  return expandedTags.value[tagId] ? 999 : MAX_TRACKS
}

function laneHeight(tagId) {
  let maxH = 0
  for (let w = 0; w < 6; w++) {
    const tracks = Math.min(maxTracksInWeek(tagId, w), trackLimit(tagId))
    const h = 28 + tracks * 30 + 4
    if (h > maxH) maxH = h
  }
  const total = maxH || 28
  return total + 24 // padding
}

function weekSegmentsByTag(tagId) {
  const all = tagSegmentsMap.value[tagId]
  if (!all) return []
  const flat = []
  const limit = trackLimit(tagId)
  all.forEach((wkSegs, wi) => {
    wkSegs.forEach(seg => {
      if (seg.track < limit) {
        const baseTop = wi * 28 + 4
        flat.push({ ...seg, pixelTop: baseTop + seg.track * 30, pixelHeight: 26 })
      }
    })
  })
  return flat
}

function taskBarStyle(seg) {
  return {
    left: (seg.col / 7 * 100) + '%',
    width: (seg.span / 7 * 100) + '%',
    top: seg.pixelTop + 'px',
    height: seg.pixelHeight + 'px',
    backgroundColor: importanceColors[seg.importance] || '#6b7280'
  }
}

// ========== View B: 周列表 ==========
const calendarWeeks = computed(() => {
  const weeks = []
  for (let i = 0; i < 6; i++) {
    weeks.push(calendarDays.value.slice(i * 7, (i + 1) * 7))
  }
  return weeks
})

function weekLabel(wi) {
  const start = calendarWeeks.value[wi][0].date
  const end = calendarWeeks.value[wi][6].date
  return `${dateFormatter(start)} ~ ${dateFormatter(end)}`
}

function weekTasks(wi) {
  const weekStart = calendarWeeks.value[wi][0].date
  const weekEnd = calendarWeeks.value[wi][6].date

  return taskList.value.filter(task => {
    const start = dateToObj(task.create_time)
    const end = dateToObj(task.close_time)
    // 任务时间段与本周有交集
    return start <= weekEnd && end >= weekStart
  }).sort((a, b) => a.status - b.status)
}

// ========== 统计 (保留原有) ==========
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

watch(taskList, () => {
  computeStats.value
}, { immediate: true })

// ========== 数据获取 ==========
const fetchData = async () => {
  try {
    const taskRes = await axios.get('/api/tasks')
    taskList.value = taskRes.data.list || []
    const tagRes = await axios.get('/api/tags')
    tagList.value = tagRes.data.list || []
  } catch (err) {}
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.my-tasks-container {
  padding: 24px;
}

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

.month-bar strong { font-weight: 600; color: #1e293b; }
.month-bar-sep { color: #cbd5e1; margin: 0 2px; }

/* ===== 视图控制栏 ===== */
.view-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  min-width: 120px;
  text-align: center;
}

/* ===== 月历网格 ===== */
.month-grid {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.grid-header {
  display: grid;
  grid-template-columns: 110px 1fr;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.grid-corner {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  border-right: 1px solid #e2e8f0;
}

.day-header {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  width: calc(100% / 7);
  box-sizing: border-box;
}

/* 每行 */
.grid-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  border-bottom: 1px solid #f1f5f9;
}

.grid-row:last-child { border-bottom: none; }

.tag-cell {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  border-right: 1px solid #e2e8f0;
  background: #fafafa;
  display: flex;
  align-items: flex-start;
}

/* 泳道 */
.lane-cell {
  position: relative;
  overflow: hidden;
}

.lane {
  position: relative;
  min-height: 28px;
}

/* 背景周行 */
.week-bg {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 28px;
}

.day-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11px;
  color: #94a3b8;
}

.day-cell.other-month { color: #e2e8f0; }
.day-cell.is-today { background: #eff6ff; }
.day-cell.is-today .day-num {
  background: #3b82f6;
  color: #fff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

/* 任务条叠加层 */
.task-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.task-bar {
  position: absolute;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  cursor: pointer;
  pointer-events: auto;
  transition: opacity 0.15s;
  overflow: hidden;
  white-space: nowrap;
}

.task-bar:hover { opacity: 0.85; }

.bar-text {
  font-size: 11px;
  color: #fff;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}

.task-bar.status-0 { opacity: 0.8; }  /* 待启动 */
.task-bar.status-2 { opacity: 0.65; }  /* 已完成 */

/* 展开按钮 */
.expand-btn {
  position: absolute;
  bottom: 2px;
  right: 8px;
  font-size: 11px;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.expand-btn:hover { color: #2563eb; }

/* ===== 周列表 ===== */
.week-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.week-group {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 16px;
}

.week-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.week-task-count {
  font-size: 12px;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 8px;
}

.week-empty {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.week-card {
  padding: 12px 14px;
  border-left: 4px solid #6b7280;
  border-radius: 6px;
  background: #f8fafc;
  margin-bottom: 8px;
}

.week-card:last-child { margin-bottom: 0; }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.card-importance {
  font-weight: 500;
}

.card-dates {
  color: #94a3b8;
}

.card-target {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
