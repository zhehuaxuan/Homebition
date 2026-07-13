import { ref } from 'vue'
import { defineStore } from 'pinia'

const INACTIVITY_TIMEOUT = 20 * 60 * 1000 // 20分钟

export const useAuthStore = defineStore('auth', () => {
    const token = ref(sessionStorage.getItem('token') || '')
    const username = ref(sessionStorage.getItem('username') || '')
    const lastActivity = ref(parseInt(sessionStorage.getItem('lastActivity') || '0'))

    let inactivityTimer = null

    const isLoggedIn = () => {
        if (!token.value) return false
        // 检查是否过期
        if (lastActivity.value && Date.now() - lastActivity.value > INACTIVITY_TIMEOUT) {
            setLogout()
            return false
        }
        return true
    }

    const updateActivity = () => {
        lastActivity.value = Date.now()
        sessionStorage.setItem('lastActivity', lastActivity.value.toString())
        resetInactivityTimer()
    }

    const resetInactivityTimer = () => {
        if (inactivityTimer) {
            clearTimeout(inactivityTimer)
        }
        if (token.value) {
            inactivityTimer = setTimeout(() => {
                setLogout()
                // 通知页面需要重新登录
                window.dispatchEvent(new CustomEvent('session-expired'))
            }, INACTIVITY_TIMEOUT)
        }
    }

    const setLogin = (newToken, newUsername) => {
        token.value = newToken
        username.value = newUsername
        sessionStorage.setItem('token', newToken)
        sessionStorage.setItem('username', newUsername)
        updateActivity()
    }

    const setLogout = () => {
        token.value = ''
        username.value = ''
        lastActivity.value = 0
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('username')
        sessionStorage.removeItem('lastActivity')
        if (inactivityTimer) {
            clearTimeout(inactivityTimer)
            inactivityTimer = null
        }
    }

    // 初始化时启动定时器
    if (token.value) {
        updateActivity()
    }

    // 监听用户活动
    const setupActivityListeners = () => {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
        events.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true })
        })
    }

    // 启动监听
    setupActivityListeners()

    return { token, username, isLoggedIn, setLogin, setLogout, updateActivity }
})
