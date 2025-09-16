import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'

export default defineConfig({
  base: './', // 确保资源路径是相对路径
  plugins: [
    vue(),
    // electron({
    //   main: {
    //     entry: 'electron/main.js',
    //   },
    //   preload: {
    //     input: 'electron/preload.js',
    //   },
    // }),
  ],
})