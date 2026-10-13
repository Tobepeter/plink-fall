import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 800, rolldownOptions: { output: { advancedChunks: { groups: [{ name: 'pixi', test: /pixi/ }, { name: 'react', test: /react|radix|lucide/ }] } } } },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
