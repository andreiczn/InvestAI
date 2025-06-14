
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      
      '/predict': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      
      '/analyze-sentiment': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/risk-score': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
