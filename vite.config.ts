import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/magical-closet/', // 確保路徑與你的 GitHub 專案名稱一致
  plugins: [
    react(),
    tailwindcss()
  ],
})
