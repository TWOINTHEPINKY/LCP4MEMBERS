import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/LCP4MEMBERS/', // ← ВАЖНО: имя вашего репозитория
})