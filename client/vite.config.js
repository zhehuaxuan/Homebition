import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import vueJsx from '@vitejs/plugin-vue-jsx'
// import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    // 修复 AutoImport 配置：移除 imports 里的 element-plus
    AutoImport({
      resolvers: [ElementPlusResolver()], // 这里负责 Element Plus API 自动导入
      imports: ['vue'], // 只保留 vue 预设（element-plus 不需要加在这里）
      dts: true // 生成自动导入声明文件（可选）
    }),
    Components({
      resolvers: [
        ElementPlusResolver({ importStyle: 'sass' }) // 组件自动导入+样式导入
      ]
    }),
    vueJsx(),
    // vueDevTools(),
  ],
  optimizeDeps: {
    include: ['vue', 'element-plus']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  }, server: {
    host: true, // 👈 必须加这个！允许 127.0.0.1 访问
    port: 5173
  }
})