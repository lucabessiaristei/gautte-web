import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'
import { execSync } from 'child_process'

function resolveGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

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
  },
  define: {
    __GIT_SHA__: JSON.stringify(resolveGitSha()),
  },
})