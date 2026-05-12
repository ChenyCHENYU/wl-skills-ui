---
description: |
  老项目化妆对齐流程 — 不破坏业务代码，仅注入 tokens + element + vendors 三层覆盖。
  适用：不可全面改造的存量项目，只想统一视觉。
applyTo: "**/*.{vue,scss,html}"
---

# Flow: legacy-skin-align

> 化妆模式（Skin Mode）— 最大覆盖、最小侵入

## 触发短语

- "用 wl-ui 给这个老项目化妆对齐"
- "legacy-skin 流程跑一下"
- "skin mode 接入"

## 执行步骤

### Phase 0 — 安装/更新 Skill 与 MCP 配置
```bash
npx wl-ui init --project . --mode skin
npx wl-ui doctor --project .
```

该命令会写入 AI 编辑器规则、触发提示、`.mcp.json` 和 `.wl-skills-ui-manifest.json`。已安装项目可改用 `npx wl-ui update --project .`。

（AI 严格按序）

### Phase 0.5 — 识别 jh-ui ↔ Element Plus 版本配对（强约束）

在写任何样式前，**必须先**通过下列任一方式确认推荐组合命中情况：

- MCP：调用 `wl_ui_detect_skin`，读取项目 `package.json` 返回 `verdict`（`match` / `mismatch` / `no-jh-ui`）。
- CLI：执行 `npx wl-ui check --project .`，关注 `I005` 项。
- 文档：对照 `docs/compat-matrix.md` 的「推荐版本」表。

判定规则：

- `verdict === "match"`（推荐组合）：`_jh-ui.scss` 等 EP 2.2.x 适配规则可全量启用。
- `verdict === "mismatch"`（版本偏离）：禁止套用 EP 2.6+ `.el-input__wrapper` 规则；先与项目方对齐版本再继续 Phase 1。
- `verdict === "no-jh-ui"`：无需启用 `_jh-ui.scss`，按 EP 默认 DOM 处理。

### Phase 1 — 接入 tokens
1. 检查 `index.html`，在 `<head>` 内追加：
   ```html
   <link rel="stylesheet" href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css" />
   ```
2. 检查 `vite.config.ts` / `webpack` 是否能解析 `node_modules` 路径

### Phase 2 — 接入 skin 预设
1. 找到全局 SCSS 入口（`src/main.scss` / `src/styles/index.scss`）
2. 在文件最顶部追加：
   ```scss
   @use '@agile-team/wl-skills-ui/styles/presets/skin' as *;
   ```
3. **不**引入 `layouts/` 层（避免和老项目布局冲突）

### Phase 3 — 触发 vendors 层 skill 修复
按优先级顺序，逐个 skill 触发：
1. `vendors/base-table` — 修 BaseTable* 的 R001/R002/R003/R014
2. `vendors/jh-components` — 修 jh-* 的 R006/R007/R011
3. `vendors/c-components` — 修 C_*/c_* 的对齐
4. `vendors/custom-wrappers` — 兜底自封装
5. `vendors/ag-grid` — 修 AG Grid 列对齐

### Phase 4 — 触发 element 层 skill 修复
针对原生使用的 el-* 控件：
- `element/el-table` → R001/R002/R014
- `element/el-form` → R006/R008
- `element/el-dialog` → R011/R015
- `element/el-tag` → R009/R010

### Phase 5 — 触发 tokens 层修复
- `runtime/design-tokens` → R016/R017/R018（颜色硬编码 → CSS 变量）

### Phase 6 — 不做的事
- ❌ **不要**重写业务代码逻辑
- ❌ **不要**替换组件为 runtime API（那是 native mode 的事）
- ❌ **不要**修改业务 layout 容器 class

## 完成后输出

- 报告：分层统计修复条目
- 建议：哪些封装组件适合下一阶段"原生迁移"
