import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 主样式
import 'element-plus/dist/index.css'
// 暗黑模式变量（必须）
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './Index.vue'
import router from './router'
import axios from 'axios'
// Element Plus 图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// axios 全局配置：自动附带 token + 请求计时
axios.interceptors.request.use(config => {
    const token = sessionStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    config.meta = { startTime: Date.now() }
    return config
})

// 响应拦截器：401 时触发登录过期事件 + API 日志
axios.interceptors.response.use(
    response => {
        const duration = Date.now() - response.config.meta.startTime
        const { method, url } = response.config
        const methodUpper = (method || 'GET').toUpperCase()
        let detail = ''
        if (response.data && Array.isArray(response.data.rows)) {
            detail = ` [rows=${response.data.rows.length}]`
        }
        console.log(`[API] ${methodUpper} ${url} → ${response.status} (${duration}ms)${detail}`)
        return response
    },
    error => {
        if (error.config && error.config.meta) {
            const duration = Date.now() - error.config.meta.startTime
            const methodUpper = (error.config.method || 'GET').toUpperCase()
            const url = error.config.url || ''
            if (!error.response) {
                console.error(`[API] ${methodUpper} ${url} → NETWORK_ERROR (${duration}ms)`, error.message)
            }
        }
        if (error.response?.status === 401) {
            sessionStorage.removeItem('token')
            sessionStorage.removeItem('username')
            sessionStorage.removeItem('lastActivity')
            window.dispatchEvent(new CustomEvent('session-expired'))
        }
        return Promise.reject(error)
    }
)

const app = createApp(App)

// 全局注册图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(createPinia())
app.use(router)

app.mount('#app')
