<template>
  <div class="page-container">
    <h2 class="page-title">关于我</h2>

    <!-- 展示模式 -->
    <div v-if="!isEdit" class="preview-box">
      <div class="content">{{ profile }}</div>
      <el-button type="primary" style="margin-top: 12px" @click="startEdit">
        编辑
      </el-button>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="edit-box">
      <el-input
        v-model="profile"
        type="textarea"
        :rows="isMobile ? 10 : 20"
        placeholder="请输入你的个人简介"
      />
      <div style="margin-top: 12px; display: flex; gap: 10px">
        <el-button type="primary" @click="saveProfile">保存</el-button>
        <el-button @click="cancelEdit">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 编辑状态
const isEdit = ref(false)
// 个人简介
const profile = ref('')
// 是否移动端
const isMobile = ref(window.innerWidth <= 768)

// 从后端获取个人简介
const fetchProfile = async () => {
  try {
    const { data } = await axios.get('/api/auth/profile')
    if (data.code === 0) {
      profile.value = data.data.profile || ''
    }
  } catch (err) {
    console.error('获取个人简介失败', err)
  }
}

// 初始化：从后端读取
onMounted(() => {
  fetchProfile()
})

// 开始编辑
const startEdit = () => {
  isEdit.value = true
}

// 取消编辑
const cancelEdit = () => {
  isEdit.value = false
}

// 保存到后端
const saveProfile = () => {
  if (!profile.value.trim()) {
    ElMessage.warning('简介内容不能为空')
    return
  }
  axios.put('/api/auth/profile', { profile: profile.value }).then(() => {
    isEdit.value = false
    ElMessage.success('保存成功')
  }).catch(() => {
    ElMessage.error('保存失败')
  })
}
</script>

<style scoped>
/* 统一页面样式 - 深色背景专用 */
.page-container {
  padding: 20px;
  border-radius: 8px;
  /* 去掉容器背景和阴影 */
  background: transparent !important;
  box-shadow: none !important;
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff; /* 标题白色 */
}

/* 预览框 - 无背景、无边框 */
.preview-box {
  padding: 14px 0;
  background: transparent !important;
  min-height: 120px;
}

.content {
  font-size: 15px;
  line-height: 1.7;
  color: #fff !important; /* 文字白色 */
  white-space: pre-wrap;
}

.edit-box {
  padding: 14px 0;
}
</style>