import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
