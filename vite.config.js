import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // เอา // ออก

export default defineConfig({
  plugins: [
    react(),
    // เอา /* และ */ ที่เคยคลุมไว้ออก
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false // ตั้งเป็น false ไว้ถูกต้องแล้วครับ จะได้ไม่กวนตอนเทสในเครื่อง แต่ของจริงบนเว็บมันจะทำงาน 100%
      },
      manifest: {
        name: 'Stockify Warehouse Management',
        short_name: 'Stockify',
        description: 'ระบบจัดการคลังสินค้าและสต็อก',
        theme_color: '#0d9488',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/vite.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})