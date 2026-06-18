import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 主样式
import 'element-plus/dist/index.css'
// 暗黑模式变量（必须）
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './Index.vue'
import router from './router'
// Element Plus 图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 全局注册图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

app.use(createPinia())
app.use(router)

app.mount('#app')
