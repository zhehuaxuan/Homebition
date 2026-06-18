<template>
    <div class="login-container">
        <el-card class="login-card">
            <template #header>
                <div class="card-header">
                    <el-button text @click="router.back()">
                        <el-icon><ArrowLeft /></el-icon>
                        返回
                    </el-button>
                    <span class="title">登录</span>
                    <span></span>
                </div>
            </template>
            <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
                <el-form-item label="用户名" prop="username">
                    <el-input
                        v-model="form.username"
                        placeholder="请输入用户名"
                        :prefix-icon="User"
                    />
                </el-form-item>
                <el-form-item label="密码" prop="password">
                    <el-input
                        v-model="form.password"
                        type="password"
                        placeholder="请输入密码"
                        :prefix-icon="Lock"
                        show-password
                    />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" class="login-btn" :loading="loading" @click="handleLogin">
                        登录
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
    username: '',
    password: ''
})

const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
        if (!valid) return

        loading.value = true
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await response.json()
            if (response.ok) {
                authStore.setLogin(data.token, data.user.username)
                ElMessage.success('登录成功')
                router.push('/')
            } else {
                ElMessage.error(data.message || '登录失败')
            }
        } catch (error) {
            ElMessage.error('登录失败，请稍后重试')
        } finally {
            loading.value = false
        }
    })
}
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: calc(100vh - 60px);
    padding: 2rem;
}

.login-card {
    width: 100%;
    max-width: 400px;
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.card-header .title {
    font-size: 1.25rem;
    font-weight: 600;
}

.login-btn {
    width: 100%;
}
</style>
