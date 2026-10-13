import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validatePublicEnvironment } from './src/lib/publicConfig'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Reject privileged keys before generating a browser bundle.
  validatePublicEnvironment(loadEnv(mode, process.cwd(), 'VITE_'))
  return { plugins: [react(), tailwindcss()] }
})
