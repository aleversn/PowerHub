import { defineConfig } from 'drizzle-kit';

// drizzle-kit 用于生成 SQL 迁移文件（drizzle-kit generate）。
// 运行时迁移由 src/main/db/index.js 在应用启动时执行。
export default defineConfig({
    dialect: 'sqlite',
    schema: './src/main/db/schema.js',
    out: './src/main/db/migrations',
    // 仅用于 drizzle-kit studio / push 的本地调试路径，运行时使用 userData 目录。
    dbCredentials: {
        url: './.drizzle/app.db'
    },
    verbose: true,
    strict: true
});