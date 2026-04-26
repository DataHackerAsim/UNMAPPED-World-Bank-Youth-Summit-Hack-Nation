/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// NOTE on dev proxy: there used to be a proxy block here forwarding paths
// like /profiles, /risk, /opportunities, /policy to http://localhost:8000.
// Those paths *also* exist as SPA routes in the React app, so a hard refresh
// (Ctrl+R) on any of them caused Vite to proxy the navigation request to the
// backend instead of serving index.html — the backend returned 401 JSON for
// the unauthenticated navigation and Chrome rendered "This page isn't
// working right now". The frontend already talks to the API directly via
// VITE_API_URL, so the proxy was unused. Removed.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
})
