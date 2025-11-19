import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Копируем static.json в dist для Render.com
    copyPublicDir: true,
  },
  // Для правильной работы SPA на Render
  base: '/',
  // Убеждаемся, что public файлы копируются
  publicDir: 'public',
})
