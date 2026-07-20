<template>
  <div class="page-container">
    <!-- ============== 列表模式 ============== -->
    <template v-if="mode === 'list'">
      <div class="page-header">
        <h2 class="page-title">每日复盘</h2>
        <el-button type="primary" @click="openTodayReview">
          今日复盘
        </el-button>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-date-picker
          v-model="filterDate"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="筛选日期"
          clearable
          @change="fetchHistoryList"
        />
      </div>

      <!-- 表格 -->
      <div v-if="historyLoading" class="loading-text">加载中...</div>
      <div v-else-if="historyList.length === 0" class="empty-text">暂无复盘记录</div>
      <el-table v-else :data="filteredList" stripe class="review-table">
        <el-table-column label="日期" width="120">
          <template #default="{ row }">
            {{ formatDateStr(row.review_date) }}
          </template>
        </el-table-column>
        <el-table-column label="大盘感受" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.market_sentiment" size="small" effect="plain">
              {{ row.market_sentiment }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前主线" width="120">
          <template #default="{ row }">
            <span v-if="row.current_main_line" class="plan-tag">{{ row.current_main_line }}</span>
          </template>
        </el-table-column>
        <el-table-column label="信心指数" width="100">
          <template #default="{ row }">
            <span v-if="row.confidence_score" class="score-stars">{{ '★'.repeat(row.confidence_score) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作计划" width="100">
          <template #default="{ row }">
            <span v-if="row.action_plan" class="plan-tag">{{ row.action_plan }}</span>
          </template>
        </el-table-column>
        <el-table-column label="风险预警" min-width="140">
          <template #default="{ row }">
            <span v-if="row.risk_warnings && safeArray(row.risk_warnings).length" class="multi-tag">
              <el-tag v-for="w in safeArray(row.risk_warnings)" :key="w" size="small" type="danger" effect="plain" class="inline-tag">
                {{ w }}
              </el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="机会板块" min-width="140">
          <template #default="{ row }">
            <span v-if="row.opportunity_sectors && safeArray(row.opportunity_sectors).length" class="multi-tag">
              <el-tag v-for="s in safeArray(row.opportunity_sectors)" :key="s" size="small" type="success" effect="plain" class="inline-tag">
                {{ s }}
              </el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="仓位" width="100">
          <template #default="{ row }">
            <span v-if="row.position_feeling" class="plan-tag">{{ row.position_feeling }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" @click="openReview(row.review_date)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- ============== 复盘模式 ============== -->
    <template v-else>
      <div class="page-header">
        <el-button text @click="backToList">← 返回列表</el-button>
        <h2 class="page-title">{{ currentDate }} 复盘</h2>
      </div>

      <!-- 今日行情 -->
      <div class="market-section">
        <div class="section-header">
          <h3 class="section-title">今日行情</h3>
          <el-button text size="small" :icon="Refresh" @click="refreshMarket" :loading="marketLoading">
            刷新
          </el-button>
        </div>

        <div v-if="marketLoading" class="loading-text">加载行情中...</div>
        <div v-else-if="noMarketData" class="empty-text">
          非交易日，暂无行情数据（仍可记录复盘）
        </div>
        <template v-else>
          <div class="indices-grid">
            <div
              v-for="idx in market.indices"
              :key="idx.title"
              class="index-card"
              :class="changeClass(idx.change)"
            >
              <div class="index-name">{{ idx.title }}</div>
              <div class="index-price">{{ idx.price > 0 ? idx.price.toFixed(2) : '--' }}</div>
              <div class="index-change">{{ idx.quote ? formatChange(idx.change, idx.changePct) : '--' }}</div>
              <div class="index-volume">成交 {{ formatAmount(idx.quote?.amount || 0) }}</div>
            </div>
          </div>

          <div class="market-meta">
            <div class="meta-item">
              <span class="meta-label">A股全市场成交</span>
              <span class="meta-value">{{ formatAmount(market.totalVolume) }}</span>
            </div>
          </div>

          <div v-if="market.watchlist && market.watchlist.length > 0" class="watchlist-section">
            <div class="section-subtitle">关注个股</div>
            <div class="watchlist-grid">
              <div
                v-for="item in market.watchlist"
                :key="item.title"
                class="watchlist-item"
                :class="changeClass(item.change)"
              >
                <span class="wl-name">{{ item.title }}</span>
                <span class="wl-price">{{ item.price > 0 ? item.price.toFixed(2) : '--' }}</span>
                <span class="wl-change">{{ item.quote ? formatChange(item.change, item.changePct) : '--' }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 复盘表单 -->
      <div class="review-form">
        <h3 class="section-title">复盘记录</h3>

        <div class="form-grid">
          <div class="form-field">
            <label class="field-label">大盘感受</label>
            <el-select v-model="form.market_sentiment" placeholder="选择大盘感受" clearable class="field-control">
              <el-option v-for="opt in configOptions.market_sentiment" :key="opt.id" :label="opt.label" :value="opt.label" />
            </el-select>
          </div>
          <div class="form-field">
            <label class="field-label">当前主线</label>
            <el-select v-model="form.current_main_line" placeholder="选择当前主线" clearable class="field-control">
              <el-option v-for="opt in configOptions.current_main_line" :key="opt.id" :label="opt.label" :value="opt.label" />
            </el-select>
          </div>
          <div class="form-field">
            <label class="field-label">操作计划</label>
            <el-select v-model="form.action_plan" placeholder="选择操作计划" clearable class="field-control">
              <el-option v-for="opt in configOptions.action_plan" :key="opt.id" :label="opt.label" :value="opt.label" />
            </el-select>
          </div>
          <div class="form-field">
            <label class="field-label">仓位感受</label>
            <el-select v-model="form.position_feeling" placeholder="选择仓位感受" clearable class="field-control">
              <el-option v-for="opt in configOptions.position_feeling" :key="opt.id" :label="opt.label" :value="opt.label" />
            </el-select>
          </div>
          <div class="form-field">
            <label class="field-label">信心指数</label>
            <el-rate v-model="form.confidence_score" :max="5" show-score class="field-rate" />
          </div>
        </div>

        <div class="form-section-block">
          <label class="field-label">风险预警</label>
          <el-checkbox-group v-model="form.risk_warnings" class="tag-group">
            <el-checkbox v-for="opt in configOptions.risk_warning" :key="opt.id" :label="opt.label" class="tag-checkbox">
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="form-section-block">
          <label class="field-label">机会板块</label>
          <el-checkbox-group v-model="form.opportunity_sectors" class="tag-group">
            <el-checkbox v-for="opt in configOptions.opportunity_sector" :key="opt.id" :label="opt.label" class="tag-checkbox">
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="form-section-block">
          <label class="field-label">自由感想</label>
          <el-input v-model="form.free_notes" type="textarea" :rows="4" placeholder="写下你对今天市场的感悟..." class="field-textarea" />
        </div>

        <div class="form-actions">
          <el-button type="primary" @click="handleSave" :loading="saving">保存复盘</el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

const mode = ref('list')
const currentDate = ref('')
const filterDate = ref('')

const market = ref({ indices: [], watchlist: [], totalVolume: 0 })
const marketLoading = ref(false)
const noMarketData = ref(false)

const configOptions = reactive({
  market_sentiment: [],
  current_main_line: [],
  risk_warning: [],
  opportunity_sector: [],
  action_plan: [],
  position_feeling: [],
})

const form = reactive({
  market_sentiment: '',
  current_main_line: '',
  risk_warnings: [],
  opportunity_sectors: [],
  action_plan: '',
  position_feeling: '',
  confidence_score: 0,
  free_notes: '',
})

const saving = ref(false)
const historyList = ref([])
const historyLoading = ref(false)

const filteredList = computed(() => {
  if (!filterDate.value) return historyList.value
  return historyList.value.filter(item => item.review_date === filterDate.value)
})

const changeClass = (change) => {
  if (!change || change === 0) return ''
  return change > 0 ? 'up' : 'down'
}

const formatChange = (change, pct) => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}（${sign}${pct.toFixed(2)}%）`
}

const formatAmount = (amount) => {
  if (!amount) return '--'
  if (amount >= 1e8) return (amount / 1e8).toFixed(1) + '亿'
  if (amount >= 1e4) return (amount / 1e4).toFixed(1) + '万'
  return Math.round(amount).toString()
}

const safeArray = (val) => {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

async function loadConfigOptions() {
  const groups = ['market_sentiment', 'current_main_line', 'risk_warning', 'opportunity_sector', 'action_plan', 'position_feeling']
  for (const key of groups) {
    try {
      const { data } = await axios.get(`/api/review-config/${key}`)
      if (data.code === 0) configOptions[key] = data.data
    } catch { /* ignore */ }
  }
}

async function fetchHistoryList() {
  historyLoading.value = true
  try {
    const { data } = await axios.get('/api/invest/review')
    if (data.code === 0) {
      historyList.value = data.data.map(r => ({ ...r, review_date: formatDateStr(r.review_date) }))
    }
  } catch { /* ignore */ }
  finally { historyLoading.value = false }
}

async function loadTodayMarket() {
  marketLoading.value = true
  noMarketData.value = false
  try {
    const { data } = await axios.get('/api/invest/review/today')
    if (data.code === 0) {
      market.value = data.data.market || { indices: [], watchlist: [], totalVolume: 0 }
      noMarketData.value = market.value.indices.length === 0 || market.value.indices.every(i => i.price === 0)
      if (data.data.review) fillForm(data.data.review)
      else resetForm()
    }
  } catch (err) {
    ElMessage.error('获取今日数据失败')
  } finally {
    marketLoading.value = false
  }
}

function fillForm(review) {
  form.market_sentiment = review.market_sentiment || ''
  form.current_main_line = review.current_main_line || ''
  form.risk_warnings = safeArray(review.risk_warnings)
  form.opportunity_sectors = safeArray(review.opportunity_sectors)
  form.action_plan = review.action_plan || ''
  form.position_feeling = review.position_feeling || ''
  form.confidence_score = review.confidence_score || 0
  form.free_notes = review.free_notes || ''
}

function resetForm() {
  form.market_sentiment = ''
  form.current_main_line = ''
  form.risk_warnings = []
  form.opportunity_sectors = []
  form.action_plan = ''
  form.position_feeling = ''
  form.confidence_score = 0
  form.free_notes = ''
}

function openTodayReview() {
  mode.value = 'review'
  currentDate.value = getTodayStr()
  loadTodayMarket()
}

function backToList() {
  mode.value = 'list'
  fetchHistoryList()
}

async function openReview(date) {
  currentDate.value = formatDateStr(date)
  mode.value = 'review'
  marketLoading.value = true
  noMarketData.value = false
  try {
    const { data } = await axios.get(`/api/invest/review/${currentDate.value}`)
    if (data.data.market_snapshot) {
      market.value = typeof data.data.market_snapshot === 'string'
        ? JSON.parse(data.data.market_snapshot)
        : data.data.market_snapshot
      noMarketData.value = false
    } else {
      market.value = { indices: [], watchlist: [], totalVolume: 0 }
      noMarketData.value = true
    }
    fillForm(data.data)
  } catch (err) {
    if (err.response?.status === 404) {
      resetForm()
      market.value = { indices: [], watchlist: [], totalVolume: 0 }
      noMarketData.value = true
    } else {
      console.error('[DailyReview] load error:', err)
      market.value = { indices: [], watchlist: [], totalVolume: 0 }
      noMarketData.value = true
      resetForm()
    }
  } finally {
    marketLoading.value = false
  }
}

function getTodayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateStr(val) {
  if (!val) return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function refreshMarket() {
  if (currentDate.value === getTodayStr()) {
    await loadTodayMarket()
  } else {
    marketLoading.value = true
    noMarketData.value = false
    try {
      const { data } = await axios.get(`/api/invest/review/${currentDate.value}`)
      if (data.data && data.data.market_snapshot) {
        market.value = typeof data.data.market_snapshot === 'string'
          ? JSON.parse(data.data.market_snapshot)
          : data.data.market_snapshot
        noMarketData.value = false
      } else {
        noMarketData.value = true
      }
    } catch {
      noMarketData.value = true
    } finally {
      marketLoading.value = false
    }
  }
}

async function handleSave() {
  if (!form.market_sentiment && form.risk_warnings.length === 0 && form.opportunity_sectors.length === 0 && !form.free_notes) {
    ElMessage.warning('至少填写一项内容')
    return
  }
  saving.value = true
  try {
    const payload = { ...form, market_snapshot: noMarketData.value ? null : market.value }
    const { data } = await axios.put(`/api/invest/review/${currentDate.value}`, payload)
    if (data.code === 0) {
      ElMessage.success('保存成功')
      backToList()
    }
  } catch (err) {
    ElMessage.error('保存失败: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadConfigOptions(), fetchHistoryList()])
})
</script>

<style scoped>
.page-container { padding: 12px; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
}

.filter-bar {
  margin-bottom: 12px;
}
.filter-bar .el-date-picker {
  width: 160px;
}

/* 表格 */
.review-table { width: 100%; }
:deep(.el-table) {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #cbd5e1;
}
:deep(.el-table th.el-table__cell) {
  background: #1e293b;
  color: #94a3b8;
}
:deep(.el-table tr) { background: #0f172a; }
:deep(.el-table tr:hover > td) { background: #1a2332; }
:deep(.el-table td.el-table__cell) { border-bottom-color: #334155; }
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) { background: #111d2b; }
:deep(.el-table__body tr.el-table__row--striped:hover td) { background: #1a2332; }
.score-stars { color: #fbbf24; font-size: 13px; }
.plan-tag {
  font-size: 12px;
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
  padding: 1px 8px;
  border-radius: 4px;
  white-space: nowrap;
}
.multi-tag { display: flex; gap: 4px; flex-wrap: wrap; }
.inline-tag { margin: 0; }

.loading-text, .empty-text {
  color: #94a3b8;
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}

/* 行情卡片 */
.market-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}
.section-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 8px;
}
.indices-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.index-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s;
}
.index-card.up { border-left: 3px solid #ef4444; }
.index-card.down { border-left: 3px solid #22c55e; }
.index-name { font-size: 13px; color: #94a3b8; margin-bottom: 4px; }
.index-price { font-size: 20px; font-weight: 700; color: #e2e8f0; }
.index-card.up .index-price { color: #ef4444; }
.index-card.down .index-price { color: #22c55e; }
.index-change { font-size: 12px; margin: 2px 0; }
.index-card.up .index-change { color: #ef4444; }
.index-card.down .index-change { color: #22c55e; }
.index-volume { font-size: 11px; color: #64748b; }

.market-meta {
  display: flex;
  gap: 20px;
  padding: 8px 12px;
  background: #1e293b;
  border-radius: 6px;
  margin-bottom: 12px;
}
.meta-item { display: flex; gap: 6px; align-items: center; }
.meta-label { font-size: 12px; color: #94a3b8; }
.meta-value { font-size: 14px; font-weight: 600; color: #e2e8f0; }

.watchlist-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.watchlist-item {
  display: flex; gap: 8px; align-items: center;
  background: #1e293b; border: 1px solid #334155;
  border-radius: 6px; padding: 8px 12px; font-size: 13px;
}
.watchlist-item.up .wl-price, .watchlist-item.up .wl-change { color: #ef4444; }
.watchlist-item.down .wl-price, .watchlist-item.down .wl-change { color: #22c55e; }
.wl-name { color: #94a3b8; }
.wl-price { font-weight: 600; color: #e2e8f0; }
.wl-change { font-size: 12px; }

/* 表单 */
.review-form {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.review-form .section-title { margin-bottom: 16px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.form-field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 500; color: #cbd5e1; }
.field-control { width: 100%; }
.field-rate { padding: 4px 0; }
:deep(.el-rate__icon) { font-size: 18px; }
.form-section-block { margin-bottom: 16px; }
.form-section-block .field-label { display: block; margin-bottom: 8px; }
.tag-group { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-checkbox { margin-right: 0; }
:deep(.el-checkbox__label) { font-size: 13px; }
.field-textarea { width: 100%; }
.form-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
</style>
