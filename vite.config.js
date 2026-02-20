import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth']
  },
  server: {
    host: '0.0.0.0',
    //port: 4000,
  },
  resolve: {
    alias: {
      '@mui/material/Grid2': '@mui/material/Grid',
    }
  }
})
