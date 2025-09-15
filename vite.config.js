import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      main: {
        entry: 'electron/main.js', // Electron 主进程入口文件
      },
      preload: {
        input: 'electron/preload.js' // 预加载脚本
      }
    })
  ]
})