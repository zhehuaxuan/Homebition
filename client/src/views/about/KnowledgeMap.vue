<template>
  <div class="knowledge-map">
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading" :size="28"><Loading /></el-icon>
    </div>

    <template v-else>
      <!-- 顶部 -->
      <div class="top-bar">
        <div>
          <h2 class="page-title">AI Agent</h2>
          <p class="sub-title">7 模块 × 9 层级 · 当前总进度 {{ masteredCount }}/{{ totalCount }}</p>
        </div>
        <div class="overall-level">
          <span class="overall-label">当前总Level</span>
          <span class="overall-value">{{ overallLevel.code }}</span>
          <span class="overall-name">{{ overallLevel.name }}</span>
        </div>
      </div>

      <!-- 进度概览 -->
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        <span class="progress-text">{{ masteredCount }} / {{ totalCount }} 已掌握 · {{ progressPct }}%</span>
      </div>

      <!-- 矩阵 -->
      <div class="matrix-wrap">
        <!-- 表头：L1~L9（按层级深浅点亮，直观看出 L9 的颜色） -->
        <div class="matrix-header">
          <div class="corner"></div>
          <div
            v-for="lv in levels"
            :key="lv.code"
            class="col-head"
            :style="colHeadStyle(lv)"
          >
            <span class="col-code">{{ lv.code }}</span>
            <span class="col-name">{{ lv.name }}</span>
          </div>
        </div>

        <!-- 每行：模块 -->
        <div
          v-for="mod in modules"
          :key="mod.code"
          class="matrix-row"
        >
          <div class="row-label">
            <span class="row-code">{{ mod.code }}</span>
            <span class="row-name">{{ mod.name }}</span>
            <span class="row-cur" :class="{ 'is-zero': !mod.currentLevel }">
              {{ mod.currentLevel ? mod.currentLevel.code : '未起步' }}
            </span>
          </div>
          <div class="row-cells">
            <div
              v-for="lv in levels"
              :key="lv.code"
              class="cell"
              :class="cellClass(mod, lv)"
              :style="cellStyle(mod, lv)"
              @mouseenter="hovered = cellOf(mod, lv)"
              @mouseleave="hovered = null"
            >
              <span v-if="cellOf(mod, lv)?.is_mastered" class="cell-check">✓</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 悬浮详情（常驻吸顶，避免 hover 时高度跳动造成页面震动） -->
      <div class="detail-card">
        <template v-if="hovered">
          <div class="detail-head">
            <span class="detail-tag">{{ hovered.module_code }} · {{ hovered.level_name }}</span>
            <span :class="['detail-status', hovered.is_mastered ? 'is-on' : 'is-off']">
              {{ hovered.is_mastered ? '✓ 已掌握' : '未掌握' }}
            </span>
          </div>
          <div class="detail-section">
            <span class="detail-key">掌握标准</span>
            <p class="detail-val">{{ hovered.criterion || '—' }}</p>
          </div>
          <div v-if="hovered.time_bound" class="detail-section">
            <span class="detail-key">时限</span>
            <p class="detail-val">{{ hovered.time_bound }}</p>
          </div>
          <div v-if="hovered.remark" class="detail-section">
            <span class="detail-key">备注</span>
            <p class="detail-val">{{ hovered.remark }}</p>
          </div>
        </template>
        <div v-else class="detail-placeholder">悬停矩阵格子查看掌握标准</div>
      </div>

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <span class="legend-cell lit" :style="{ background: depthColor(0.3) }"></span>
          <span>已掌握</span>
        </div>
        <div class="legend-item">
          <span class="legend-cell lit" :style="{ background: depthColor(0.9) }"></span>
          <span>颜色越深 = 层级越高</span>
        </div>
        <div class="legend-item">
          <span class="legend-cell dim"></span>
          <span>未掌握</span>
        </div>
        <div class="legend-item">
          <span class="legend-cell current"></span>
          <span>橙色边框 = 模块当前Level</span>
        </div>
      </div>

      <!-- 掌握标准明细表：按模块分组列出全部节点 -->
      <div class="detail-list">
        <h3 class="detail-list-title">掌握标准明细</h3>
        <div
          v-for="mod in modules"
          :key="mod.code"
          class="module-group"
        >
          <div class="module-group-head">
            <span class="mg-code">{{ mod.code }}</span>
            <span class="mg-name">{{ mod.name }}</span>
            <span class="mg-cur">当前：{{ mod.currentLevel ? mod.currentLevel.code + ' ' + mod.currentLevel.name : '未起步' }}</span>
          </div>
          <p v-if="mod.overview" class="module-overview">{{ mod.overview }}</p>
          <div class="module-rows">
            <div
              v-for="lv in levels"
              :key="lv.code"
              class="module-row-item"
              :class="{ 'is-mastered': cellOf(mod, lv)?.is_mastered, 'is-current': mod.currentLevel && mod.currentLevel.code === lv.code }"
            >
              <span class="mr-level" :style="{ background: depthColor(lv.depth) }">{{ lv.code }}</span>
              <span class="mr-name">{{ lv.name }}</span>
              <span class="mr-criterion">{{ cellOf(mod, lv)?.criterion || '—' }}</span>
              <span v-if="cellOf(mod, lv)?.time_bound" class="mr-time">{{ cellOf(mod, lv).time_bound }}</span>
              <span class="mr-status">{{ cellOf(mod, lv)?.is_mastered ? '✓' : '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const loading = ref(true)
const rows = ref([])
const hovered = ref(null)

// 9 层级定义：depth 0→1，用于背景色加深
const levels = [
  { code: 'L1', name: '知晓', depth: 0.12 },
  { code: 'L2', name: '记忆', depth: 0.22 },
  { code: 'L3', name: '理解', depth: 0.32 },
  { code: 'L4', name: '关联', depth: 0.42 },
  { code: 'L5', name: '应用', depth: 0.52 },
  { code: 'L6', name: '分析', depth: 0.62 },
  { code: 'L7', name: '评判', depth: 0.72 },
  { code: 'L8', name: '创造', depth: 0.85 },
  { code: 'L9', name: '参透', depth: 1.0 },
]

// 行 → 模块聚合
const modules = computed(() => {
  const map = new Map()
  for (const r of rows.value) {
    if (!map.has(r.module_code)) {
      map.set(r.module_code, { code: r.module_code, name: r.module_name, levels: {}, overview: r.overview || '' })
    }
    map.get(r.module_code).levels[r.level_code] = r
  }
  const list = [...map.values()]
  for (const m of list) {
    let cur = null
    for (const lv of levels) {
      const cell = m.levels[lv.code]
      if (cell && cell.is_mastered) cur = lv
    }
    m.currentLevel = cur
  }
  return list
})

const totalCount = computed(() => rows.value.length)
const masteredCount = computed(() => rows.value.filter(r => r.is_mastered).length)
const progressPct = computed(() => totalCount.value ? Math.round(masteredCount.value / totalCount.value * 100) : 0)

// 总体当前 Level：取所有模块已掌握层级中的最低值（短板决定整体）
const overallLevel = computed(() => {
  let lowest = null
  for (const m of modules.value) {
    if (!m.currentLevel) return { code: 'L0', name: '未起步' }
    if (!lowest || levels.findIndex(l => l.code === m.currentLevel.code) < levels.findIndex(l => l.code === lowest.code)) {
      lowest = m.currentLevel
    }
  }
  return lowest || { code: 'L0', name: '未起步' }
})

const cellOf = (mod, lv) => mod.levels[lv.code]

const cellClass = (mod, lv) => {
  const c = cellOf(mod, lv)
  return {
    'is-lit': c && c.is_mastered,
    'is-dim': !c || !c.is_mastered,
    'is-current': mod.currentLevel && mod.currentLevel.code === lv.code,
  }
}

// 点亮格子背景色：L1 浅蓝 → L9 深靛，随层级加深
const depthColor = (depth) => {
  const hue = 215
  const light = 72 - depth * 46   // 72% → 26%
  const sat = 68 + depth * 22     // 68% → 90%
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

const cellStyle = (mod, lv) => {
  const c = cellOf(mod, lv)
  if (c && c.is_mastered) {
    return { background: depthColor(lv.depth) }
  }
  return {}
}

// 表头方块：按层级浅→深点亮，文字色随深度反转保证可读
const colHeadStyle = (lv) => {
  const bg = depthColor(lv.depth)
  // 深度 ≥ 0.5 时背景已较深，文字用白色
  const fg = lv.depth >= 0.5 ? '#f8fafc' : '#1e293b'
  return { background: bg, color: fg, borderColor: 'transparent' }
}

const fetchMap = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/knowledge-map')
    if (res.data.code === 0) rows.value = res.data.data || []
  } catch {
    ElMessage.error('获取 AI Agent 数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchMap)
</script>

<style scoped>
.knowledge-map {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
  min-height: calc(100vh - 60px);
  background: #f8fafc;
}

.loading-box {
  display: flex;
  justify-content: center;
  padding: 100px 0;
  color: #94a3b8;
}
.loading-box .el-icon { color: #409eff; }

/* 顶部 */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.3px;
}
.sub-title {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
.overall-level {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 10px 18px;
}
.overall-label {
  font-size: 12px;
  color: #64748b;
}
.overall-value {
  font-size: 24px;
  font-weight: 700;
  color: #2563eb;
}
.overall-name {
  font-size: 13px;
  color: #1e40af;
}

/* 进度条 */
.progress-bar {
  position: relative;
  height: 24px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #60a5fa, #22c55e);
  border-radius: 12px 0 0 12px;
  transition: width 0.5s ease;
}
.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #1e293b;
  font-weight: 600;
}

/* 矩阵 */
.matrix-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.matrix-header {
  display: grid;
  grid-template-columns: 150px repeat(9, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}
.corner { background: transparent; }
.col-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0;
  border-radius: 6px;
  background: #f1f5f9;
}
.col-code {
  font-size: 12px;
  font-weight: 700;
  color: inherit;
}
.col-name {
  font-size: 11px;
  color: inherit;
  opacity: 0.85;
}

.matrix-row {
  display: grid;
  grid-template-columns: 150px repeat(9, 1fr);
  gap: 6px;
  margin-bottom: 6px;
}
.matrix-row:last-child { margin-bottom: 0; }

.row-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  background: #f8fafc;
  border-radius: 6px;
}
.row-code {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  flex-shrink: 0;
}
.row-name {
  font-size: 12px;
  color: #334155;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-cur {
  font-size: 11px;
  color: #d97706;
  font-weight: 600;
  flex-shrink: 0;
}
.row-cur.is-zero { color: #cbd5e1; }

.row-cells {
  display: contents;
}

.cell {
  height: 48px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 1px solid #f1f5f9;
}
.cell.is-dim {
  background: #f8fafc;
  border-color: #e2e8f0;
}
.cell.is-lit {
  border-color: transparent;
}
.cell.is-current {
  border: 2px solid #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}
.cell:hover {
  transform: scale(1.1);
  z-index: 2;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.cell-check {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 2px rgba(0,0,0,0.25);
}

/* 悬浮详情卡 */
.detail-card {
  position: sticky;
  top: 8px;
  z-index: 10;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  height: 180px;
  overflow-y: auto;
}
.detail-placeholder {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  padding: 56px 0;
}
.detail-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.detail-tag {
  font-size: 12px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  padding: 3px 10px;
  border-radius: 4px;
}
.detail-status {
  font-size: 12px;
  font-weight: 500;
}
.detail-status.is-on { color: #16a34a; }
.detail-status.is-off { color: #94a3b8; }
.detail-section { margin-bottom: 8px; }
.detail-section:last-child { margin-bottom: 0; }
.detail-key {
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.detail-val {
  margin: 4px 0 0;
  font-size: 13px;
  color: #334155;
  line-height: 1.6;
}

/* 图例 */
.legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 8px 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
}
.legend-cell {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}
.legend-cell.dim {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.legend-cell.current {
  background: #f8fafc;
  border: 2px solid #f59e0b;
}

/* 掌握标准明细表 */
.detail-list {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.detail-list-title {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}
.module-group {
  margin-bottom: 18px;
}
.module-group:last-child { margin-bottom: 0; }
.module-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  margin-bottom: 6px;
  border-bottom: 2px solid #eff6ff;
}
.mg-code {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
}
.mg-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}
.mg-cur {
  margin-left: auto;
  font-size: 12px;
  color: #d97706;
  font-weight: 600;
}
.module-overview {
  margin: 0 0 8px;
  padding: 8px 12px;
  background: #eff6ff;
  border-left: 3px solid #2563eb;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}
.module-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.module-row-item {
  display: grid;
  grid-template-columns: 32px 48px 1fr auto 24px;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 6px;
  background: #f8fafc;
  font-size: 13px;
  transition: background 0.15s;
}
.module-row-item.is-mastered {
  background: #ecfdf5;
}
.module-row-item.is-current {
  outline: 2px solid #f59e0b;
  outline-offset: -2px;
}
.mr-level {
  width: 28px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}
.mr-name {
  font-size: 12px;
  color: #475569;
}
.mr-criterion {
  color: #334155;
  line-height: 1.5;
}
.mr-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.mr-status {
  color: #16a34a;
  font-weight: 700;
  text-align: right;
}

/* 移动端 */
@media (max-width: 768px) {
  .knowledge-map { padding: 16px; }
  .matrix-header,
  .matrix-row {
    grid-template-columns: 90px repeat(9, 1fr);
    gap: 3px;
  }
  .col-name { display: none; }
  .row-name { display: none; }
  .cell { height: 38px; }
  .overall-value { font-size: 20px; }
  .module-row-item {
    grid-template-columns: 28px 40px 1fr 20px;
  }
  .mr-time { display: none; }
}
</style>
