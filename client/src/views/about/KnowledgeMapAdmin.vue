<template>
  <div class="km-admin">
    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading" :size="28"><Loading /></el-icon>
    </div>

    <template v-else>
      <!-- 顶部 -->
      <div class="top-bar">
        <div>
          <h2 class="page-title">AI Agent 管理</h2>
          <p class="sub-title">维护 7 模块 × 9 层级共 {{ totalCount }} 条节点 · 已掌握 {{ masteredCount }} 条</p>
        </div>
        <div class="top-actions">
          <el-select v-model="filterModule" placeholder="全部模块" clearable size="small" style="width: 140px">
            <el-option v-for="m in modules" :key="m.code" :label="m.code + ' ' + m.name" :value="m.code" />
          </el-select>
        </div>
      </div>

      <!-- 按模块分组 -->
      <div
        v-for="mod in filteredModules"
        :key="mod.code"
        class="module-block"
      >
        <div class="module-head">
          <span class="m-code">{{ mod.code }}</span>
          <span class="m-name">{{ mod.name }}</span>
          <span class="m-cur">已掌握 {{ mod.masteredCount }}/{{ mod.items.length }}</span>
        </div>
        <p v-if="mod.overview" class="m-overview">{{ mod.overview }}</p>

        <div class="node-list">
          <div
            v-for="node in mod.items"
            :key="node.id"
            class="node-row"
            :class="{ 'is-mastered': node.is_mastered }"
          >
            <div class="node-level" :style="{ background: depthColor(node._depth) }">
              <span class="lv-code">{{ node.level_code }}</span>
              <span class="lv-name">{{ node.level_name }}</span>
            </div>
            <div class="node-body">
              <div class="node-criterion">{{ node.criterion || '（未设置掌握标准）' }}</div>
              <div class="node-meta">
                <span v-if="node.time_bound" class="meta-time">⏱ {{ node.time_bound }}</span>
                <span v-if="node.remark" class="meta-remark">📝 {{ node.remark }}</span>
              </div>
            </div>
            <div class="node-actions">
              <el-switch
                v-model="node.is_mastered"
                :active-value="1"
                :inactive-value="0"
                :before-change="() => beforeToggle(node)"
                size="small"
              />
              <el-button size="small" plain @click="openEdit(node)">编辑</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑弹窗 -->
      <el-dialog v-model="dialogVisible" title="编辑节点" width="520px" :close-on-click-modal="false">
        <div v-if="editing" class="edit-form">
          <div class="edit-head">
            <span class="edit-tag">{{ editing.module_code }} {{ editing.module_name }} · {{ editing.level_code }} {{ editing.level_name }}</span>
          </div>
          <el-form label-position="top">
            <el-form-item label="模块概览">
              <el-input v-model="editing.overview" type="textarea" :rows="3" placeholder="该模块整体要掌握什么（同步更新该模块全部层级）" />
            </el-form-item>
            <el-form-item label="掌握标准">
              <el-input v-model="editing.criterion" type="textarea" :rows="3" placeholder="该层级需要掌握到什么程度" />
            </el-form-item>
            <el-form-item label="时限">
              <el-input v-model="editing.time_bound" placeholder="例如：限时复述≤2min" />
            </el-form-item>
            <el-form-item label="说明 / 备注">
              <el-input v-model="editing.remark" type="textarea" :rows="2" placeholder="补充说明" />
            </el-form-item>
            <el-form-item label="是否掌握">
              <el-switch v-model="editing.is_mastered" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="saveEdit">保存</el-button>
        </template>
      </el-dialog>
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
const filterModule = ref('')

const dialogVisible = ref(false)
const editing = ref(null)
const saving = ref(false)

const levels = [
  { code: 'L1', depth: 0.12 }, { code: 'L2', depth: 0.22 }, { code: 'L3', depth: 0.32 },
  { code: 'L4', depth: 0.42 }, { code: 'L5', depth: 0.52 }, { code: 'L6', depth: 0.62 },
  { code: 'L7', depth: 0.72 }, { code: 'L8', depth: 0.85 }, { code: 'L9', depth: 1.0 },
]
const depthOf = (code) => (levels.find(l => l.code === code) || {}).depth || 0.1

const depthColor = (depth) => {
  const hue = 215
  const light = 62 - depth * 38
  const sat = 70 + depth * 20
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

// 按模块聚合，并附带 depth
const modules = computed(() => {
  const map = new Map()
  for (const r of rows.value) {
    r._depth = depthOf(r.level_code)
    if (!map.has(r.module_code)) {
      map.set(r.module_code, { code: r.module_code, name: r.module_name, items: [], overview: r.overview || '' })
    }
    map.get(r.module_code).items.push(r)
  }
  const list = [...map.values()]
  for (const m of list) {
    m.masteredCount = m.items.filter(i => i.is_mastered).length
  }
  return list
})

const filteredModules = computed(() => {
  if (!filterModule.value) return modules.value
  return modules.value.filter(m => m.code === filterModule.value)
})

const totalCount = computed(() => rows.value.length)
const masteredCount = computed(() => rows.value.filter(r => r.is_mastered).length)

// 切换掌握开关：直接保存（值统一用 1/0，与数据库 tinyint 一致）
const beforeToggle = (node) => {
  const next = node.is_mastered ? 0 : 1
  return (async () => {
    try {
      await axios.put(`/api/knowledge-map/${node.id}`, { is_mastered: next })
      node.is_mastered = next
      // 同步分组计数
      const mod = modules.value.find(m => m.code === node.module_code)
      if (mod) mod.masteredCount = mod.items.filter(i => i.is_mastered).length
      ElMessage.success(next ? '已标记为掌握' : '已取消掌握')
      return true
    } catch {
      ElMessage.error('更新失败')
      return false
    }
  })()
}

const openEdit = (node) => {
  // 深拷贝避免直接改原数据
  editing.value = { ...node }
  dialogVisible.value = true
}

const saveEdit = async () => {
  if (!editing.value) return
  saving.value = true
  try {
    const e = editing.value
    await axios.put(`/api/knowledge-map/${e.id}`, {
      criterion: e.criterion,
      time_bound: e.time_bound,
      remark: e.remark,
      is_mastered: e.is_mastered,
      overview: e.overview,
    })
    // 回写到列表
    const target = rows.value.find(r => r.id === e.id)
    if (target) {
      Object.assign(target, {
        criterion: e.criterion,
        time_bound: e.time_bound,
        remark: e.remark,
        is_mastered: e.is_mastered,
      })
      const mod = modules.value.find(m => m.code === target.module_code)
      if (mod) mod.masteredCount = mod.items.filter(i => i.is_mastered).length
    }
    // overview 是模块维度：同步更新同 module_code 的全部行，保证列表立即刷新
    if (e.overview !== undefined) {
      rows.value.forEach(r => {
        if (r.module_code === e.module_code) r.overview = e.overview || ''
      })
      const mod = modules.value.find(m => m.code === e.module_code)
      if (mod) mod.overview = e.overview || ''
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/knowledge-map')
    if (res.data.code === 0) rows.value = res.data.data || []
  } catch {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
</script>

<style scoped>
.km-admin {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}

.loading-box {
  display: flex;
  justify-content: center;
  padding: 100px 0;
  color: #64748b;
}
.loading-box .el-icon { color: #409eff; }

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
}
.sub-title {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.module-block {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  margin-bottom: 16px;
  overflow: hidden;
}
.module-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}
.m-code {
  font-size: 13px;
  font-weight: 700;
  color: #409eff;
}
.m-name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}
.m-cur {
  margin-left: auto;
  font-size: 12px;
  color: #f59e0b;
  font-weight: 500;
}
.m-overview {
  margin: 0;
  padding: 10px 16px;
  background: #0f172a;
  border-left: 3px solid #409eff;
  font-size: 13px;
  line-height: 1.6;
  color: #cbd5e1;
}

.node-list {
  display: flex;
  flex-direction: column;
}
.node-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid #1e293b;
  transition: background 0.15s;
}
.node-row:last-child { border-bottom: none; }
.node-row.is-mastered {
  background: rgba(34, 197, 94, 0.06);
}
.node-row:hover {
  background: rgba(64, 158, 255, 0.05);
}

.node-level {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
  border-radius: 6px;
  color: #fff;
  min-height: 40px;
}
.lv-code {
  font-size: 12px;
  font-weight: 700;
}
.lv-name {
  font-size: 11px;
  opacity: 0.9;
}

.node-body {
  min-width: 0;
}
.node-criterion {
  font-size: 13px;
  color: #e2e8f0;
  line-height: 1.5;
  word-break: break-word;
}
.node-meta {
  display: flex;
  gap: 14px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.meta-time, .meta-remark {
  font-size: 11px;
  color: #94a3b8;
}

.node-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.edit-form { padding: 0 4px; }
.edit-head {
  margin-bottom: 14px;
}
.edit-tag {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  padding: 4px 10px;
  border-radius: 4px;
}

/* 移动端 */
@media (max-width: 768px) {
  .node-row {
    grid-template-columns: 56px 1fr;
    gap: 10px;
  }
  .node-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
    padding-top: 4px;
  }
}
</style>
