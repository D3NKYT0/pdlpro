import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      ignored: ['**/public/item-icons/**'],
    },
    proxy: {
      '/api': {
        target: process.env.PDL_API_TARGET || (process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
      },
      '/admin': {
        target: process.env.PDL_API_TARGET || (process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
      },
      '/media': {
        target: process.env.PDL_API_TARGET || (process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.PDL_API_TARGET || (process.env.DOCKER === 'true' ? 'http://backend:8000' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
