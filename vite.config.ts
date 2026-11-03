import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { validatePublicEnvironment } from './src/lib/publicConfig'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Reject privileged keys before generating a browser bundle.
  const config=validatePublicEnvironment(loadEnv(mode, process.cwd(), 'VITE_'))
  if(process.env.REGMODELER_RELEASE_BUILD==='1'&&(!config||new URL(config.url).protocol!=='https:'||['localhost','127.0.0.1','[::1]'].includes(new URL(config.url).hostname))) {
    throw new Error('Release builds require a hosted HTTPS Supabase URL and a public publishable/anon key. Configure both public values before publishing.')
  }
  return { plugins: [react(), tailwindcss()] }
})
