import { cpSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

// 把 drizzle 迁移 SQL 目录复制进主进程构建产物，
// 使打包后 join(__dirname, 'db/migrations') 仍能命中文件。
function copyMigrationsPlugin() {
  return {
    name: 'powerhub-copy-migrations',
    closeBundle() {
      cpSync(
        resolve('src/main/db/migrations'),
        resolve('out/main/db/migrations'),
        { recursive: true }
      )
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMigrationsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/style/global.scss" as *;`
        }
      }
    },
    plugins: [vue()]
  }
})