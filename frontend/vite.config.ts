import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy = env.VITE_API_PROXY || 'http://tienda-backend:3007'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5178,
      strictPort: true,
      proxy: {
        '/api': apiProxy,
        '/health': apiProxy,
      },
    },
  }
})
