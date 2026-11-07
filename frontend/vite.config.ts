import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Prioridad: process.env (lo inyecta docker-compose.dev.yml con .env.dev,
  // valores para contenedor: tienda-backend / host.docker.internal) sobre los
  // .env del proyecto (frontend/.env.development, valores para ejecución sin
  // Docker: localhost). El fallback final es el target de contenedor, que es
  // el modo por defecto de este stack. loadEnv con prefijo '' no fusiona
  // process.env, por eso se consulta primero de forma explícita.
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy =
    process.env.VITE_API_PROXY || env.VITE_API_PROXY || 'http://tienda-backend:3007'
  const authSso =
    process.env.VITE_AUTH_SSO_PROXY ||
    env.VITE_AUTH_SSO_PROXY ||
    'http://host.docker.internal:3006'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5178,
      strictPort: true,
      proxy: {
        '/api': apiProxy,
        '/health': apiProxy,
        '/auth-sso': {
          target: authSso,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-sso/, ''),
        },
      },
    },
  }
})
