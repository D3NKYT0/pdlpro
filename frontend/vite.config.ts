import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/services/types/**', 'src/main.tsx'],
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      thresholds: {
        lines: 69,
        statements: 66,
        functions: 57,
        branches: 53,
        'src/services/domain/**': { lines: 95, statements: 95, functions: 95, branches: 85 },
        'src/services/infra/http.ts': { lines: 95, statements: 95, functions: 100, branches: 85 },
      },
    },
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
