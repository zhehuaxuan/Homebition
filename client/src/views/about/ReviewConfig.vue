<template>
  <div class="page-container">
    <h2 class="page-title">复盘配置</h2>
    <p class="page-desc">管理下拉选项和关注个股，修改后点击各分组的「保存」生效。</p>

    <div v-if="loading" class="loading-text">加载中...</div>
    <div v-else class="config-list">
      <div v-for="group in groups" :key="group.groupKey" class="config-card">
        <div class="card-header">
          <h3 class="card-title">{{ groupLabels[group.groupKey] || group.groupKey }}</h3>
          <el-button type="primary" size="small" @click="saveGroup(group)" :loading="savingKey === group.groupKey">
            保存
          </el-button>
        </div>

        <!-- 关注个股特殊处理 -->
        <template v-if="group.groupKey === 'watchlist'">
          <div class="tags-wrap">
            <el-tag
              v-for="(item, idx) in group.items"
              :key="idx"
              closable
              :disable-transitions="false"
              @close="removeItem(group, idx)"
              class="config-tag"
            >
              {{ item.label }} <span class="tag-code">{{ item.value }}</span>
            </el-tag>
          </div>
          <div class="add-row">
            <el-input
              v-model="watchlistName"
              placeholder="名称"
              size="small"
              class="add-input"
              @keyup.enter="addWatchlist(group)"
            />
            <el-input
              v-model="watchlistCode"
              placeholder="股票代码"
              size="small"
              class="add-input code"
              @keyup.enter="addWatchlist(group)"
            />
            <el-button size="small" @click="addWatchlist(group)">添加</el-button>
          </div>
        </template>

        <!-- 普通分组 -->
        <template v-else>
          <div class="tags-wrap">
            <el-tag
              v-for="(item, idx) in group.items"
              :key="idx"
              closable
              :disable-transitions="false"
              @close="removeItem(group, idx)"
              class="config-tag"
            >
              {{ item.label }}
            </el-tag>
          </div>
          <div class="add-row">
            <el-input
              v-model="newLabel[group.groupKey]"
              placeholder="输入新选项"
              size="small"
              class="add-input"
              @keyup.enter="addItem(group)"
            />
            <el-button size="small" @click="addItem(group)">添加</el-button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const groupLabels = {
  market_sentiment: '大盘感受',
  current_main_line: '当前主线',
  risk_warning: '风险预警',
  opportunity_sector: '机会板块',
  action_plan: '操作计划',
  position_feeling: '仓位感受',
  watchlist: '关注个股',
}

const groups = ref([])
const loading = ref(true)
const savingKey = ref('')
const newLabel = reactive({})
const watchlistName = ref('')
const watchlistCode = ref('')

async function loadGroups() {
  loading.value = true
  try {
    const { data } = await axios.get('/api/review-config/groups')
    if (data.code === 0) {
      groups.value = data.data.sort((a, b) => {
        const keys = Object.keys(groupLabels)
        return keys.indexOf(a.groupKey) - keys.indexOf(b.groupKey)
      })
      groups.value.forEach(g => {
        if (g.groupKey !== 'watchlist') {
          newLabel[g.groupKey] = ''
        }
      })
    }
  } catch {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

function removeItem(group, idx) {
  group.items.splice(idx, 1)
}

function addItem(group) {
  const label = newLabel[group.groupKey]?.trim()
  if (!label) {
    ElMessage.warning('请输入选项名称')
    return
  }
  if (group.items.some(i => i.label === label)) {
    ElMessage.warning('选项已存在')
    return
  }
  group.items.push({ label, value: null })
  newLabel[group.groupKey] = ''
}

function addWatchlist(group) {
  const name = watchlistName.value.trim()
  const code = watchlistCode.value.trim()
  if (!name || !code) {
    ElMessage.warning('请输入名称和股票代码')
    return
  }
  if (group.items.some(i => i.label === name)) {
    ElMessage.warning('已存在相同名称')
    return
  }
  group.items.push({ label: name, value: code })
  watchlistName.value = ''
  watchlistCode.value = ''
}

async function saveGroup(group) {
  savingKey.value = group.groupKey
  try {
    const items = group.items.map(i => ({ label: i.label, value: i.value || null }))
    if (items.length === 0) {
      ElMessage.warning('至少保留一个选项')
      return
    }
    const { data } = await axios.put(`/api/review-config/${group.groupKey}`, { items })
    if (data.code === 0) {
      ElMessage.success('保存成功')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingKey.value = ''
  }
}

onMounted(loadGroups)
</script>

<style scoped>
.page-container {
  padding: 12px;
}
.page-title {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
}
.page-desc {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: #64748b;
}
.loading-text {
  color: #94a3b8;
  text-align: center;
  padding: 40px 0;
}
.config-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.config-card {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #e2e8f0;
}
.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 28px;
}
.config-tag {
  font-size: 13px;
}
.tag-code {
  color: #94a3b8;
  margin-left: 4px;
  font-size: 11px;
}
.add-row {
  display: flex;
  gap: 8px;
}
.add-input {
  width: 200px;
}
.add-input.code {
  width: 140px;
}
</style>
