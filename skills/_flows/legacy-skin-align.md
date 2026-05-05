---
description: |
  老项目化妆对齐流程 — 不破坏业务代码，仅注入 tokens + element + vendors 三层覆盖。
  适用：不可全面改造的存量项目，只想统一视觉。
applyTo: "**/*.{vue,scss,html}"
---

# Flow: legacy-skin-align

> 化妆模式（Skin Mode）— 最大覆盖、最小侵入

## 触发短语

- "用 wk-ui 给这个老项目化妆对齐"
- "legacy-skin 流程跑一下"
- "skin mode 接入"

## 执行步骤

### Phase 0 — 安装/更新 Skill 与 MCP 配置
```bash
npx wk-ui init --project . --mode skin
npx wk-ui doctor --project .
```

该命令会写入 AI 编辑器规则、触发提示、`.mcp.json` 和 `.wk-skills-ui-manifest.json`。已安装项目可改用 `npx wk-ui update --project .`。

（AI 严格按序）

### Phase 1 — 接入 tokens
1. 检查 `index.html`，在 `<head>` 内追加：
   ```html
   <link rel="stylesheet" href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css" />
   ```
2. 检查 `vite.config.ts` / `webpack` 是否能解析 `node_modules` 路径

### Phase 2 — 接入 skin 预设
1. 找到全局 SCSS 入口（`src/main.scss` / `src/styles/index.scss`）
2. 在文件最顶部追加：
   ```scss
   @use '@agile-team/wk-skills-ui/styles/presets/skin' as *;
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
