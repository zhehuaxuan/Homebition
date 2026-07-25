<template>
  <div class="workflow-form-page">
    <div class="page-header">
      <h2 class="page-title">{{ isEdit ? '编辑工作流' : '新建工作流' }}</h2>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <template v-else>
      <div v-if="isEdit && taskData.status !== 0" class="error-banner">
        该任务已启动或已完成，无法编辑
      </div>

      <el-form
        v-else
        ref="formRef"
        :model="form"
        label-position="top"
        class="workflow-form"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="任务标题" prop="title" :rules="[{ required: true, message: '请输入任务标题' }]">
          <el-input v-model="form.title" placeholder="请输入任务标题" />
        </el-form-item>

        <el-form-item label="任务描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="描述这个任务要做什么" />
        </el-form-item>

        <div class="steps-section">
          <div class="steps-header">
            <span class="steps-title">步骤配置</span>
            <el-button size="small" type="primary" plain @click="addStep">+ 添加步骤</el-button>
          </div>

          <div v-if="form.steps.length === 0" class="empty-steps">
            请添加至少一个步骤
          </div>

          <div v-for="(step, index) in form.steps" :key="index" class="step-card">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-body">
              <div class="step-row">
                <el-form-item
                  label="步骤名称"
                  :prop="'steps.' + index + '.name'"
                  :rules="[{ required: true, message: '请输入步骤名称', trigger: 'blur' }]"
                  class="step-name"
                >
                  <el-input v-model="step.name" placeholder="请输入步骤名称" />
                </el-form-item>
                <el-form-item label="预计耗时" class="step-duration">
                  <el-input v-model="step.estimated_duration" placeholder="例如：15分钟" />
                </el-form-item>
              </div>
              <el-form-item label="操作说明">
                <el-input v-model="step.guide" type="textarea" :rows="2" placeholder="描述这一步如何操作" />
              </el-form-item>
              <div class="step-actions">
                <el-button
                  v-if="form.steps.length > 1"
                  size="small"
                  text
                  type="danger"
                  @click="removeStep(index)"
                >
                  删除
                </el-button>
                <el-button
                  v-if="index > 0"
                  size="small"
                  text
                  @click="moveStep(index, -1)"
                >
                  上移
                </el-button>
                <el-button
                  v-if="index < form.steps.length - 1"
                  size="small"
                  text
                  @click="moveStep(index, 1)"
                >
                  下移
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <el-button @click="$router.push('/about/workflow-tasks')">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建任务' }}
          </el-button>
        </div>
      </el-form>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  title: '',
  description: '',
  steps: []
})

const taskData = ref({})

const addStep = () => {
  form.steps.push({ name: '', guide: '', estimated_duration: '' })
}

const removeStep = (index) => {
  form.steps.splice(index, 1)
}

const moveStep = (index, direction) => {
  const target = index + direction
  if (target < 0 || target >= form.steps.length) return
  const temp = form.steps[target]
  form.steps[target] = form.steps[index]
  form.steps[index] = temp
}

const fetchTask = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const { data } = await axios.get(`/api/workflow-tasks/${route.params.id}`)
    if (data.code === 0) {
      taskData.value = data.data
      form.title = data.data.title || ''
      form.description = data.data.description || ''
      form.steps = (data.data.steps || []).map(s => ({
        name: s.name,
        guide: s.guide || '',
        estimated_duration: s.estimated_duration || ''
      }))
    }
  } catch (err) {
    ElMessage.error('获取任务信息失败')
    router.push('/about/workflow-tasks')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (submitting.value) return
  if (form.steps.length === 0) {
    ElMessage.warning('请添加至少一个步骤')
    return
  }

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      title: form.title,
      description: form.description,
      steps: form.steps
    }

    if (isEdit.value) {
      const { data } = await axios.put(`/api/workflow-tasks/${route.params.id}`, payload)
      if (data.code === 0) {
        ElMessage.success('保存成功')
        router.push('/about/workflow-tasks')
      }
    } else {
      const { data } = await axios.post('/api/workflow-tasks', payload)
      if (data.code === 0) {
        ElMessage.success('创建成功')
        router.push('/about/workflow-tasks')
      }
    }
  } catch (err) {
    ElMessage.error(isEdit.value ? '保存失败' : '创建失败')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchTask)
</script>

<style scoped>
.workflow-form-page { padding: 20px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.page-header { margin-bottom: 16px; }
.page-title { margin: 0; font-size: 20px; font-weight: 600; color: #e2e8f0; }
.loading-text { text-align: center; padding: 60px; color: #64748b; }
.error-banner { background: #fef0f0; color: #f56c6c; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
.workflow-form { max-width: 700px; }

.steps-section { margin-top: 24px; }
.steps-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.steps-title { font-size: 16px; font-weight: 500; color: #e2e8f0; }
.empty-steps { text-align: center; padding: 40px; color: #64748b; border: 1px dashed #334155; border-radius: 8px; }

.step-card {
  display: flex; gap: 12px;
  background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px;
  margin-bottom: 12px;
}
.step-number {
  width: 28px; height: 28px; border-radius: 50%;
  background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; flex-shrink: 0;
}
.step-body { flex: 1; min-width: 0; }
.step-row { display: flex; gap: 12px; }
.step-name { flex: 1; }
.step-duration { width: 160px; flex-shrink: 0; }
.step-actions { display: flex; gap: 4px; justify-content: flex-end; margin-top: 8px; }

.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 32px; padding-top: 20px; border-top: 1px solid #334155; }

@media (max-width: 768px) {
  .workflow-form-page { padding: 12px; }
  .step-row { flex-direction: column; gap: 0; }
  .step-duration { width: 100%; }
  .form-actions { flex-direction: column; }
  .form-actions .el-button { width: 100%; }
}
</style>
