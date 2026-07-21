<template>
  <div class="content-page research-detail">
    <!-- 顶部导航与版本切换 -->
    <div class="detail-header">
      <div class="header-left">
        <el-button text @click="$router.push(researchBase)">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <h3>{{ detail.companyName }}</h3>
        <span v-if="detail.companyCode" class="company-code">{{ detail.companyCode }}</span>
      </div>
      <div class="header-right">
        <el-select v-model="selectedVersion" size="small" style="width: 110px" @change="switchVersion">
          <el-option
            v-for="v in detail.versions"
            :key="v.version"
            :label="v.version"
            :value="v.version"
          />
        </el-select>
        <el-button v-if="!editing" type="primary" size="small" @click="startEdit">编辑</el-button>
        <el-button v-else size="small" @click="cancelEdit">取消</el-button>
        <el-button v-if="editing" type="primary" size="small" @click="showSubmitDialog = true">提交变更</el-button>
        <el-button v-if="!editing" text size="small" class="delete-btn" @click="handleDelete">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 版本信息 -->
    <div v-if="currentVersionMeta" class="version-meta">
      <span class="meta-item">
        <el-icon><Clock /></el-icon>
        {{ formatTime(currentVersionMeta.createdAt) }}
      </span>
      <span class="meta-item">
        <el-icon><InfoFilled /></el-icon>
        来源：{{ sourceLabel(currentVersionMeta.source) }}
      </span>
      <span v-if="currentVersionMeta.versionDesc" class="meta-item">
        <el-icon><EditPen /></el-icon>
        {{ currentVersionMeta.versionDesc }}
      </span>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <!-- 内容区 -->
    <template v-if="!loading && content">
      <!-- 综合评分卡片 -->
      <div v-if="content.totalScore !== null || editing" class="score-card">
        <div class="score-main">
          <div class="score-value" :class="{ 'score-recalc': editing }">{{ editing ? computedTotalScore : content.totalScore }}</div>
          <div class="score-label">综合评分</div>
        </div>
        <div class="score-detail">
          <div class="score-item">
            <span class="label">行业维度</span>
            <span class="value" :class="{ 'score-recalc': editing }">{{ editing ? computedIndustryScore : content.industryScore }}</span>
            <span class="weight">权重 60%</span>
          </div>
          <div class="score-item">
            <span class="label">公司维度</span>
            <span class="value" :class="{ 'score-recalc': editing }">{{ editing ? computedCompanyScore : content.companyScore }}</span>
            <span class="weight">权重 40%</span>
          </div>
        </div>
      </div>

      <!-- 优劣势概览（可编辑） -->
      <div class="overview-section">
        <div class="pros-box">
          <h4>核心优势</h4>
          <template v-if="editing">
            <div class="tag-editor">
              <el-tag
                v-for="(item, idx) in editPros"
                :key="idx"
                closable
                type="success"
                @close="removePro(idx)"
              >{{ item }}</el-tag>
              <el-input
                v-if="showProInput"
                ref="proInputRef"
                v-model="proInputValue"
                size="small"
                style="width: 160px"
                @keyup.enter="addPro"
                @blur="addPro"
              />
              <el-button v-else size="small" text @click="showProInput = true">+ 添加</el-button>
            </div>
          </template>
          <ul v-else>
            <li v-for="(pro, idx) in content.pros" :key="'pro-' + idx">{{ pro }}</li>
            <li v-if="!content.pros || !content.pros.length" class="empty-hint">暂无</li>
          </ul>
        </div>
        <div class="cons-box">
          <h4>主要瑕疵</h4>
          <template v-if="editing">
            <div class="tag-editor">
              <el-tag
                v-for="(item, idx) in editCons"
                :key="idx"
                closable
                type="warning"
                @close="removeCon(idx)"
              >{{ item }}</el-tag>
              <el-input
                v-if="showConInput"
                ref="conInputRef"
                v-model="conInputValue"
                size="small"
                style="width: 160px"
                @keyup.enter="addCon"
                @blur="addCon"
              />
              <el-button v-else size="small" text @click="showConInput = true">+ 添加</el-button>
            </div>
          </template>
          <ul v-else>
            <li v-for="(con, idx) in content.cons" :key="'con-' + idx">{{ con }}</li>
            <li v-if="!content.cons || !content.cons.length" class="empty-hint">暂无</li>
          </ul>
        </div>
      </div>

      <!-- 行业维度评估 -->
      <div v-if="content.industryItems" class="evaluation-section">
        <h3>一、选行业维度评估（权重 60%）</h3>
        <div class="desktop-table">
          <el-table :data="editing ? editIndustryItems : content.industryItems" border stripe size="small">
            <el-table-column prop="指标" label="评估指标" width="180" />
            <el-table-column prop="权重" label="权重" width="80" align="center" />
            <el-table-column label="得分" width="100" align="center">
              <template #default="scope">
                <span v-if="!editing" class="score-badge">{{ scope.row.得分 }}</span>
                <el-input-number
                  v-else
                  v-model="editIndustryItems[scope.$index]['得分']"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  style="width: 90px"
                />
              </template>
            </el-table-column>
            <el-table-column label="打分依据" min-width="200">
              <template #default="scope">
                <span v-if="!editing">{{ scope.row.依据 }}</span>
                <el-input
                  v-else
                  v-model="editIndustryItems[scope.$index]['依据']"
                  type="textarea"
                  :rows="2"
                  size="small"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="mobile-table-cards">
          <div v-for="(item, idx) in (editing ? editIndustryItems : content.industryItems)" :key="'industry-card-'+idx" class="mobile-card">
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
              <span v-if="!editing" class="mobile-card-value"><span class="score-badge">{{ item.得分 }}</span></span>
              <el-input-number
                v-else
                v-model="editIndustryItems[idx]['得分']"
                :min="0" :max="10" :step="0.5" :precision="1"
                size="small" controls-position="right"
                style="width: 90px"
              />
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">打分依据</span>
              <span v-if="!editing" class="mobile-card-value">{{ item.依据 }}</span>
              <el-input
                v-else
                v-model="editIndustryItems[idx]['依据']"
                type="textarea" :rows="2" size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 公司维度评估 -->
      <div v-if="content.companyItems" class="evaluation-section">
        <h3>二、选公司维度评估（权重 40%）</h3>
        <div class="desktop-table">
          <el-table :data="editing ? editCompanyItems : content.companyItems" border stripe size="small">
            <el-table-column prop="指标" label="评估指标" width="180" />
            <el-table-column prop="权重" label="权重" width="80" align="center" />
            <el-table-column label="得分" width="100" align="center">
              <template #default="scope">
                <span v-if="!editing" class="score-badge">{{ scope.row.得分 }}</span>
                <el-input-number
                  v-else
                  v-model="editCompanyItems[scope.$index]['得分']"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  style="width: 90px"
                />
              </template>
            </el-table-column>
            <el-table-column label="打分依据" min-width="200">
              <template #default="scope">
                <span v-if="!editing">{{ scope.row.依据 }}</span>
                <el-input
                  v-else
                  v-model="editCompanyItems[scope.$index]['依据']"
                  type="textarea"
                  :rows="2"
                  size="small"
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div class="mobile-table-cards">
          <div v-for="(item, idx) in (editing ? editCompanyItems : content.companyItems)" :key="'company-card-'+idx" class="mobile-card">
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
              <span v-if="!editing" class="mobile-card-value"><span class="score-badge">{{ item.得分 }}</span></span>
              <el-input-number
                v-else
                v-model="editCompanyItems[idx]['得分']"
                :min="0" :max="10" :step="0.5" :precision="1"
                size="small" controls-position="right"
                style="width: 90px"
              />
            </div>
            <div class="mobile-card-row">
              <span class="mobile-card-label">打分依据</span>
              <span v-if="!editing" class="mobile-card-value">{{ item.依据 }}</span>
              <el-input
                v-else
                v-model="editCompanyItems[idx]['依据']"
                type="textarea" :rows="2" size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 预期目标价 & 击球区 -->
      <div class="price-section">
        <h3>价格参考</h3>
        <div class="price-grid">
          <div class="price-item">
            <span class="price-label">预期目标价</span>
            <span v-if="!editing" class="price-value">{{ content.targetPrice != null ? content.targetPrice : '--' }}</span>
            <el-input-number
              v-else
              v-model="editTargetPrice"
              :min="0"
              :precision="2"
              size="small"
              controls-position="right"
              style="width: 160px"
            />
          </div>
          <div class="price-item">
            <span class="price-label">击球区</span>
            <span v-if="!editing" class="price-value">{{ content.sweetSpot || '--' }}</span>
            <el-input
              v-else
              v-model="editSweetSpot"
              placeholder="如：80-120"
              size="small"
              style="width: 160px"
            />
          </div>
        </div>
      </div>

      <!-- 综合评价 -->
      <div class="summary-section">
        <h3>三、综合评价</h3>
        <p v-if="!editing" class="summary-text">{{ content.summary || '暂无' }}</p>
        <el-input
          v-else
          v-model="editSummary"
          type="textarea"
          :rows="3"
          placeholder="请输入综合评价"
          class="strategy-input"
        />
      </div>

      <!-- 交易策略（可编辑） -->
      <div class="strategy-section">
        <h3>四、交易策略建议</h3>
        <p v-if="!editing" class="strategy-text">{{ content.strategy || '暂无' }}</p>
        <el-input
          v-else
          v-model="editStrategy"
          type="textarea"
          :rows="3"
          placeholder="请输入交易策略"
          class="strategy-input"
        />
      </div>

      <!-- 用户补充分析（富文本） -->
      <div class="notes-section">
        <h3>五、补充分析</h3>
        <div v-if="!editing" class="notes-content" v-html="displayNotes" />
        <div v-else>
          <Toolbar :editor="notesEditor" :default-config="toolbarConfig" mode="default" style="margin-bottom: 8px" />
          <Editor v-model="editNotes" :default-config="editorConfig" mode="default" @onCreated="onNotesCreated" class="wangeditor-box" />
        </div>
      </div>
    </template>

    <!-- 提交变更对话框 -->
    <el-dialog v-model="showSubmitDialog" title="提交变更" width="420px" top="30vh">
      <el-form :model="submitForm">
        <el-form-item label="变更说明" required>
          <el-input
            v-model="submitForm.versionDesc"
            type="textarea"
            :rows="3"
            placeholder="请简要描述本次变更内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <p class="version-hint">
          提交后将生成新版本 <strong>{{ nextVersionStr }}</strong>
        </p>
      </el-form>
      <template #footer>
        <el-button @click="showSubmitDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!submitForm.versionDesc.trim()" @click="submitVersion">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Clock, InfoFilled, EditPen, Loading, Delete } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const route = useRoute()
const router = useRouter()

const researchId = computed(() => parseInt(route.params.id))

const researchBase = computed(() =>
  route.path.startsWith('/about') ? '/about/research' : '/invest/research'
)

// 页面状态
const loading = ref(false)
const editing = ref(false)
const detail = ref({ companyName: '', companyCode: '', versions: [], content: {} })
const content = ref({})
const selectedVersion = ref('')
const currentVersionMeta = ref(null)

// 编辑态数据
const editPros = ref([])
const editCons = ref([])
const editStrategy = ref('')
const editSummary = ref('')
const editNotes = ref('')
const editTargetPrice = ref(null)
const editSweetSpot = ref('')
const editIndustryItems = ref([])
const editCompanyItems = ref([])
const showProInput = ref(false)
const showConInput = ref(false)
const proInputValue = ref('')
const conInputValue = ref('')
const proInputRef = ref(null)
const conInputRef = ref(null)

// wangeditor
const notesEditor = ref(null)
const toolbarConfig = { excludeKeys: '|'.repeat(30) }
const editorConfig = { placeholder: '输入补充分析...' }

// 编辑时联动重算评分（权重解析自 items 里的"权重"字段）
const computedIndustryScore = computed(() => {
  const items = editIndustryItems.value
  if (!items || !items.length) return content.value.industryScore
  const scores = items.map(i => parseFloat(i['得分'])).filter(v => !isNaN(v))
  if (!scores.length) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
})

const computedCompanyScore = computed(() => {
  const items = editCompanyItems.value
  if (!items || !items.length) return content.value.companyScore
  let totalWeight = 0, weightedSum = 0
  for (const item of items) {
    const w = parseFloat(item['权重']) / 100
    const s = parseFloat(item['得分'])
    if (!isNaN(w) && !isNaN(s)) {
      totalWeight += w
      weightedSum += s * w
    }
  }
  if (!totalWeight) return 0
  return Math.round(weightedSum / totalWeight * 10) / 10
})

const computedTotalScore = computed(() => {
  const ind = computedIndustryScore.value
  const comp = computedCompanyScore.value
  if (ind == null && comp == null) return content.value.totalScore
  return Math.round(((ind || 0) * 0.6 + (comp || 0) * 0.4) * 10) / 10
})

// 提交对话框
const showSubmitDialog = ref(false)
const submitting = ref(false)
const submitForm = reactive({ versionDesc: '' })

const nextVersionStr = computed(() => {
  const cur = detail.value.currentVersion || 'V1.0'
  const m = cur.match(/V(\d+)\.(\d+)/)
  if (!m) return 'V1.0'
  let ma = parseInt(m[1]), mi = parseInt(m[2])
  if (mi < 9) { mi++ } else { ma++; mi = 0 }
  return `V${ma}.${mi}`
})

const displayNotes = computed(() => content.value.userNotes || '')

const sourceLabel = (s) => s === 'evaluate' ? '企业评估写入' : '手动编辑'

const formatTime = (t) => {
  if (!t) return ''
  return t.slice(0, 16).replace('T', ' ')
}

// 获取详情
const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/invest/research/${researchId.value}`)
    if (res.data.code === 0) {
      detail.value = res.data.data
      selectedVersion.value = detail.value.currentVersion
      updateContent(detail.value.content)
      if (detail.value.versions.length) {
        currentVersionMeta.value = detail.value.versions.find(v => v.version === selectedVersion.value)
      }
    }
  } catch (err) {
    ElMessage.error('获取研究详情失败')
    router.push(researchBase.value)
  } finally {
    loading.value = false
  }
}

const updateContent = (data) => {
  content.value = data
  editPros.value = data.pros ? [...data.pros] : []
  editCons.value = data.cons ? [...data.cons] : []
  editStrategy.value = data.strategy || ''
  editSummary.value = data.summary || ''
  editNotes.value = data.userNotes || ''
  editTargetPrice.value = data.targetPrice ?? null
  editSweetSpot.value = data.sweetSpot || ''
  editIndustryItems.value = data.industryItems ? JSON.parse(JSON.stringify(data.industryItems)) : []
  editCompanyItems.value = data.companyItems ? JSON.parse(JSON.stringify(data.companyItems)) : []
}

// 版本切换
const switchVersion = async (ver) => {
  if (editing.value) {
    editing.value = false
  }
  loading.value = true
  try {
    const res = await axios.get(`/api/invest/research/${researchId.value}/version/${ver}`)
    if (res.data.code === 0) {
      updateContent(res.data.data)
      currentVersionMeta.value = detail.value.versions.find(v => v.version === ver)
    }
  } catch (err) {
    ElMessage.error('获取版本失败')
  } finally {
    loading.value = false
  }
}

// delete research
const handleDelete = () => {
  ElMessageBox.confirm(
    `确定删除「${detail.value.companyName}」的所有研究记录吗？此操作不可撤销。`,
    '删除确认',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const res = await axios.delete(`/api/invest/research/${researchId.value}`)
      if (res.data.code === 0) {
        ElMessage.success('已删除')
        router.push(researchBase.value)
      }
    } catch (err) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// 编辑操作
const startEdit = () => {
  editing.value = true
  editPros.value = content.value.pros ? [...content.value.pros] : []
  editCons.value = content.value.cons ? [...content.value.cons] : []
  editStrategy.value = content.value.strategy || ''
  editSummary.value = content.value.summary || ''
  editNotes.value = content.value.userNotes || ''
  editTargetPrice.value = content.value.targetPrice ?? null
  editSweetSpot.value = content.value.sweetSpot || ''
  editIndustryItems.value = content.value.industryItems ? JSON.parse(JSON.stringify(content.value.industryItems)) : []
  editCompanyItems.value = content.value.companyItems ? JSON.parse(JSON.stringify(content.value.companyItems)) : []
}

const cancelEdit = () => {
  editing.value = false
  editPros.value = content.value.pros ? [...content.value.pros] : []
  editCons.value = content.value.cons ? [...content.value.cons] : []
  editStrategy.value = content.value.strategy || ''
  editSummary.value = content.value.summary || ''
  editNotes.value = content.value.userNotes || ''
  editTargetPrice.value = content.value.targetPrice ?? null
  editSweetSpot.value = content.value.sweetSpot || ''
  editIndustryItems.value = content.value.industryItems ? JSON.parse(JSON.stringify(content.value.industryItems)) : []
  editCompanyItems.value = content.value.companyItems ? JSON.parse(JSON.stringify(content.value.companyItems)) : []
}

const addPro = () => {
  const val = proInputValue.value.trim()
  if (val) editPros.value.push(val)
  proInputValue.value = ''
  showProInput.value = false
}

const removePro = (idx) => { editPros.value.splice(idx, 1) }

const addCon = () => {
  const val = conInputValue.value.trim()
  if (val) editCons.value.push(val)
  conInputValue.value = ''
  showConInput.value = false
}

const removeCon = (idx) => { editCons.value.splice(idx, 1) }

// 提交版本
const submitVersion = async () => {
  if (!submitForm.versionDesc.trim()) return
  submitting.value = true
  try {
    const res = await axios.post(`/api/invest/research/${researchId.value}/version`, {
      versionDesc: submitForm.versionDesc.trim(),
      pros: editPros.value,
      cons: editCons.value,
      strategy: editStrategy.value,
      summary: editSummary.value,
      userNotes: editNotes.value,
      industryItems: editIndustryItems.value,
      companyItems: editCompanyItems.value,
      totalScore: computedTotalScore.value,
      industryScore: computedIndustryScore.value,
      companyScore: computedCompanyScore.value,
      targetPrice: editTargetPrice.value,
      sweetSpot: editSweetSpot.value
    })
    if (res.data.code === 0) {
      ElMessage.success(`已生成新版本 ${res.data.data.version}`)
      showSubmitDialog.value = false
      submitForm.versionDesc = ''
      editing.value = false
      // 刷新整个详情
      await fetchDetail()
    }
  } catch (err) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

// wangeditor
const onNotesCreated = (editor) => {
  notesEditor.value = editor
}

onMounted(fetchDetail)

onUnmounted(() => {
  if (notesEditor.value) notesEditor.value.destroy()
})
</script>

<style scoped>
.research-detail {
  width: 100%;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  color: #e2e8f0;
}

.company-code {
  font-size: 12px;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-btn {
  color: #64748b;
}
.delete-btn:hover {
  color: #ef4444;
}

.version-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  font-size: 12px;
  color: #64748b;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item .el-icon {
  font-size: 13px;
}

.loading-box {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
}

.loading-box .el-icon {
  font-size: 32px;
  color: #409eff;
}

/* 评分卡片 */
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

.score-recalc {
  color: #22c55e !important;
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

/* 优劣势 */
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

.pros-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); }
.cons-box { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); }

.pros-box h4, .cons-box h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: inherit;
}

.pros-box h4 { color: #22c55e; }
.cons-box h4 { color: #f59e0b; }

.pros-box ul, .cons-box ul {
  margin: 0;
  padding-left: 20px;
  color: #cbd5e1;
  font-size: 13px;
  line-height: 1.8;
}

.empty-hint {
  color: #64748b !important;
  list-style: none;
  padding-left: 0 !important;
}

/* 标签编辑器 */
.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
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
.summary-section, .strategy-section, .notes-section, .price-section {
  margin-bottom: 24px;
}

.summary-section h3, .strategy-section h3, .notes-section h3, .price-section h3 {
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

.strategy-input {
  :deep(.el-textarea__inner) {
    background: #0f172a;
    border-color: #334155;
    color: #cbd5e1;
  }
}

/* 补充分析 */
.notes-content {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.8;
  padding: 16px;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 8px;
}

.wangeditor-box {
  :deep(.w-e-text-container) {
    background-color: #0f172a;
    color: #cbd5e1;
    min-height: 300px;
  }
  :deep(.w-e-text-container [data-slate-editor]) {
    background-color: #0f172a;
    color: #cbd5e1;
  }
  :deep(.w-e-toolbar) {
    background-color: #1e293b;
    border-color: #334155;
  }
  :deep(.w-e-bar-item button) {
    color: #cbd5e1;
  }
  :deep(.w-e-toolbar .w-e-bar-item button:hover) {
    background-color: #334155;
  }
}

/* 提交对话框 */
.version-hint {
  color: #94a3b8;
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.version-hint strong {
  color: #409eff;
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

.price-grid {
  display: flex;
  gap: 32px;
  padding: 16px;
  background: rgba(64, 158, 255, 0.05);
  border-radius: 8px;
}

.price-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-label {
  font-size: 14px;
  color: #94a3b8;
  white-space: nowrap;
}

.price-value {
  font-size: 18px;
  font-weight: bold;
  color: #e2e8f0;
}
/* Desktop / Mobile table visibility */
.desktop-table {
  display: block;
}

.mobile-table-cards {
  display: none;
}

.mobile-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.mobile-card-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 0;
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

.mobile-card-row:last-child {
  border-bottom: none;
}

.mobile-card-label {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  min-width: 60px;
}

.mobile-card-value {
  font-size: 13px;
  color: #cbd5e1;
  text-align: right;
  flex: 1;
  margin-left: 8px;
}

@media (max-width: 768px) {
  .research-detail {
    padding: 0 4px;
  }

  .detail-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-left h3 {
    font-size: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-end;
  }

  .score-card {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .score-value {
    font-size: 36px;
  }

  .score-detail {
    flex-direction: column;
    gap: 12px;
  }

  .score-item .value {
    font-size: 20px;
  }

  .overview-section {
    grid-template-columns: 1fr;
  }

  .desktop-table {
    display: none;
  }

  .mobile-table-cards {
    display: block;
  }

  .price-grid {
    flex-direction: column;
    gap: 12px;
  }

  .evaluation-section {
    margin-bottom: 16px;
  }

  .evaluation-section h3 {
    font-size: 14px;
  }

  .summary-section, .strategy-section, .notes-section, .price-section {
    margin-bottom: 16px;
  }

  .version-meta {
    gap: 8px;
    flex-direction: column;
    margin-bottom: 12px;
  }

  .wangeditor-box :deep(.w-e-text-container) {
    min-height: 200px;
  }
}
</style>
