import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Force rebuild: 2026-02-06
export default defineConfig({
  plugins: [react()],
})
