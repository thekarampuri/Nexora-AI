import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/system': 'http://localhost:5001',
      '/api/app': 'http://localhost:5001',
      '/api/web': 'http://localhost:5001',
      '/api/news': 'http://localhost:5001',
      '/api/automation': 'http://localhost:5001',
      '/api': 'http://localhost:5000',
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true
      }
    }
  }
})
