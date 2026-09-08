import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/lcp4members/', // ← ВАЖНО: слэши в начале и конце!
})