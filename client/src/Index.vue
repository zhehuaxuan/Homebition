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
        links.push({ path: '/about', label: '后台管理', icon: '⚙️' })
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
        <ul class="nav-links">
            <li><router-link to="/" @click="closeMenu">首页</router-link></li>
            <li><router-link to="/articles" @click="closeMenu">我的文章</router-link></li>
            <li><router-link to="/invest" @click="closeMenu">投资频道</router-link></li>
            <li v-if="authStore.isLoggedIn()"><router-link to="/tasks" @click="closeMenu">我的任务</router-link></li>
            <li v-if="authStore.isLoggedIn()"><router-link to="/about" @click="closeMenu">后台管理</router-link></li>
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
        </div>
    </nav>
    <!-- 手机端遮罩层 -->
    <div v-if="menuOpen" class="mobile-overlay" @click="closeMenu">
        <div class="mobile-menu" @click.stop>
            <button class="mobile-close-btn" @click="closeMenu" aria-label="关闭菜单">
                <span class="close-line"></span>
                <span class="close-line"></span>
            </button>
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

.mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    margin: 0 12px 8px auto;
    background: none;
    border: 1px solid #475569;
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
}
.mobile-close-btn:hover {
    background: #2d3a52;
}
.mobile-close-btn .close-line {
    position: absolute;
    width: 16px;
    height: 2px;
    background: #cbd5e1;
    border-radius: 1px;
}
.mobile-close-btn .close-line:nth-child(1) {
    transform: rotate(45deg);
}
.mobile-close-btn .close-line:nth-child(2) {
    transform: rotate(-45deg);
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
