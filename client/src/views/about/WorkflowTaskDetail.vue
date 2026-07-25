<template>
  <div class="detail-page">
    <div v-if="loading" class="loading-text">加载中...</div>
    <div v-else-if="!task" class="loading-text">任务不存在</div>

    <template v-else>
      <el-button text @click="$router.push('/about/workflow-tasks')" style="color:#94a3b8;margin-bottom:16px">← 返回列表</el-button>

      <!-- 概览卡 -->
      <div class="summary-card">
        <div class="summary-top">
          <h2 class="summary-title">{{ task.title }}</h2>
          <el-tag :type="statusTagType(task.status)" size="small">{{ statusLabel(task.status) }}</el-tag>
        </div>
        <p v-if="task.description" class="summary-desc">{{ task.description }}</p>
        <div class="summary-meta">
          <span>创建 {{ formatDateTime(task.created_at) }}</span>
          <span v-if="task.finished_at">完成 {{ formatDateTime(task.finished_at) }}</span>
          <span>步骤 {{ task.current_step_order }}/{{ task.total_steps }}</span>
        </div>
      </div>

      <!-- 步骤卡片 -->
      <div v-for="(step, idx) in task.steps" :key="step.id" class="step-wrap">
        <div class="step-marker">
          <div class="step-dot" :class="{ 'dot-done': step.status === 2, 'dot-current': step.status === 1, 'dot-pending': step.status === 0 }">
            <span v-if="step.status === 2">✓</span>
            <span v-else>{{ step.step_order }}</span>
          </div>
          <div v-if="idx < task.steps.length - 1" class="step-line" />
        </div>

        <div class="step-card" :class="{ 'card-done': step.status === 2, 'card-current': step.status === 1, 'card-pending': step.status === 0 }">
          <div class="card-top">
            <span class="card-name">{{ step.step_order }}. {{ step.name }}</span>
            <el-tag
              :type="step.status === 2 ? 'success' : (step.status === 1 ? 'primary' : 'info')"
              size="small"
            >
              {{ ['待开始', '进行中', '已完成'][step.status] }}
            </el-tag>
          </div>
          <div v-if="step.guide" class="card-guide">📖 {{ step.guide }}</div>
          <div v-if="step.estimated_duration" class="card-guide">⏱ {{ step.estimated_duration }}</div>

          <div v-if="step.progress" class="card-progress">
            <div class="progress-label">进展反馈</div>
            <div class="progress-text">{{ step.progress }}</div>
          </div>

          <div v-if="step.finished_at" class="card-time">✓ {{ formatDateTime(step.finished_at) }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const task = ref(null)
const loading = ref(true)

const statusTagType = (s) => (s === 0 ? 'info' : s === 1 ? 'primary' : 'success')
const statusLabel = (s) => ['待启动', '进行中', '已完成'][s] || '未知'

const fetchTask = async () => {
  loading.value = true
  try {
    const { data } = await axios.get(`/api/workflow-tasks/${route.params.id}`)
    if (data.code === 0) task.value = data.data
  } catch {
    ElMessage.error('获取任务详情失败')
  } finally {
    loading.value = false
  }
}

const formatDateTime = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(fetchTask)
</script>

<style scoped>
.detail-page { padding: 24px 32px; max-width: 700px; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.loading-text { text-align: center; padding: 60px; color: #64748b; }

/* === 概览卡 === */
.summary-card {
  background: #f8f5f0; border-radius: 12px; padding: 24px; margin-bottom: 28px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.summary-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.summary-title { margin: 0; font-size: 22px; font-weight: 700; color: #1e293b; }
.summary-desc { color: #475569; font-size: 14px; line-height: 1.7; margin: 8px 0; }
.summary-meta { display: flex; gap: 24px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5ddd4; font-size: 12px; color: #64748b; flex-wrap: wrap; }

/* === 步骤行 === */
.step-wrap { display: flex; gap: 20px; margin-bottom: 4px; }

/* === 标记点 === */
.step-marker { display: flex; flex-direction: column; align-items: center; width: 36px; flex-shrink: 0; padding-top: 18px; }
.step-dot {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.dot-done { background: #059669; color: #fff; }
.dot-current { background: #2563eb; color: #fff; }
.dot-pending { background: #cbd5e1; color: #64748b; }

.step-line { width: 2px; flex: 1; min-height: 24px; margin-top: 6px; background: #cbd5e1; }
.step-wrap:last-child .step-line { display: none; }

/* === 步骤卡片 === */
.step-card {
  flex: 1; min-width: 0; margin-bottom: 16px;
  background: #f8f5f0; border-radius: 10px; padding: 18px 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transition: box-shadow 0.2s;
}
.card-done { border-left: 4px solid #059669; }
.card-current { border-left: 4px solid #2563eb; }
.card-pending { border-left: 4px solid #cbd5e1; opacity: 0.7; }

.card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.card-name { font-size: 16px; font-weight: 600; color: #1e293b; }
.card-pending .card-name { color: #64748b; }
.card-guide { font-size: 13px; color: #475569; margin-top: 4px; }

/* 反馈内容 */
.card-progress {
  margin-top: 12px; padding: 12px 14px;
  background: #f0ece6; border-radius: 8px; border: 1px solid #e5ddd4;
}
.progress-label { font-size: 12px; font-weight: 600; color: #64748b; display: block; margin-bottom: 4px; }
.progress-text { margin: 0; font-size: 13px; color: #1e293b; line-height: 1.6; }

.card-time { font-size: 12px; color: #059669; font-weight: 500; margin-top: 8px; }

@media (max-width: 768px) {
  .detail-page { padding: 12px; }
  .summary-card { padding: 16px; }
  .summary-title { font-size: 18px; }
  .summary-meta { flex-direction: column; gap: 4px; }
  .step-card { padding: 14px 16px; }
  .step-marker { width: 28px; }
  .step-dot { width: 28px; height: 28px; font-size: 12px; }
}
</style>
