import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 主样式
import 'element-plus/dist/index.css'
// 暗黑模式变量（必须）
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './Index.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
