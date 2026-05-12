# Skills Registry — wl-skills-ui v1.8

> 全部可被 AI 编辑器加载的 skill 索引（**仅列实际存在的 SKILL.md**）。R-rule 元数据见 `standards/rules.json`。

## 五层架构总览

```
L0 tokens   → 设计令牌（颜色/间距/圆角/字号）
L1 element  → Element Plus 控件对齐
L2 vendors  → 封装组件化妆（Base / jh / C_/c_ / custom + AG Grid）
L3 layouts  → 团队约定页面骨架
L4 runtime  → 业务渲染 API（defineColumns / renderOps / preset）
```

## 入口（Flows · 组合流程）

| Flow | 适用 |
| --- | --- |
| [`_flows/new-project-init`](../_flows/new-project-init.md) | 新项目从零接入 |
| [`_flows/legacy-skin-align`](../_flows/legacy-skin-align.md) | 老项目化妆模式 |
| [`_flows/full-audit`](../_flows/full-audit.md) | 全量审计（不修） |
| [`_flows/progressive-migrate`](../_flows/progressive-migrate.md) | 渐进式迁移到 runtime |

## 单点 Skills（按层 / 实际存在）

### L1 element/

| Skill | 覆盖规则 | 说明 |
| --- | --- | --- |
| `element/el-table` | R001 R002 R003 R014 | el-table / 列定义统一 |
| `element/el-form` | R006 R007 R008 | 表单控件 size、宽度、labelWidth |
| `element/el-dialog` | R011 R015 | 弹窗分页 + 嵌套表格按钮 |
| `element/el-tag` | R009 R010 R019 R020 | 状态/分类/编号/字典列 |
| `element/component-family` | R031–R037 | 首批 B 端高频组件族聚合治理（card/tabs/descriptions/tree/drawer/upload/steps/overlay/navigation/feedback） |

> **注**：`el-card` / `el-tabs` / `el-descriptions` / `el-tree` / `el-drawer` / `el-upload` / `el-steps` / `el-overlay` / `el-navigation` / `el-feedback` 已**全部归入** `component-family` 一处治理；不再单独维护 SKILL 文件。

### L2 vendors/

| Skill | 优先级 | 说明 |
| --- | --- | --- |
| `vendors/base-table` | #1 | Base\* 系列（R003 R021 R022） |
| `vendors/jh-components` | #2 | jh-\* 系列（含 EP/jh-ui 配对） |
| `vendors/c-components` | #3 | C*/c* 前缀 |
| `vendors/custom-wrappers` | #4 | 兜底（无前缀） |
| `vendors/unknown-wrapper` | — | 兜底探测 |
| `vendors/ag-grid` | — | AG Grid 渲染层覆盖 |

### L3 layouts/

| Skill | 说明 |
| --- | --- |
| `layouts/list-page` | 列表页骨架（搜索 + 工具栏 + 表格 + 分页） |
| `layouts/tree-list` | 左树右表双栏骨架（含 jh-drag-col） |
| `layouts/form-dialog` | 新增/编辑/详情三态表单弹窗 |
| `layouts/detail-page` | 只读展示页（el-descriptions 为主） |

### L4 runtime/

| Skill | 说明 |
| --- | --- |
| `runtime/style-align` | 主样式对齐 skill（聚合入口，R-rule 来源 = `standards/rules.json`） |
| `runtime/design-tokens` | R016 R017 R018 颜色 token |
| `runtime/migration` | 从零迁入 / 渐进迁移指南 |

### Ops/

| Skill | 用途 |
| --- | --- |
| `ops/scan` | 扫描诊断 |
| `ops/fix` | 自动修复 |
| `ops/audit` | 只读全量审计 + 报告 |
| `ops/migrate` | 渐进迁移（skin → native） |

> **注**：`route-intent` / `recommend-flow` 是 **MCP 工具**（`wl_ui_route_intent` / `wl_ui_recommend_flow`），不是独立 SKILL；详见 `mcp/server.js`。

## R-rule 单一事实源

所有 R-rule 的定义（id、severity、appliesTo、scanner 实现、autoFixable 等）统一在 `standards/rules.json`。

- 查询：`import { getRule, listRules } from '@agile-team/wl-skills-ui/standards/rules-loader.mjs'`
- MCP：`wl_ui_describe_rule R001` / `wl_ui_list_rules --category=table`
- 校验：`npm run docs:check` 会校验 SKILL/scanner/registry 一致性，出现幽灵 skill 或未注册 R-id 立刻报错。

## 多编辑器适配

详见 [`_compat/README`](../_compat/README.md)：支持 GitHub Copilot / Cursor / Windsurf / Kiro / Trae 等。

## 扩展机制

新增 R-rule：
1. 在 `standards/rules.json` 注册条目（含 category/severity/scanner/skills 引用）
2. 实现 `scanner/rules/<category>.mjs` 中的 `id: "Rxxx"` check 函数
3. 在对应 SKILL.md 用指针式引用（`见 standards/rules.json#R001`），**不要复述规则细节**
4. 跑 `npm run docs:check` 验证

新增 skill：
1. `skills/<layer>/<id>/SKILL.md`
2. 在本文件登记
3. 跑 `npm run docs:check`
