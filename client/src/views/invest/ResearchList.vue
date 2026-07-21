<template>
  <div class="content-page research-list-page">
    <div class="page-header">
      <h3>基本面研究</h3>
      <el-input
        v-model="searchText"
        placeholder="搜索公司名称"
        clearable
        prefix-icon="Search"
        style="width: 260px"
        @input="handleSearch"
      />
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="list.length === 0" class="empty-box">
      <el-icon :size="48" color="#64748b"><Document /></el-icon>
      <p>暂无研究记录</p>
      <p class="empty-hint">前往企业评估页，AI 评估后可一键写入基本面研究</p>
      <el-button type="primary" @click="$router.push('/invest/enterprise')">去企业评估</el-button>
    </div>

    <!-- 研究列表 -->
    <div v-else class="research-grid">
      <div
        v-for="item in list"
        :key="item.id"
        class="research-card"
        @click="router.push(`${researchBase}/${item.id}`)"
      >
        <div class="card-header">
          <h4 class="company-name">{{ item.companyName }}</h4>
          <span v-if="item.companyCode" class="company-code">{{ item.companyCode }}</span>
        </div>
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">版本</span>
            <span class="version-badge">{{ item.currentVersion }}</span>
          </div>
          <div v-if="item.totalScore !== null" class="info-row">
            <span class="info-label">评分</span>
            <span class="score-value">{{ item.totalScore }}</span>
          </div>
          <div v-if="item.pros && item.pros.length" class="info-row">
            <span class="info-label">优势</span>
            <span class="info-text">{{ item.pros.slice(0, 2).join('、') }}{{ item.pros.length > 2 ? '...' : '' }}</span>
          </div>
          <div v-if="item.cons && item.cons.length" class="info-row">
            <span class="info-label">瑕疵</span>
            <span class="info-text cons-text">{{ item.cons.slice(0, 2).join('、') }}{{ item.cons.length > 2 ? '...' : '' }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="update-time">{{ formatTime(item.updatedAt) }}</span>
          <div class="card-actions">
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
import { Loading, Document, ArrowRight, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const researchBase = computed(() =>
  route.path.startsWith('/about') ? '/about/research' : '/invest/research'
)

const searchText = ref('')
const loading = ref(false)
const list = ref([])

const fetchList = async () => {
  loading.value = true
  try {
    const params = {}
    if (searchText.value.trim()) {
      params.keyword = searchText.value.trim()
    }
    const res = await axios.get('/api/invest/research', { params })
    if (res.data.code === 0) {
      list.value = res.data.data
    }
  } catch (err) {
    console.error('获取研究列表失败', err)
  } finally {
    loading.value = false
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

const formatTime = (t) => {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

onMounted(fetchList)
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

.card-body {
  margin-bottom: 16px;
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

.cons-text {
  color: #f59e0b;
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

  .page-header :deep(.el-input) {
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
