<style>@import './index.css';</style>
<script setup>
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const handleSessionExpired = () => {
    authStore.setLogout()
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
}

const menuOpen = ref(false)

function toggleMenu() {
    menuOpen.value = !menuOpen.value
}

function closeMenu() {
    menuOpen.value = false
}

const mobileLinks = computed(() => {
    const links = [
        { path: '/', label: '首页', icon: '🏠' },
        { path: '/articles', label: '我的文章', icon: '📝' },
        { path: '/invest', label: '投资频道', icon: '💰' },
    ]
    if (authStore.isLoggedIn()) {
        links.push({ path: '/tasks', label: '我的任务', icon: '✅' })
        links.push({ path: '/about', label: '关于我', icon: '👤' })
    }
    if (!authStore.isLoggedIn()) {
        links.push({ path: '/login', label: '登录', icon: '🔑' })
    }
    return links
})

onMounted(() => {
    window.addEventListener('session-expired', handleSessionExpired)
})

onUnmounted(() => {
    window.removeEventListener('session-expired', handleSessionExpired)
})
</script>

<template>
 <!-- 顶部导航栏 -->
 <nav>
        <div class="nav-brand">Homebition</div>
        <!-- 桌面端导航链接 -->
        <ul class="nav-links" :class="{ 'nav-open': menuOpen }">
            <li><router-link to="/" @click="closeMenu">首页</router-link></li>
            <li><router-link to="/articles" @click="closeMenu">我的文章</router-link></li>
            <li><router-link to="/invest" @click="closeMenu">投资频道</router-link></li>
            <li v-if="authStore.isLoggedIn()"><router-link to="/tasks" @click="closeMenu">我的任务</router-link></li>
            <li v-if="authStore.isLoggedIn()"><router-link to="/about" @click="closeMenu">关于我</router-link></li>
        </ul>
        <div class="nav-actions">
            <router-link v-if="!authStore.isLoggedIn()" to="/login" class="nav-login-btn" @click="closeMenu">登录</router-link>
            <el-dropdown v-else trigger="click">
                <span class="user-name">
                    {{ authStore.username }}
                    <el-icon><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="$router.push('/about'); closeMenu()">关于我</el-dropdown-item>
                        <el-dropdown-item divided @click="authStore.setLogout(); $router.push('/')">退出登录</el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
            <!-- 汉堡菜单按钮（手机端显示） -->
            <button class="hamburger-btn" @click="toggleMenu" aria-label="菜单">
                <span class="hamburger-line" :class="{ open: menuOpen }"></span>
                <span class="hamburger-line" :class="{ open: menuOpen }"></span>
                <span class="hamburger-line" :class="{ open: menuOpen }"></span>
            </button>
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path></svg>
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>
        </div>
    </nav>
    <!-- 手机端遮罩层 -->
    <div v-if="menuOpen" class="mobile-overlay" @click="closeMenu">
        <div class="mobile-menu" @click.stop>
            <router-link v-for="link in mobileLinks" :key="link.path" :to="link.path" class="mobile-menu-item" @click="closeMenu">
                <span class="mobile-menu-icon">{{ link.icon }}</span>
                <span>{{ link.label }}</span>
            </router-link>
            <div v-if="authStore.isLoggedIn()" class="mobile-menu-item mobile-logout" @click="authStore.setLogout(); closeMenu(); $router.push('/')">
                <span class="mobile-menu-icon">🚪</span>
                <span>退出登录</span>
            </div>
        </div>
    </div>
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

/* 汉堡菜单按钮 */
.hamburger-btn {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    flex-direction: column;
    gap: 4px;
}

.hamburger-line {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--text-secondary);
    border-radius: 2px;
    transition: all 0.3s;
}

.hamburger-line.open:nth-child(1) {
    transform: rotate(45deg) translate(4px, 4px);
}
.hamburger-line.open:nth-child(2) {
    opacity: 0;
}
.hamburger-line.open:nth-child(3) {
    transform: rotate(-45deg) translate(4px, -4px);
}

/* 手机遮罩 + 菜单 */
.mobile-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 1000;
}

.mobile-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: #1e293b;
    padding: 20px 0;
    overflow-y: auto;
}

.mobile-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    color: #cbd5e1;
    text-decoration: none;
    font-size: 16px;
    transition: background 0.2s;
}
.mobile-menu-item:hover {
    background: #2d3a52;
    color: #a5b4fc;
}
.mobile-menu-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
}
.mobile-logout {
    border-top: 1px solid #334155;
    margin-top: 8px;
    padding-top: 16px;
    color: #f56c6c;
}

@media (max-width: 768px) {
    .hamburger-btn {
        display: flex;
    }
    .mobile-overlay {
        display: block;
    }
    .nav-links {
        display: none;
    }
}
</style>
