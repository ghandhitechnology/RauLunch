import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: { alias: { '@shared': resolve('src/shared') } },
    build: {
      // 컨트롤러 창과, 캡처 전용 숨은 창 — 두 개의 엔트리.
      rollupOptions: {
        input: {
          controller: resolve('src/renderer/controller.html'),
          wallpaper: resolve('src/renderer/wallpaper.html'),
        },
      },
    },
  },
})
