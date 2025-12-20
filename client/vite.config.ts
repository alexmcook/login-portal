import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const host = process.env.NODE_ENV === 'production' ? 'api' : 'localhost';
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://${host}:3000`,
        changeOrigin: true
      }
    }
  }
})
