import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 6004,
    proxy: {
      '/api': {
        target: 'http://120.48.51.185:6003',
        changeOrigin: true
      }
    }
  }
})
