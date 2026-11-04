# PowerHub 开发者文档

## 环境与启动

- Node.js 22 或更新版本（CI 使用 Node 22）和 Yarn 1.x。
- Windows 或 macOS，用于对应平台的桌面构建和验证。
- `better-sqlite3` 是原生模块；安装时可能需要 Python 和平台 C++ 编译工具。

```bash
yarn install --frozen-lockfile
yarn dev
```

常用命令：

```bash
yarn lint          # ESLint
yarn build         # 构建主进程、preload 和渲染层
yarn start         # 预览构建结果
yarn build:unpack  # 打包目录
yarn build:win     # Windows 安装包
yarn build:mac     # macOS DMG 和 ZIP
yarn build:linux   # Linux 打包配置，发布流程目前不构建 Linux
```

提交前运行 `yarn lint` 和 `yarn build`。原生模块需针对目标 Electron 和目标平台构建，建议在目标系统上打包。

## 目录与架构

```text
src/main/                 Electron 主进程：IPC、HTTP、SSH、调度及数据访问
src/main/db/              SQLite schema 和 Drizzle 迁移
src/preload/              主进程与渲染层之间的桥接
src/renderer/src/views/   路由页面
src/renderer/src/stores/  Pinia 状态与业务入口
src/renderer/src/js/      国际化和语言检测
src/renderer/src/style/   全局样式与主题变量
build/                    应用图标和打包资源
.github/workflows/        发布工作流
```

启动时主进程打开 Electron `userData` 目录下的 `powerhub.db`、应用迁移并初始化演示数据。构建插件将迁移文件复制到 `out/main/db/migrations`，打包时需要保留该目录。配置由 `appConfig` 管理；工作区数据通过 preload IPC 与主进程交互。修改数据库结构时请同步维护 Drizzle 迁移，并验证已有数据库升级。

HTTP 请求、SSH 和调度在主进程中运行。调度器随应用启动和退出，关闭应用期间不会执行任务。请使用专门的测试目标验证真实请求，避免将密钥、Token 或真实请求头加入示例和日志。

开发约定以仓库根目录的 [AGENTS.md](../AGENTS.md) 为准。新增界面文案进入 `src/renderer/src/js/i18n.js`，并按该文件中的约定运行翻译脚本。

## 图标与打包

`src/renderer/src/assets/logo_acrylic.png` 是图标源文件；`build/icon.ico` 和 `build/icon.icns` 分别供 Windows 和 macOS 使用，`build/icon.png` 供 Linux 使用。打包配置位于 `electron-builder.yml`。当前应用尚未签名或公证，未签名的构建可能触发系统安全提示。macOS 自动更新依赖应用签名，现有未签名构建需从 Releases 手动下载安装。

## GitHub 发布

参照 Fabulous，推送 `v*` 标签触发 Windows 和 macOS 构建，包含 `beta` 的标签创建预发布，其余标签创建正式发布。标签必须与 `package.json` 的版本一致。工作流使用仓库的 `GITHUB_TOKEN` 上传构建产物，无需额外发布密钥。

```bash
yarn release:stable  # 提升补丁版本并创建 Git 标签
# 或 yarn release:beta
git push
git push --tags
```

工作流为构建进程设置 4 GB 的 Node 堆上限。Windows NSIS 安装包和 macOS DMG / ZIP 分别构建：任一平台成功后即可将其产物上传到同一个 GitHub Release，不受另一平台失败影响。发布步骤串行更新 Release，避免同时创建或修改时发生冲突。当前构建未签名、未公证；发布前应在对应系统验证安装、原生 SQLite 模块、数据库迁移及应用启动。设置页通过主进程的 electron-updater 检查 GitHub Release、下载更新并由用户主动重启安装；开发模式不会执行更新。发布包需同时上传对应平台的更新清单（Windows 的 `latest.yml`、macOS 的 `latest-mac.yml`，预发布使用对应渠道名）及其引用的安装包和 blockmap。现有版本没有内置更新能力，需要先手动安装含更新功能的新版本。

如需启用 macOS 自动安装更新，可在 GitHub Actions 中配置 `APP_P12`（Developer ID Application 证书的 Base64 内容）和 `CSC_KEY_PASSWORD`；工作流会在证书可用时签名，仍需自行配置 Apple 公证并在实际 macOS 设备上验证完整升级流程。签名证书必须适用于已安装版本及后续更新。
