# PowerHub Development Instructions

本文件约束 `PowerHub` 仓库中的实现。优先保持现有 Electron + Vue 3 + VFluent3 + Pinia 结构，不引入 Vue 2 写法或新的 UI 框架。

## Text And Files

- Windows 下读写文本必须显式使用 UTF-8。PowerShell 禁止依赖默认编码。
- 写文件时使用无 BOM UTF-8；项目中统一使用 LF (`end_of_line = lf`)。
- 修改文件前检查编码与换行；不要批量把已有 LF 文件无理由改成 CRLF。
- 不要在源码中留下乱码、零宽字符或不可见控制字符。

## Project Stack

- 包管理优先使用 Yarn，当前项目使用 `yarn.lock`。
- 渲染层技术栈为 Vue 3、Pinia、Vue Router、VFluent3、SCSS (`sass-embedded`)。
- VFluent3 组件已全局注册，组件名使用 `fv-button`、`fv-text-box`、`fv-panel` 等 kebab-case。
- 图标优先使用 Fabric 图标类：`<i class="ms-Icon ms-Icon--Home"></i>`。
- 不新增 TypeScript，除非仓库整体迁移已明确执行。

## Renderer Structure

- `src/renderer/src/main.js`：只负责创建应用、注册 Pinia、VFluent3、路由和全局 `powerhub.scss`。
- `src/renderer/src/stores/`：Pinia Options Store。全局状态放 `appConfig`、`theme`；业务演示数据放 `workspace`。
- `src/renderer/src/router/`：页面路由统一通过 `tools.AsyncLoad` 懒加载。
- `src/renderer/src/views/`：路由级页面。页面负责组合视图与调用 store，不直接实现持久化细节。
- `src/renderer/src/components/layout/`：应用壳、侧边栏与顶栏。
- `src/renderer/src/components/common/`：跨页面复用展示组件。
- `src/renderer/src/js/`：i18n 数据、语言检测与 `translator.py` 自动化脚本。
- `src/renderer/src/style/`：`global.scss` 与 `fabulous.scss` 保持和 Fab3 一致；PowerHub 项目级全局样式统一放在 `powerhub.scss`。

## Vue Conventions

- 页面和组件中禁止使用原生 `<label>`、`<form>`、`<fieldset>`、`<legend>` 等表单容器标签；使用 `div` 和项目已有表单组件组织布局，避免原生表单的隐式点击与提交行为。
- 使用 `div` 布局时，控件仍需通过组件支持的无障碍属性提供可访问名称。

- 组件必须使用 Options API：`export default { name, components, props, data, computed, methods, ... }`。
- 不要使用 `<script setup>`，不要在新组件里改用 Composition API。
- 组件名使用 PascalCase 文件语义或现有 kebab-case 引用方式；模板中组件名保持项目既有 kebab-case 风格。
- Props 必须有类型与默认值；页面级临时状态放页面，跨页面状态才放 Pinia。
- 不使用 `window.location` 做内部导航，统一使用 `router.push` / `<router-link>`。
- 不在组件内直接读 `localStorage`；持久化交给 `appConfig` store。
- 页面文案不要散落硬编码，至少新增文案必须进入 `src/renderer/src/js/i18n.js`，并在页面通过 `appConfig` 暴露的 `local(...)` 使用。
- 组件中使用 store 时优先用 `mapState` / `mapActions` 映射到 Options API。

## Pinia Conventions

- 使用 Options Store：`defineStore('name', { state, getters, actions })`。
- 状态写在 `state`，派生数据写在 `getters`，状态变更和业务动作写在 `actions`。
- `appConfig` 是唯一应用配置入口，负责默认值、规范化、持久化和文档级主题/语言同步。
- `appConfig.local(text)` 负责根据当前语言解析 `i18n.js` 中的文案；新增文案必须用英文原文作为 key。
- `theme` 参考 Fab3 简化实现：只维护 `themeColor` 与颜色辅助 getter，主题切换委托给 `appConfig`。
- `workspace` 当前为无后端演示数据源。接入真实后端后，页面仍调用 store action，网络逻辑不要下沉到视图组件。
- 本项目不处理时区，不新增时区配置、时区文案或依赖时区的语言推断。
- 不在 store 间制造循环依赖；配置初始化方向保持 `main -> appConfig -> theme/i18n`。

## i18n Conventions

- i18n 数据文件为 `src/renderer/src/js/i18n.js`，结构参考 Fab3：英文原文 key -> `{ en, cn }`。
- 页面显示文案统一调用 `local('English source')`，不要再引入 `stores/i18n.js` 或 `i18n.t(...)`。
- 语言检测文件为 `src/renderer/src/js/language.js`，只根据浏览器 locale 推断，不依靠时区。
- 新增或修改 i18n 后运行 `src/renderer/src/js/translator.py` 自动补齐缺失翻译；脚本参考 Fab3，使用 DeepSeek API。
- 翻译脚本路径与 PowerHub 结构保持一致：`DATA_PATH = "./src/renderer/src/js/i18n.js"`，`SOURCE_PREFIX = "./src/renderer/src"`。

## SCSS Conventions

- `src/renderer/src/style/global.scss` 和 `src/renderer/src/style/fabulous.scss` 保持与 Fab3 一致，不把项目专属样式混进去。
- PowerHub 项目级全局样式统一放在 `src/renderer/src/style/powerhub.scss`，由 `main.js` 引入。
- Vite 的 SCSS `additionalData` 注入 `@use "@/style/global.scss" as *;`，因此组件内可用 Fab3 的 mixin，例如 `@include nowrap`。
- 颜色、背景、边框、文字和阴影优先使用 `--ph-*` CSS 变量，并集中定义在 `powerhub.scss`。
- 组件样式必须使用 `<style lang="scss" scoped>`，除非确实需要全局覆盖并说明原因。
- 深色模式通过 `:root[data-theme="dark"]` 变量覆盖实现；不要在组件中复制整套 dark 样式。
- 避免 `!important`、深层选择器和固定像素大布局；响应式优先断点 `640px`、`880px`、`1180px`。
- 列表、表格必须处理 `min-width: 0`、文本溢出与横向滚动，避免长 URL 撑破布局。

## Product Scope

- 产品方向是 Web 版 ServerCat 类监控体验 + Postman 类请求集合 + 可自定义时间的定时云函数式请求调度。
- 当前没有后端。所有“运行”“健康状态”“历史记录”默认都是本地演示数据，必须明确标记，不得伪装真实请求结果。
- 接入执行器时，定时调度、HTTP 请求、持久化、通知应放在主进程或独立服务层，通过 preload IPC 暴露最小 API。
- 渲染层不得直接获得 Node 任意文件系统/命令执行能力。

## State And Persistence

- 本地持久化键集中定义，当前为 `powerhub.appConfig.v1`。
- 配置更新必须走 `appConfig.updateConfig`、`appConfig.reviseConfig` 或专用 action，确保规范化和持久化一致。
- 新配置字段必须同时更新：默认值、规范化逻辑、i18n 文案、设置页或对应功能。
- `workspace` 的演示数据不要持久化，避免把 mock 数据误认为真实用户数据。

## Routing

- 路由使用 hash history，适配 Electron 打包环境。
- 路由元信息至少包含 `title`；页面内文案通过 `local(...)` 解析。
- 未匹配路由回到 `dashboard`，不得留白屏。
- 页面切换使用懒加载，不在路由文件静态导入大型页面组件。

## Quality Bar

- 提交前至少运行：
    - `yarn lint`
    - `yarn build`
- CSS 警告、Prettier 换行风格警告可以忽略，但不得忽略真实语法、类型、构建或运行时错误。
- 修 UI 时手动检查浅色、深色、窄窗口和长 URL 场景。
- 不用静默失败掩盖错误；对可恢复的存储/解析失败可忽略，但交互错误必须给出可见反馈。
- 保持改动聚焦，不顺手重构无关模块。

## Security

- 默认遵守 Electron 安全边界：`contextIsolation` 开启，renderer 不直接启用 Node。
- 外部链接由主进程 `shell.openExternal` 处理。
- 不把密钥、Token、Cookie 或真实请求头写入示例数据与日志。