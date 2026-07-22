<template>
  <div class="enterprise-page">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item :to="{ path: '/invest' }">投资频道</el-breadcrumb-item>
      <el-breadcrumb-item>企业评估</el-breadcrumb-item>
    </el-breadcrumb>

    <div class="search-container">
      <el-input
        v-model="searchText"
        :placeholder="placeholder"
        clearable
        :disabled="loading || evaluating"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" :loading="loading" :disabled="evaluating" @click="handleSearch">搜索</el-button>
    </div>

    <div v-if="confirmInfo" class="confirm-box">
      <p class="confirm-text">
        您要评估的公司是否是 <strong>{{ confirmInfo.name }}</strong>
        <span v-if="confirmInfo.code" class="company-code">（{{ confirmInfo.code }}）</span>？
      </p>
      <div class="confirm-actions">
        <el-button type="primary" :disabled="evaluating" @click="handleConfirm">
          {{ evaluating ? '评估中...' : '是，开始评估' }}
        </el-button>
        <el-button :disabled="evaluating" @click="handleCancel">否，重新输入</el-button>
      </div>
    </div>

    <div v-if="errorMsg" class="error-box">
      <p>{{ errorMsg }}</p>
      <el-button type="primary" link @click="handleRetry">重新输入</el-button>
    </div>

    <div v-if="evaluating" class="evaluating-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在评估，请稍候...</p>
    </div>

    <div v-if="evaluationData" class="result-box">
      <!-- 综合评分卡片 -->
      <div class="score-card">
        <div class="score-main">
          <div class="score-value">{{ evaluationData.totalScore }}</div>
          <div class="score-label">综合评分</div>
        </div>
        <div class="score-detail">
          <div class="score-item">
            <span class="label">行业维度</span>
            <span class="value">{{ evaluationData.industryScore }}</span>
            <span class="weight">权重 60%</span>
          </div>
          <div class="score-item">
            <span class="label">公司维度</span>
            <span class="value">{{ evaluationData.companyScore }}</span>
            <span class="weight">权重 40%</span>
          </div>
        </div>
      </div>

      <!-- 优劣势概览 -->
      <div class="overview-section">
        <div class="pros-box">
          <h4><span class="icon">✅</span> 核心优势</h4>
          <ul>
            <li v-for="(pro, index) in evaluationData.pros" :key="'pro-' + index">{{ pro }}</li>
          </ul>
        </div>
        <div class="cons-box">
          <h4><span class="icon">⚠️</span> 主要瑕疵</h4>
          <ul>
            <li v-for="(con, index) in evaluationData.cons" :key="'con-' + index">{{ con }}</li>
          </ul>
        </div>
      </div>

      <!-- 行业维度评估 -->
      <div class="evaluation-section">
        <h3>一、选行业维度评估（权重 60%）</h3>
        <div class="desktop-table">
          <el-table :data="evaluationData.industryItems" border stripe size="small">
            <el-table-column prop="指标" label="评估指标" width="180" />
            <el-table-column prop="权重" label="权重" width="80" align="center" />
            <el-table-column prop="得分" label="得分" width="80" align="center">
              <template #default="scope">
                <span class="score-badge">{{ scope.row.得分 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="依据" label="打分依据" />
          </el-table>
        </div>
        <div class="mobile-cards">
          <div v-for="(item, index) in evaluationData.industryItems" :key="'ind-mobile-' + index" class="mobile-card">
            <div class="mobile-card-row">
              <span class="mobile-card-label">评估指标</span>
              <span class="mobile-card-value">{{ item.指标 }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">权重</span>
              <span class="mobile-card-value">{{ item.权重 }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">得分</span>
              <span class="mobile-card-value"><span class="score-badge">{{ item.得分 }}</span></span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">打分依据</span>
              <span class="mobile-card-value">{{ item.依据 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 公司维度评估 -->
      <div class="evaluation-section">
        <h3>二、选公司维度评估（权重 40%）</h3>
        <div class="desktop-table">
          <el-table :data="evaluationData.companyItems" border stripe size="small">
            <el-table-column prop="指标" label="评估指标" width="180" />
            <el-table-column prop="权重" label="权重" width="80" align="center" />
            <el-table-column prop="得分" label="得分" width="80" align="center">
              <template #default="scope">
                <span class="score-badge">{{ scope.row.得分 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="依据" label="打分依据" />
          </el-table>
        </div>
        <div class="mobile-cards">
          <div v-for="(item, index) in evaluationData.companyItems" :key="'comp-mobile-' + index" class="mobile-card">
            <div class="mobile-card-row">
              <span class="mobile-card-label">评估指标</span>
              <span class="mobile-card-value">{{ item.指标 }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">权重</span>
              <span class="mobile-card-value">{{ item.权重 }}</span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">得分</span>
              <span class="mobile-card-value"><span class="score-badge">{{ item.得分 }}</span></span>
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">打分依据</span>
              <span class="mobile-card-value">{{ item.依据 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 综合评价 -->
      <div class="summary-section">
        <h3>三、综合评价</h3>
        <p class="summary-text">{{ evaluationData.summary }}</p>
      </div>

      <!-- 交易策略 -->
      <div class="strategy-section">
        <h3>四、交易策略建议</h3>
        <p class="strategy-text">{{ evaluationData.strategy }}</p>
      </div>

      <div class="result-actions">
        <el-button type="primary" :loading="saving" @click="handleSave">保存到基本面研究</el-button>
        <el-button @click="handleReset">评估其他公司</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const searchText = ref('')
const placeholder = '请输入上市公司的名称或者代码'
const loading = ref(false)
const confirmInfo = ref(null)
const errorMsg = ref('')
const evaluating = ref(false)
const saving = ref(false)
const evaluationData = ref(null)
const savedCompanyInfo = ref(null)

const handleSearch = async () => {
  if (!searchText.value.trim()) {
    ElMessage.warning('请输入公司名称或代码')
    return
  }

  loading.value = true
  confirmInfo.value = null
  errorMsg.value = ''
  evaluationData.value = ''

  try {
    const res = await axios.post('/api/invest/verify-company', {
      query: searchText.value.trim()
    })

    if (res.data.code === 0) {
      const { isCompany, name, code } = res.data.data
      if (isCompany === 'true') {
        confirmInfo.value = { name, code: code || '' }
      } else {
        errorMsg.value = '您输入的公司不正确，请重试~'
      }
    } else {
      errorMsg.value = res.data.message || '验证失败，请稍后重试'
    }
  } catch (err) {
    console.error('验证失败', err)
    errorMsg.value = '验证失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const handleConfirm = async () => {
  const companyInfo = confirmInfo.value
  if (!companyInfo) return

  evaluating.value = true
  savedCompanyInfo.value = { name: companyInfo.name, code: companyInfo.code || '' }
  confirmInfo.value = null

  try {
    const res = await axios.post('/api/invest/evaluate', {
      name: companyInfo.name,
      code: companyInfo.code || ''
    })

    if (res.data.code === 0) {
      const content = res.data.data.content
      // 尝试解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluationData.value = JSON.parse(jsonMatch[0])
      } else {
        evaluationData.value = { totalScore: 0, summary: content }
      }
    } else {
      ElMessage.error(res.data.message || '评估失败，请稍后重试')
    }
  } catch (err) {
    console.error('评估失败', err)
    ElMessage.error('评估失败，请稍后重试')
  } finally {
    evaluating.value = false
  }
}

const handleCancel = () => {
  confirmInfo.value = null
  searchText.value = ''
}

const handleRetry = () => {
  errorMsg.value = ''
  searchText.value = ''
}

const handleReset = () => {
  evaluationData.value = null
  confirmInfo.value = null
  searchText.value = ''
  savedCompanyInfo.value = null
}

const handleSave = async () => {
  if (!evaluationData.value || !savedCompanyInfo.value) return
  saving.value = true
  try {
    const d = evaluationData.value
    const res = await axios.post('/api/invest/research/create', {
      companyName: savedCompanyInfo.value.name,
      companyCode: savedCompanyInfo.value.code,
      totalScore: d.totalScore,
      industryScore: d.industryScore,
      companyScore: d.companyScore,
      industryItems: d.industryItems,
      companyItems: d.companyItems,
      pros: d.pros,
      cons: d.cons,
      strategy: d.strategy,
      summary: d.summary
    })
    if (res.data.code === 0) {
      ElMessage.success(`已保存到基本面研究（${res.data.data.version}）`)
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (err) {
    console.error('保存失败', err)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.enterprise-page {
  width: 100%;
}

.el-breadcrumb {
  margin-bottom: 24px;
}

.search-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  max-width: 600px;
  margin: 50px auto 0;
}

.search-container .el-input {
  flex: 1;
}

.confirm-box {
  margin-top: 30px;
  text-align: center;
  padding: 24px;
  background: #1e293b;
  border-radius: 8px;
}

.confirm-text {
  color: #cbd5e1;
  font-size: 16px;
  margin-bottom: 20px;
}

.confirm-text strong {
  color: #409eff;
}

.company-code {
  color: #f59e0b;
  font-weight: normal;
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.error-box {
  margin-top: 30px;
  text-align: center;
  padding: 24px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  color: #f59e0b;
}

.evaluating-box {
  margin-top: 30px;
  text-align: center;
  padding: 24px;
  background: #1e293b;
  border-radius: 8px;
  color: #cbd5e1;
}

.evaluating-box .el-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #409eff;
}

.result-box {
  margin-top: 30px;
  background: #1e293b;
  border-radius: 8px;
  padding: 24px;
}

/* 综合评分卡片 */
.score-card {
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 24px;
  background: linear-gradient(135deg, #1e3a5f, #0f172a);
  border-radius: 12px;
  margin-bottom: 24px;
}

.score-main {
  text-align: center;
  min-width: 120px;
}

.score-value {
  font-size: 56px;
  font-weight: bold;
  color: #409eff;
  line-height: 1;
}

.score-label {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 8px;
}

.score-detail {
  flex: 1;
  display: flex;
  gap: 24px;
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-item .label {
  font-size: 14px;
  color: #94a3b8;
}

.score-item .value {
  font-size: 28px;
  font-weight: bold;
  color: #e2e8f0;
}

.score-item .weight {
  font-size: 12px;
  color: #64748b;
}

/* 优劣势概览 */
.overview-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.pros-box, .cons-box {
  padding: 16px;
  border-radius: 8px;
}

.pros-box {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.cons-box {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.pros-box h4, .cons-box h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pros-box h4 {
  color: #22c55e;
}

.cons-box h4 {
  color: #f59e0b;
}

.pros-box ul, .cons-box ul {
  margin: 0;
  padding-left: 20px;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.8;
}

/* 评估表格 */
.evaluation-section {
  margin-bottom: 24px;
}

.evaluation-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #e2e8f0;
}

.score-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  font-weight: bold;
}

/* 综合评价 */
.summary-section, .strategy-section {
  margin-bottom: 24px;
}

.summary-section h3, .strategy-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #e2e8f0;
}

.summary-text, .strategy-text {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.8;
  margin: 0;
  padding: 16px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
}

.strategy-text {
  background: rgba(34, 197, 94, 0.1);
}

.result-actions {
  margin-top: 24px;
  text-align: center;
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

/* 桌面端表格显示，移动端隐藏 */
.desktop-table {
  display: block;
}

.mobile-cards {
  display: none;
}

/* 移动端卡片样式 */
.mobile-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.mobile-card-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #334155;
  font-size: 13px;
}

.mobile-card-row:last-child {
  border-bottom: none;
}

.mobile-card-label {
  color: #64748b;
  flex-shrink: 0;
  margin-right: 8px;
}

.mobile-card-value {
  color: #e2e8f0;
  text-align: right;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .enterprise-page {
    padding: 0 12px;
  }

  .search-container {
    margin: 20px auto 0;
  }

  .score-card {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .score-value {
    font-size: 40px;
  }

  .score-detail {
    flex-direction: row;
    justify-content: center;
  }

  .score-item .value {
    font-size: 22px;
  }

  .overview-section {
    grid-template-columns: 1fr;
  }

  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: block;
  }

  .result-box {
    padding: 16px;
  }
}
</style>
