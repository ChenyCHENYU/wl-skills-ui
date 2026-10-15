<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/ChenyCHENYU/wl-skills-ui/main/assets/wl-ui-logo-dark.svg">
    <img alt="WL · World Leading · skills-ui" src="https://raw.githubusercontent.com/ChenyCHENYU/wl-skills-ui/main/assets/wl-ui-logo.svg" width="100%">
  </picture>
</p>

<p align="center"><strong>让 Vue 管理端的颜色、布局和组件表现保持一致，把可检查的 UI 问题变成定位明确、可预览修复、可复验的工程反馈。</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agile-team/wl-skills-ui"><img src="https://img.shields.io/npm/v/@agile-team/wl-skills-ui?color=7053A7" alt="npm" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node-%E2%89%A522-526A81.svg" alt="Node" /></a>
  <a href="https://element-plus.org/"><img src="https://img.shields.io/badge/Vue-3.2%2B%20%7C%20Element%20Plus%202.2%2B-7053A7.svg" alt="Vue / Element Plus" /></a>
</p>

## 解决什么问题

| 场景 | 提供的能力 | 你能看到的结果 |
| --- | --- | --- |
| 新页面风格不统一 | Design Tokens、Element Plus 样式、布局与运行时预设 | 间距、尺寸、颜色和组件行为有共同基准 |
| 老项目封装多、难以改造 | Base / jh / C 组件与可选 AG Grid 适配 | 按项目现有技术接入皮肤，逐步治理 |
| UI 问题反复出现 | 源码扫描、增量检查、规则解释 | 文件、行号、规则、建议和问题数量 |
| 重复机械调整成本高 | 确定性修复、计划哈希、快照与复扫 | 确认可修复项后执行脚本，保留前后差异 |

适用于**已接入的 PC Vue 3 + Element Plus 管理端**。UniApp、小程序、App/PDA、移动 H5 不套用本包规则。工具独立可用；工程目录与接口约定由 Kit 管，Git 钩子和 CI 门禁由 Gate 编排。

## 三步接入

以下命令在**实际业务项目根目录**执行。Node.js 22+ 用于工具；项目仍使用自己的 Vue 和 Element Plus。

### 1. 安装并选对模式

```bash
pnpm add @agile-team/wl-skills-ui
pnpm exec wl-ui init --project . --profile native-element
```

| 模式 | Profile | 适用项目 |
| --- | --- | --- |
| Native：统一样式并使用布局、运行时能力 | `native-element` | 原生 Element Plus，无 AG Grid |
| Native：叠加现有封装与 AG Grid | `native-jh-ag` | 使用 Base / jh / C 封装，保留原生运行时能力 |
| Skin：保留存量结构，接入皮肤与保护 | `legacy-jh-element` | 老项目封装，使用 Element 表格 |
| Skin：保留存量结构，启用 AG Grid 适配 | `legacy-jh-ag` | 明确使用 AG Grid 的老项目 |

`init` 安装 AI 入口、规范与 MCP 配置，记录所选 Profile；不自动改写项目已有 SCSS 和 runtime import。下面以 `native-element` 为例。

### 2. 接入样式和运行时

```scss
// 项目全局样式入口，在项目基础样式之后引入
@use "@agile-team/wl-skills-ui/styles/presets/native-element" as *;
```

```ts
// src/main.ts
import "@agile-team/wl-skills-ui/runtime/profiles/native-element";
```

其他 Profile 的对应入口用 `pnpm exec wl-ui profiles` 查询；只选一组，AG Grid 按项目实际使用开启。

### 3. 检查接入，看到第一份反馈

```bash
pnpm exec wl-ui check --project . --fail-on-error
pnpm exec wl-ui scan --target src --output summary
```

`check` 验证样式、运行时等接入项；`scan` 返回实际文件数、问题数量和规则分布。启动业务项目，打开列表、表单与弹窗确认实际效果；静态扫描不能代替浏览器验收。

## 一个场景：列表页调整后如何闭环

假设修改了 `src/views/order/index.vue`，出现按钮尺寸、控件宽度或表格对齐问题。已接入的 AI 按下面流程调用工具；技术经理也可直接复现。

```bash
# 1. 识别本次任务、目标和待检查项，取得 runId
pnpm exec wl-ui task "修复样式：订单列表页" --target src/views/order/index.vue --json

# 2. 使用返回的 runId 检查同一目标
pnpm exec wl-ui scan --target src/views/order/index.vue --run-id <runId> --output summary

# 3. 修复后复扫，并回查实际结果
pnpm exec wl-ui scan --target src/views/order/index.vue --run-id <runId> --fail-on-error
pnpm exec wl-ui status --run-id <runId> --json
```

| 环节 | 验收点 |
| --- | --- |
| 识别 | `notice` 显示版本、目标、Skill、规则与未检查项 |
| 定位 | 报告给出实际问题；需要明细时再读 `compact-v2` 或 Markdown |
| 修复 | 自动可修复项先 `fix --dry-run` 预览，确认后携带同一 `--plan-hash` 执行；其他问题按建议处理 |
| 复验 | 同目标复扫，核对 `status` 的执行、验证和实际检查范围，再在浏览器验收 |

脚本负责确定性扫描与机械修复，AI 处理布局语义和业务取舍。修复默认保留快照；命令与回滚见 [任务与检查回执](docs/task-observability.md)、`pnpm exec wl-ui --help`。

## 自动执行放在哪里

把 `wl-ui scan --target src --changed --base origin/main --fail-on-error` 接入已配置的 Git 钩子或 CI，开发者提交时获得反馈；`origin/main` 替换为项目实际基线分支。交付阶段保留完整扫描和浏览器验收。使用 Gate 时由 Gate 配置调用本包，统一汇总结果。

本包的 `init` 提供工具与 AI 入口，实际自动调用取决于宿主、钩子和流水线接线。首次接入用一处可定位的问题验证“触发 → 报告 → 修复 → 复扫”，安装成功本身不代表检查已经执行。

## 按需深入

| 需要 | 入口 |
| --- | --- |
| 项目范围、未触发与版本漂移 | [范围配置](docs/project-scope.md) · [任务与回执](docs/task-observability.md) |
| 组件兼容、架构分层与规则 | [兼容矩阵](docs/compat-matrix.md) · [架构边界](standards/architecture/01-layer-boundaries.md) · `wl-ui rules list` |
| 浏览器视觉验收与页面样例沉淀 | [视觉回归](docs/visual-regression.md) · [UI 契约](docs/ui-contract.md) |
| AI / MCP、协议与维护 | [MCP](mcp/README.md) · [维护契约](docs/maintenance-contract.md) · `wl-ui protocol describe --json` |

## WL 系列

**WL · World Leading**。各包按职责独立接入，已接且适用的包可共享任务 `runId`。

| 包 | 职责 |
| --- | --- |
| [skills-gate](https://github.com/ChenyCHENYU/wl-skills-gate) | 项目接入、钩子与 CI 门禁、报告闭环 |
| [skills-kit](https://github.com/ChenyCHENYU/wl-skills-kit) | PC 前端工程与代码规范 |
| **skills-ui** | UI 一致性、扫描与确定性修复 |
| [skills-bd](https://github.com/ChenyCHENYU/wl-skills-bd) | Java 后端契约、生成与质量检查 |
| [skills-test](https://github.com/ChenyCHENYU/wl-skills-test) | 测试规划、执行与验收证据 |
| [skills-design](https://github.com/ChenyCHENYU/wl-skills-design) | 需求、设计与交付文档 |
