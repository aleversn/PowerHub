<div align="center">
  <img src="./src/renderer/src/assets/logo_acrylic.png" width="180" alt="PowerHub logo" />
  <h1>PowerHub</h1>
  <p>跨平台的服务器监控与 API 自动化工作台</p>
</div>

PowerHub 是一个面向个人使用的桌面项目，结合 ServerCat 风格的服务器监控、Postman 风格的请求集合，以及可视化接口编排和定时执行。项目基于 Electron 和 Vue 3，提供 Windows 和 macOS 桌面打包能力。

## 功能

- 管理服务器并通过 SSH 查看服务器状态。
- 管理 API 请求、集合和变量，发送请求并查看响应。
- 使用可视化流程编排集合中的请求，配置节点依赖与延迟。
- 通过五字段 cron 表达式定时执行请求或流程，查看运行记录。
- 本地 SQLite 工作区、浅色与深色主题、中英文界面。

项目仍在开发中。首次启动会创建演示数据；实际请求和 SSH 操作会访问配置的目标。定时任务由桌面应用进程执行，应用退出时不会在后台继续运行，不是托管云服务。

## 开始使用

需要 Node.js 20、Yarn 1.x 和可用的原生模块构建环境。

```bash
yarn install --frozen-lockfile
yarn dev
```

下载预构建版本请访问 [GitHub Releases](https://github.com/aleversn/PowerHub/releases)。更多构建、架构和发布说明见 [开发者文档](./docs/development.md)。

## 技术栈

Electron、Vue 3、Vite、Pinia、Vue Router、VFluent3、SQLite / Drizzle ORM 和 electron-builder。
