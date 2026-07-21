<template>
  <div class="flash-input-card">
    <div class="flash-header">
      <span class="flash-title">💡 闪念</span>
    </div>
    <el-input
      v-model="content"
      type="textarea"
      :rows="isFocused ? 4 : 2"
      :placeholder="placeholder"
      class="flash-textarea"
      @focus="isFocused = true"
      @keydown="handleKeydown"
    />
    <div class="flash-footer">
      <span class="flash-hint">Ctrl+Enter 发送，Enter 换行</span>
      <el-button type="primary" :loading="saving" @click="submit">
        记录闪念
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const emit = defineEmits(['saved'])
const props = defineProps({
  placeholder: { type: String, default: '此刻闪过什么念头？写下它...' }
})

const content = ref('')
const isFocused = ref(false)
const saving = ref(false)

const handleKeydown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    submit()
  }
}

const submit = async () => {
  const text = content.value.trim()
  if (!text) {
    ElMessage.warning('请输入内容')
    return
  }
  saving.value = true
  try {
    const { data } = await axios.post('/api/flash-ideas', { content: text })
    if (data.code === 0) {
      ElMessage.success('闪念已记录')
      content.value = ''
      isFocused.value = false
      emit('saved', data.data)
    }
  } catch (err) {
    ElMessage.error('记录失败: ' + (err.response?.data?.message || err.message))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.flash-input-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}
.flash-header {
  margin-bottom: 16px;
}
.flash-title {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
}
.flash-textarea {
  margin-bottom: 12px;
}
.flash-textarea :deep(.el-textarea__inner) {
  background: #0f172a;
  border: 1px solid #334155;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 8px;
  transition: border-color 0.2s;
}
.flash-textarea :deep(.el-textarea__inner:focus) {
  border-color: #409eff;
}
.flash-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flash-hint {
  font-size: 12px;
  color: #64748b;
}
@media (max-width: 768px) {
  .flash-input-card {
    padding: 16px;
    border-radius: 8px;
  }
  .flash-footer {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  .flash-hint {
    text-align: center;
  }
}
</style>
