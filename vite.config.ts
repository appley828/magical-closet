import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/magical-closet/', 
  plugins: [
    react(),
    tailwindcss()
  ],
})