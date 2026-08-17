<template>
  <div class="content-page industry-page">
    <div class="page-header">
      <div>
        <h3>看行业</h3>
        <p class="sub-title">A股行业板块行情 · 同花顺行业分类 · 行情来自申万行业指数</p>
      </div>
      <div class="toolbar">
        <el-date-picker
          v-model="selectedDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择交易日"
          clearable
          :disabled-date="disabledDate"
          style="width: 152px"
          @change="onDateChange"
        />
        <el-input
          v-model="searchText"
          placeholder="搜索板块 / 代码 / 领涨股"
          clearable
          prefix-icon="Search"
          style="width: 220px"
        />
        <el-button type="primary" :loading="loading" @click="refresh">
          <el-icon v-if="!loading"><Refresh /></el-icon>
          <span v-if="!loading">更新最新</span>
        </el-button>
      </div>
    </div>

    <!-- 统计条 -->
    <div class="stat-bar">
      <div class="stat-item">
        <span class="stat-label">板块总数</span>
        <span class="stat-value">{{ list.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">上涨</span>
        <span class="stat-value rise">{{ upCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">下跌</span>
        <span class="stat-value fall">{{ downCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">平盘</span>
        <span class="stat-value">{{ flatCount }}</span>
      </div>
      <div v-if="currentDate" class="stat-item update-time">
        <span class="stat-label">交易日</span>
        <span class="stat-value">{{ currentDate }}</span>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading && list.length === 0" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="errorMsg" class="empty-box">
      <el-icon :size="48" color="#64748b"><Warning /></el-icon>
      <p>{{ errorMsg }}</p>
      <el-button type="primary" @click="fetchList">重试</el-button>
    </div>

    <!-- 行情表格 -->
    <div v-else class="table-container">
      <el-table
        :data="filteredList"
        border
        stripe
        size="small"
        :default-sort="{ prop: 'changePct', order: 'descending' }"
        class="industry-table"
      >
        <el-table-column label="排名" width="64" align="center">
          <template #default="scope">
            <span class="rank-num">{{ scope.$index + 1 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="板块名称" min-width="150" fixed="left">
          <template #default="scope">
            <div class="board-cell">
              <span class="board-name">{{ scope.row.name }}</span>
              <span class="board-code">{{ scope.row.code }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="最新价" width="96" align="right" sortable :sort-method="numSort('price')">
          <template #default="scope">
            {{ scope.row.price != null ? scope.row.price.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="changePct" label="涨跌幅" width="92" align="right" sortable :sort-method="numSort('changePct')">
          <template #default="scope">
            <span :class="changeClass(scope.row.changePct)">{{ pctText(scope.row.changePct) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="change" label="涨跌额" width="92" align="right" sortable :sort-method="numSort('change')" class-name="hide-on-mobile">
          <template #default="scope">
            <span :class="changeClass(scope.row.change)">{{ numText(scope.row.change) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="turnoverRate" label="换手率" width="86" align="right" sortable :sort-method="numSort('turnoverRate')">
          <template #default="scope">
            {{ scope.row.turnoverRate != null ? scope.row.turnoverRate.toFixed(2) + '%' : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="涨/跌家数" width="100" align="center">
          <template #default="scope">
            <span class="up-count">{{ scope.row.upCount ?? '-' }}</span>
            <span class="divider">/</span>
            <span class="down-count">{{ scope.row.downCount ?? '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="领涨股" min-width="150">
          <template #default="scope">
            <div v-if="scope.row.leaderName" class="leader-cell">
              <span class="leader-name">{{ scope.row.leaderName }}</span>
              <span :class="changeClass(scope.row.leaderChangePct)">{{ pctText(scope.row.leaderChangePct) }}</span>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalMarketCap" label="总市值" width="110" align="right" sortable :sort-method="numSort('totalMarketCap')" class-name="hide-on-mobile">
          <template #default="scope">
            {{ scope.row.totalMarketCap != null ? amountText(scope.row.totalMarketCap) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="mainNetInflow" label="主力净流入" width="120" align="right" sortable :sort-method="numSort('mainNetInflow')">
          <template #default="scope">
            <span :class="changeClass(scope.row.mainNetInflow)">{{ netText(scope.row.mainNetInflow) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Refresh, Loading, Warning } from '@element-plus/icons-vue'

const list = ref([])
const loading = ref(false)
const errorMsg = ref('')
const searchText = ref('')
const selectedDate = ref('')
const dates = ref([])
const currentDate = ref('')

const dateSet = computed(() => new Set(dates.value.map(d => d.date)))
// 只允许选择库中已有的交易日
const disabledDate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return !dateSet.value.has(`${y}-${m}-${d}`)
}

const filteredList = computed(() => {
  const kw = searchText.value.trim().toLowerCase()
  if (!kw) return list.value
  return list.value.filter(item =>
    item.name.toLowerCase().includes(kw) ||
    (item.code || '').includes(kw) ||
    (item.leaderName || '').toLowerCase().includes(kw)
  )
})

const upCount = computed(() => list.value.filter(i => (i.changePct ?? 0) > 0).length)
const downCount = computed(() => list.value.filter(i => (i.changePct ?? 0) < 0).length)
const flatCount = computed(() => list.value.length - upCount.value - downCount.value)

const numSort = (prop) => (a, b) => {
  const av = a[prop], bv = b[prop]
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  return av - bv
}

const changeClass = (v) => {
  if (v == null || v === 0) return 'flat'
  return v > 0 ? 'rise' : 'fall'
}

const pctText = (v) => {
  if (v == null) return '-'
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(2) + '%'
}

const numText = (v) => {
  if (v == null) return '-'
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(2)
}

const netText = (v) => {
  if (v == null) return '-'
  const sign = v > 0 ? '+' : ''
  return sign + (v / 1e8).toFixed(2) + '亿'
}

const amountText = (v) => {
  if (v == null) return '-'
  return (v / 1e8).toFixed(1) + '亿'
}

const fetchDates = async () => {
  try {
    const res = await axios.get('/api/invest/industry/dates')
    if (res.data.code === 0) dates.value = res.data.data || []
  } catch (err) {
    console.error('获取交易日列表失败', err)
  }
}

const fetchList = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {}
    if (selectedDate.value) params.date = selectedDate.value
    const res = await axios.get('/api/invest/industry', { params })
    if (res.data.code === 0) {
      list.value = res.data.data || []
      currentDate.value = res.data.date || ''
    } else {
      errorMsg.value = res.data.message || '获取失败'
    }
  } catch (err) {
    console.error('获取行业板块失败', err)
    errorMsg.value = '获取行业板块数据失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 切换日期 / 清空日期回到最新
const onDateChange = () => fetchList()

// 更新最新：清除日期选择，触发惰性补采后展示最新交易日
const refresh = () => {
  selectedDate.value = ''
  fetchList()
}

onMounted(async () => {
  await fetchDates()
  fetchList()
})
</script>

<style scoped>
.industry-page {
  min-height: 300px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.page-header h3 {
  margin: 0;
  color: #e2e8f0;
}

.sub-title {
  margin: 4px 0 0;
  font-size: 12px;
  color: #64748b;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 统计条 */
.stat-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.stat-value.rise {
  color: #ef4444;
}

.stat-value.fall {
  color: #22c55e;
}

.update-time .stat-value {
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
}

/* 涨跌配色：红涨绿跌 */
.rise {
  color: #ef4444;
}

.fall {
  color: #22c55e;
}

.flat {
  color: #94a3b8;
}

/* Element Plus 表格深色主题 */
:deep(.el-table) {
  --el-table-bg-color: #0f172a;
  --el-table-tr-bg-color: #0f172a;
  --el-table-header-bg-color: #1e293b;
  --el-table-row-hover-bg-color: #1e293b;
  --el-table-border-color: #334155;
  --el-table-text-color: #cbd5e1;
  --el-table-header-text-color: #e2e8f0;
}

:deep(.el-table th.el-table__cell) {
  background-color: #1e293b !important;
}

:deep(.el-table .cell) {
  font-size: 13px;
}

.rank-num {
  color: #64748b;
}

.board-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.board-name {
  color: #e2e8f0;
  font-weight: 500;
}

.board-code {
  font-size: 11px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 0 4px;
  border-radius: 3px;
  align-self: flex-start;
}

.up-count {
  color: #ef4444;
}

.down-count {
  color: #22c55e;
}

.divider {
  color: #475569;
  margin: 0 2px;
}

.leader-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.leader-name {
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-muted {
  color: #475569;
}

.loading-box {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
}

.loading-box .el-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #409eff;
}

.empty-box {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
}

.empty-box p {
  margin: 12px 0 20px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .industry-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar {
    width: 100%;
    flex-wrap: wrap;
  }

  .toolbar :deep(.el-date-picker) {
    width: 140px !important;
  }

  .toolbar :deep(.el-input) {
    flex: 1;
    width: auto !important;
    min-width: 160px;
  }

  .stat-bar {
    gap: 16px;
    padding: 10px 14px;
  }

  .stat-item {
    gap: 4px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-value {
    font-size: 14px;
  }

  .table-container {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
