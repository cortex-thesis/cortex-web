import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), svgr()],
  base: mode === 'development' ? '/' : '/static/',
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../frontend_dist',
    emptyOutDir: true,
    manifest: true,
  },
}))
