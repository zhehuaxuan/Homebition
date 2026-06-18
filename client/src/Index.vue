<style>@import './index.css';</style>
<script setup>
import { useAuthStore } from './stores/auth'
import { ArrowDown } from '@element-plus/icons-vue'

const authStore = useAuthStore()
</script>

<template>
 <!-- 顶部导航栏 -->
 <nav>
        <div class="nav-brand">Homebition</div>
        <ul class="nav-links">
            <li><router-link to="/">首页</router-link></li>
            <li><router-link to="/articles">我的文章</router-link></li>
            <li><router-link to="/tasks">我的任务</router-link></li>
            <li><router-link to="/about">关于我</router-link></li>
        </ul>
        <div class="nav-actions">
            <router-link v-if="!authStore.isLoggedIn()" to="/login" class="nav-login-btn">登录</router-link>
            <el-dropdown v-else trigger="click">
                <span class="user-name">
                    {{ authStore.username }}
                    <el-icon><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="$router.push('/about')">关于我</el-dropdown-item>
                        <el-dropdown-item divided @click="authStore.setLogout(); $router.push('/')">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
        </div>
    </nav>
    <router-view></router-view>
</template>

<style scoped>
.user-name {
    color: var(--accent);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
}
</style>
