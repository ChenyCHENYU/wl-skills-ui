# 版本摘要

本页保留面向使用者的版本能力摘要；逐提交级变更、修复细节和旧版本记录见根目录 [`CHANGELOG.md`](../CHANGELOG.md)。

## v1.11.1 — 空态守护不再锁死上下分栏手柄

- 上下分栏（`jh-drag-row`）内任意一侧表格为空时，手柄仍可自由拖动：空态守护只给持有空表格的 pane 设置内容需求地板（非表格内容实测高度 + 160px 最小数据区），不再按初始高度快照钉死全部 pane。
- 空态提示保护、分屏根滚动、左右分栏同高语义与卸载清理行为保持不变；左右分栏（`drag-col`）路径零改动。

## v1.11.0 — 精确扫描、低 token 与 UI 语义契约

- 原生 Element Plus Date/Time Picker Teleport 面板几何隔离，新增 R042、结构 fixture 和 Chrome/Edge 计算样式契约，避免裸 `.el-date-picker` 规则导致全屏。
- Element Table、AG Grid、分组表头和 renderer 全轴对齐；`defineColumns()` 默认居中并尊重显式 left/right 与动态 style。
- 普通按钮默认 small + 语义 icon；R005/R041 与 fixer 只对确定性静态场景自动收敛。
- `compact` 报告、Git changed-only、标签/行号缓存和 MCP 默认低 token 输出。
- `--parser auto|fast|sfc`：项目本地 compiler-sfc 精确解析，以及支持嵌套 template、多 style/script 的零依赖回退。
- Shared Observer Hub 将三个 MutationObserver、两个 ResizeObserver 收敛为每个 Document/Window 各一个；guard 支持按需安装与完整卸载。
- `wl-ui-contract.v1`、CLI extract/validate/match 与 3 个 MCP Tool，按领域/场景沉淀不含源码、接口、字段值和原始文案的 JSON 模板。
- EP 2.2+jh-ui 与原生 EP 2.7+ 兼容 profile 建立 fixture、结构契约、SCSS 和浏览器证据门禁。
- README 重新按“能力 → 效果 → 单独使用 → 组合使用 → 安全边界”组织。

## v1.10.x — 复杂表格与控件结构闭环

- AG Grid 分组表头、编辑单元格、空状态、上下/左右分屏和滚动容器治理。
- 新旧 Element Plus/jh-ui 输入 wrapper、复合数字框、输入组和 MessageBox 结构差异适配。
- 状态列自动判色语义收紧，避免业务普通文案误识别。
- Node 行为测试、SCSS 契约、浏览器视觉回归和包内容门禁逐步完整。

## v1.9.x — 项目集群适配与治理事实源

- Base*/jh-*/C_*/AG Grid/custom vendor 分层与 Skin/Native 双模式稳定。
- `standards/rules.json`、`component-structures.json` 与 vendor 兼容矩阵成为单一事实源。
- Vite 启动检查、CLI doctor、MCP 适配判断共享同一加载器。
- 定制登录页、大屏和设计器显式豁免边界建立。

## v1.8.x 及更早 — 基础框架

- L0-L4 分层、Design Tokens、Element Plus 样式、页面 Layout 与 Runtime renderer。
- scanner、fixer、snapshot、drift、Skill/Flow 与多编辑器安装生命周期。
- `defineColumns`、`renderOps`、Preset 和常用业务状态渲染能力。

## 升级建议

```bash
pnpm up @agile-team/wl-skills-ui@latest
npx wl-ui update --project . --force
npx wl-ui doctor --project .
npx wl-ui scan --target src --output compact
```

从 1.10.x 升级到 1.11.0 无强制破坏性 API 变更：默认 guard 仍全部启用，scanner 默认改为 `auto` 解析但缺 compiler-sfc 会安全回退并在报告中说明。严格 CI 可显式使用 `--parser sfc`。
