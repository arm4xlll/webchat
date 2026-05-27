import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

// Build-time version: git short SHA, fallback to timestamp
const buildVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return Date.now().toString(36)
  }
})()

// Write public/version.json so nginx serves it as a static file.
// Frontend polls this to detect new deploys.
const publicDir = resolve(__dirname, 'public')
mkdirSync(publicDir, { recursive: true })
writeFileSync(
  resolve(publicDir, 'version.json'),
  JSON.stringify({ version: buildVersion }),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],

  define: {
    // Injected at build time — the version this bundle was built with
    __APP_VERSION__: JSON.stringify(buildVersion),
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-Accel-Buffering', 'no')
          })
        },
      },
      '/uploads': 'http://localhost:8080',
    },
  },
})
