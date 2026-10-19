import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // /api へのリクエストを Spring Boot (8080) に転送する（CORS設定不要にするため）
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
