<template>
  <div class="content-page research-list-page">
    <div class="page-header">
      <h3>基本面研究</h3>
      <div class="filter-bar">
        <el-input
          v-model="searchText"
          placeholder="搜索公司名称"
          clearable
          prefix-icon="Search"
          style="width: 260px"
          @input="handleSearch"
        />
        <el-select
          v-model="tagFilter"
          placeholder="按标签筛选"
          clearable
          style="width: 160px"
        >
          <el-option
            v-for="t in tagList"
            :key="t.id"
            :label="t.name"
            :value="t.id"
          />
        </el-select>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredList.length === 0" class="empty-box">
      <el-icon :size="48" color="#64748b"><Document /></el-icon>
      <p>暂无研究记录</p>
      <p class="empty-hint">前往企业评估页，AI 评估后可一键写入基本面研究</p>
      <el-button type="primary" @click="$router.push('/invest/enterprise')">去企业评估</el-button>
    </div>

    <!-- 研究列表 -->
    <div v-else class="research-grid">
      <div
        v-for="(item, index) in filteredList"
        :key="item.id"
        :class="['research-card', { 'main-rise-card': item.isMainRise }]"
        @click="router.push(`${researchBase}/${item.id}`)"
      >
        <div class="card-header">
          <h4 class="company-name">{{ item.companyName }}</h4>
          <span v-if="item.companyCode" class="company-code">{{ item.companyCode }}</span>
          <span v-if="item.isMainRise" class="main-rise-badge">主升浪</span>
          <el-tag v-if="item.status === '持仓中'" size="small" type="success" effect="dark" class="status-tag">持仓中</el-tag>
          <el-tag v-else size="small" type="info" effect="plain" class="status-tag">观察中</el-tag>
        </div>
        <div class="card-body">
          <div v-if="item.tagsShow && item.tagsShow.length" class="tags-row">
            <el-tag v-for="tag in item.tagsShow" :key="tag" size="small" class="tag-chip">{{ tag }}</el-tag>
          </div>
          <div class="info-row">
            <span class="info-label">版本</span>
            <span class="version-badge">{{ item.currentVersion }}</span>
          </div>
          <div v-if="item.totalScore !== null" class="info-row">
            <span class="info-label">评分</span>
            <span class="score-value">{{ item.totalScore }}</span>
          </div>
          <div v-if="item.pros && item.pros.length" class="info-row">
            <span class="info-label">核心优势</span>
            <el-tooltip :content="item.prosText" placement="top" :width="360" :disabled="!item.prosText">
              <span class="info-text">{{ item.pros.slice(0, 2).join('、') }}{{ item.pros.length > 2 ? '...' : '' }}</span>
            </el-tooltip>
          </div>
          <div v-if="item.cons && item.cons.length" class="info-row">
            <span class="info-label">主要瑕疵</span>
            <el-tooltip :content="item.consText" placement="top" :width="360" :disabled="!item.consText">
              <span class="info-text cons-text">{{ item.cons.slice(0, 2).join('、') }}{{ item.cons.length > 2 ? '...' : '' }}</span>
            </el-tooltip>
          </div>
          <div class="info-row notes-row">
            <span class="info-label">补充分析</span>
            <el-tooltip :content="item.notesText" placement="top" :width="360" :disabled="!item.notesText">
              <span class="info-text notes-text">{{ item.notesText || '暂无' }}</span>
            </el-tooltip>
          </div>
          <div v-if="item.strategy" class="info-row strategy-row">
            <span class="info-label">策略</span>
            <el-tooltip :content="item.strategy" placement="top" :width="360" :disabled="!item.strategy">
              <span class="info-text">{{ item.strategy.length > 30 ? item.strategy.slice(0, 30) + '…' : item.strategy }}</span>
            </el-tooltip>
          </div>
          <div class="price-ref-section">
            <span class="info-label price-ref-label">价格参考</span>
            <div class="price-ref-values">
              <span>目标价：<span class="highlight-text">{{ item.targetPrice != null ? '¥' + Number(item.targetPrice).toFixed(2) : '--' }}</span></span>
              <span>击球区：<span class="highlight-text sweet-text">{{ item.sweetSpot || '--' }}</span></span>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <span class="update-time">{{ formatTime(item.updatedAt) }}</span>
          <div class="card-actions">
            <el-button text size="small" class="move-btn" :disabled="index === 0" @click.stop="handleMove(item, 'up')">
              <el-icon><Top /></el-icon>
            </el-button>
            <el-button text size="small" class="move-btn" :disabled="index === filteredList.length - 1" @click.stop="handleMove(item, 'down')">
              <el-icon><Bottom /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="handleDelete(item)">
              <el-icon><Delete /></el-icon>
            </el-button>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Document, ArrowRight, Delete, Top, Bottom } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const researchBase = computed(() =>
  route.path.startsWith('/about') ? '/about/research' : '/invest/research'
)

const searchText = ref('')
const loading = ref(false)
const list = ref([])
const tagFilter = ref('')
const tagList = ref([])

const filteredList = computed(() => {
  if (!tagFilter.value) return list.value
  const tagId = Number(tagFilter.value)
  return list.value.filter(item => (item.tags || []).map(Number).includes(tagId))
})

const fetchList = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchText.value.trim()) {
      params.keyword = searchText.value.trim()
    }
    const res = await axios.get('/api/invest/research', { params })
    if (res.data.code === 0) {
      list.value = (res.data.data || []).map(item => {
        item.tagsShow = (item.tags || []).map(id => {
          const t = tagList.value.find(x => Number(x.id) === Number(id))
          return t ? t.name : null
        }).filter(Boolean)
        item.isMainRise = item.tagsShow.some(t => t && t.includes('主升浪'))
        item.notesText = (item.userNotes || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        item.prosText = (item.pros || []).join('、')
        item.consText = (item.cons || []).join('、')
        return item
      })
    }
  } catch (err) {
    console.error('获取研究列表失败', err)
  } finally {
    loading.value = false
  }
}

const fetchTagList = async () => {
  try {
    const { data } = await axios.get('/api/tags')
    if (data.code === 0) tagList.value = data.data || []
  } catch (err) {
    tagList.value = []
  }
}

const handleSearch = () => {
  fetchList()
}

const handleDelete = (item) => {
  ElMessageBox.confirm(
    `确定删除「${item.companyName}」的所有研究记录吗？此操作不可撤销。`,
    '删除确认',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const res = await axios.delete(`/api/invest/research/${item.id}`)
      if (res.data.code === 0) {
        ElMessage.success('已删除')
        fetchList()
      }
    } catch (err) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

const handleMove = async (item, direction) => {
  try {
    const res = await axios.post(`/api/invest/research/${item.id}/move`, { direction })
    if (res.data.code === 0) {
      fetchList()
    }
  } catch (err) {
    ElMessage.error('调整顺序失败')
  }
}

const formatTime = (t) => {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

onMounted(async () => {
  await fetchTagList()
  fetchList()
})
</script>

<style scoped>
.research-list-page {
  min-height: 300px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h3 {
  margin: 0;
  color: #e2e8f0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
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
  margin: 12px 0 4px;
}

.empty-hint {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 20px;
}

.research-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.research-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.research-card:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
}

/* 主升浪特殊标记：整体高亮 + 金色光晕 */
.research-card.main-rise-card {
  border: 1.5px solid #f59e0b;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.6) 45%);
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.25);
}

.research-card.main-rise-card:hover {
  border-color: #fbbf24;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}

.main-rise-badge {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.company-name {
  margin: 0;
  font-size: 16px;
  color: #e2e8f0;
}

.company-code {
  font-size: 12px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.status-tag {
  margin-left: auto;
}

.card-body {
  margin-bottom: 16px;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag-chip {
  margin-right: 0;
  color: #e0f2fe;
  background-color: rgba(37, 99, 235, 0.45);
  border-color: rgba(147, 197, 253, 0.65);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: #64748b;
  min-width: 36px;
}

.price-ref-section {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}

.price-ref-label {
  margin-top: 2px;
}

.price-ref-values {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #cbd5e1;
}

.notes-text {
  color: #94a3b8;
}

.version-badge {
  color: #409eff;
  font-weight: bold;
  font-size: 13px;
}

.score-value {
  color: #22c55e;
  font-weight: bold;
  font-size: 16px;
}

.info-text {
  color: #cbd5e1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.notes-text {
  color: #94a3b8;
}

.cons-text {
  color: #f59e0b;
}

.highlight-text {
  color: #22c55e;
  font-weight: 600;
  font-size: 14px;
}

.sweet-text {
  color: #f59e0b;
}

.strategy-row .info-text {
  color: #818cf8;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #1e293b;
  padding-top: 12px;
}

.update-time {
  font-size: 12px;
  color: #64748b;
}

.card-footer .el-icon {
  font-size: 14px;
  color: #64748b;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-actions .el-button {
  color: #64748b;
}
.card-actions .el-button:hover {
  color: #ef4444;
}
.card-actions .el-button.move-btn:hover:not(.is-disabled) {
  color: #409eff;
}

/* ---- 移动端适配 ---- */
@media (max-width: 768px) {
  .research-list-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .filter-bar {
    width: 100%;
    flex-wrap: wrap;
  }

  .filter-bar :deep(.el-input) {
    width: 100% !important;
  }

  .filter-bar :deep(.el-select) {
    width: 100% !important;
  }

  .research-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .research-card {
    padding: 14px;
  }

  .company-name {
    font-size: 14px;
  }

  .card-body {
    margin-bottom: 12px;
  }

  .info-row {
    font-size: 12px;
  }

  .update-time {
    font-size: 11px;
  }
}
</style>
