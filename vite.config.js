import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
    build: {
      outDir: "ugc-reader",
    },
    base: '/ugc-reader/',
  server: {
    host: '0.0.0.0',
    port: 5180,
    proxy: {
      '/api': {
        // target: 'http://192.168.0.90:4000', //本地测试用
        target: 'http://8.155.52.59:8088',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})