<template>
    <div class="mail-test-container">
        <el-card>
            <template #header>
                <div class="card-header">
                    <span>邮件测试</span>
                </div>
            </template>
            <el-form ref="formRef" :model="form" label-width="80px">
                <el-form-item label="收件人">
                    <el-input v-model="form.to" placeholder="请输入收件人邮箱" />
                </el-form-item>
                <el-form-item label="主题">
                    <el-input v-model="form.subject" placeholder="请输入邮件主题" />
                </el-form-item>
                <el-form-item label="内容">
                    <el-input
                        v-model="form.content"
                        type="textarea"
                        :rows="6"
                        placeholder="请输入邮件内容（支持 HTML）"
                    />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" :loading="loading" @click="handleSend">
                        发送邮件
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const formRef = ref(null)
const loading = ref(false)

const form = reactive({
    to: 'zhehuaxuan@aliyun.com',
    subject: '测试邮件',
    content: '<p>这是一封测试邮件</p>'
})

const handleSend = async () => {
    if (!form.to || !form.subject || !form.content) {
        ElMessage.warning('请填写完整信息')
        return
    }

    loading.value = true
    try {
        const response = await axios.post('/api/auth/send-mail', {
            to: form.to,
            subject: form.subject,
            content: form.content
        })
        if (response.data.code === 0) {
            ElMessage.success('邮件发送成功')
        } else {
            ElMessage.error(response.data.message || '发送失败')
        }
    } catch (error) {
        ElMessage.error(error.response?.data?.message || '发送失败')
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.mail-test-container {
    padding: 20px;
    max-width: 600px;
    margin: 0 auto;
}

.card-header {
    font-size: 1.25rem;
    font-weight: 600;
}
</style>
