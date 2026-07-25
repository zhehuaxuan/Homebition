<template>
  <div class="progress-page">
    <div v-if="loading" class="loading-text">加载中...</div>

    <template v-else-if="task">
      <!-- 未启动 -->
      <div v-if="task.status === 0" class="state-box">
        <p>任务尚未启动</p>
        <el-button type="primary" @click="handleStart">启动任务</el-button>
        <el-button @click="$router.push('/about/workflow-tasks')">返回列表</el-button>
      </div>

      <!-- 已完成 -->
      <div v-else-if="task.status === 2" class="state-box">
        <h3>🎉 全部完成</h3>
        <p>所有步骤已闭环</p>
        <el-button type="primary" @click="$router.push('/about/workflow-tasks')">返回列表</el-button>
      </div>

      <!-- 进行中 -->
      <template v-else>
        <div class="top-bar">
          <el-button text @click="$router.push('/about/workflow-tasks')">← 返回</el-button>
          <h2 class="task-title">{{ task.title }}</h2>
        </div>

        <!-- 步骤进度条 -->
        <div class="steps-wrapper">
          <el-steps :active="activeStepIndex" align-center class="steps-bar">
            <el-step
              v-for="step in task.steps"
              :key="step.id"
              :title="step.name"
              :status="step.status === 2 ? 'success' : (step.status === 1 ? 'process' : 'wait')"
            />
          </el-steps>
        </div>

        <!-- 当前步骤反馈卡 -->
        <div v-if="currentStep" class="step-card">
          <div class="step-card-header">
            <span class="step-label">步骤 {{ currentStep.step_order }}</span>
            <h3 class="step-name">{{ currentStep.name }}</h3>
          </div>

          <div v-if="currentStep.guide" class="step-guide">{{ currentStep.guide }}</div>
          <div v-if="currentStep.estimated_duration" class="step-duration">⏱ {{ currentStep.estimated_duration }}</div>

          <div class="feedback-area">
            <label class="feedback-label">进展反馈</label>
            <el-input
              v-model="progressText"
              type="textarea"
              :rows="4"
              placeholder="描述这一步的完成情况..."
            />
          </div>

          <div class="step-actions">
            <el-button @click="$router.push('/about/workflow-tasks')">取消</el-button>
            <el-button
              type="primary"
              :disabled="!progressText.trim()"
              :loading="completing"
              @click="handleComplete"
            >
              {{ isLastStep ? '完成并闭环' : '完成本步骤' }}
            </el-button>
          </div>
        </div>

        <div v-else class="state-box">
          <p>无法获取当前步骤信息</p>
          <el-button @click="$router.push('/about/workflow-tasks')">返回列表</el-button>
        </div>
      </template>
    </template>

    <!-- 闭环弹窗 -->
    <el-dialog v-model="completedDialogVisible" title="任务完成" width="360px" :close-on-click-modal="false" destroy-on-close>
      <div class="dialog-body">
        <p>🎉 所有步骤已完成，任务已闭环！</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="$router.push('/about/workflow-tasks')">返回列表</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const completing = ref(false)
const progressText = ref('')
const completedDialogVisible = ref(false)
const task = ref(null)

const activeStepIndex = computed(() => {
  if (!task.value?.steps) return 0
  const idx = task.value.steps.findIndex(s => s.status === 1)
  return idx >= 0 ? idx : task.value.steps.filter(s => s.status === 2).length
})

const currentStep = computed(() => {
  return task.value?.steps?.find(s => s.status === 1) || null
})

const isLastStep = computed(() => {
  return currentStep.value?.step_order === task.value?.total_steps
})

const fetchTask = async () => {
  loading.value = true
  try {
    const { data } = await axios.get(`/api/workflow-tasks/${route.params.id}`)
    if (data.code === 0) task.value = data.data
  } catch {
    ElMessage.error('获取任务信息失败')
    router.push('/about/workflow-tasks')
  } finally {
    loading.value = false
  }
}

const handleStart = async () => {
  try {
    const { data } = await axios.post(`/api/workflow-tasks/${task.value.id}/start`)
    if (data.code === 0) {
      ElMessage.success('任务已启动')
      await fetchTask()
    }
  } catch {
    ElMessage.error('启动失败')
  }
}

const handleComplete = async () => {
  if (!progressText.value.trim() || completing.value) return
  completing.value = true
  try {
    const { data } = await axios.post(
      `/api/workflow-tasks/${task.value.id}/step/${currentStep.value.id}/complete`,
      { progress: progressText.value.trim() }
    )
    if (data.code === 0) {
      if (data.data.completed) {
        completedDialogVisible.value = true
      } else {
        ElMessage.success('步骤已完成！')
        progressText.value = ''
        await fetchTask()
      }
    }
  } catch {
    ElMessage.error('提交失败')
  } finally {
    completing.value = false
  }
}

onMounted(fetchTask)
</script>

<style scoped>
.progress-page { padding: 24px 32px; max-width: 720px; margin: 0 auto; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.loading-text { text-align: center; padding: 60px; color: #64748b; }

.top-bar { margin-bottom: 8px; }
.task-title { margin: 4px 0 24px; font-size: 20px; font-weight: 600; color: #1e293b; }

.steps-wrapper { overflow-x: auto; margin-bottom: 32px; }
.steps-bar { min-width: 0; }
:deep(.el-step) { flex-shrink: 1; min-width: 0; }
:deep(.el-step__title) {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 13px;
}
:deep(.el-step__main) { overflow: hidden; }

.step-card {
  background: #f8f5f0; border-radius: 10px; padding: 24px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  border-left: 4px solid #2563eb;
}
.step-card-header { margin-bottom: 16px; }
.step-label {
  display: inline-block; font-size: 12px; font-weight: 500;
  color: #409eff; background: rgba(64, 158, 255, 0.1);
  padding: 2px 10px; border-radius: 4px; margin-bottom: 8px;
}
.step-name { margin: 0; font-size: 20px; font-weight: 600; color: #1e293b; }

.step-guide {
  font-size: 14px; color: #475569; line-height: 1.7;
  padding: 12px 16px; background: #f0ece6; border-radius: 8px; margin-bottom: 8px;
}
.step-duration { font-size: 13px; color: #475569; margin-bottom: 20px; }

.feedback-area {
  margin-bottom: 20px; padding: 16px;
  background: #f0ece6; border-radius: 8px; border: 1px solid #e5ddd4;
}
.feedback-label { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; }

:deep(.feedback-area .el-textarea__inner) {
  background: #f8f5f0; color: #1e293b; border-color: #e5ddd4;
}
:deep(.feedback-area .el-textarea__inner:focus) {
  border-color: #409eff; background: #fff;
}

.step-actions { display: flex; gap: 12px; justify-content: flex-end; }

.state-box {
  text-align: center; padding: 60px 20px;
  background: #f8f5f0; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.state-box p { font-size: 15px; margin-bottom: 20px; color: #475569; }
.state-box h3 { font-size: 20px; color: #1e293b; margin: 0 0 8px; }

.dialog-body { text-align: center; padding: 12px 0; }
.dialog-body p { font-size: 16px; color: #1e293b; }

@media (max-width: 768px) {
  .progress-page { padding: 12px; }
  .step-card { padding: 16px; }
  .step-actions { flex-direction: column; }
  .step-actions .el-button { width: 100%; }
}
</style>
