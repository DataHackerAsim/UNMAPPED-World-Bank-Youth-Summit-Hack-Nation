import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // 1. Import the plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/token': 'http://localhost:8000',
      '/profiles': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/risk': 'http://localhost:8000',
      '/opportunities': 'http://localhost:8000',
      '/policy': 'http://localhost:8000',
    },
  },
})