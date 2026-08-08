import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'


export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/realtime': {
        target: 'https://percorsieorari.gtt.to.it',
        changeOrigin: true,
        rewrite: (_path) => '/das_gtfsrt/trip_update.aspx'
      }
    }
  }
})