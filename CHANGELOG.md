# Changelog

All notable changes to **@agile-team/wk-skills-ui** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.1] - 2025-05

### Fixed
- 全局包名/路径统一为 `@agile-team/wk-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
- `installSafePreset` / `safe-preset` 全部修正为 `installCommonPreset` / `common-preset`
- `renderDangerText` 硬编码 `#f56c6c` → `var(--el-color-danger)`
- `RATING_LEVEL_COLORS` 硬编码颜色 → `var(--wk-rating-lv*, fallback)` 可主题化
- `renderRatingLevel` fallback 硬编码 → `var(--wk-rating-fallback-*, fallback)`
- `reference/define-columns.ts` selection 列宽度 42→55 与标准对齐
- `_registry.md` 版本号 v0.3→v1.3
- README 路线图版本号修正（v1.4/v1.5/v1.6/v2.0）
- License 统一为 UNLICENSED（内部专用）
- `report.mjs` RULE_NAME 补齐 R009/R010/R012
- `scanner/fix.mjs` TOKEN_MAP 重复定义 → 从 `_shared.mjs` 统一导入
- `03-scss-structure.md` tokens 引入方式修正（`@import` → `<link>` 加载）
- `_portal.scss` 注释包名修正
- TS 类型报错修复：添加 `vue`/`element-plus`/`@element-plus/icons-vue` devDeps
- 创建 `types/jhlc.d.ts` 为 `@jhlc/*` 内部包提供类型 stub
- 创建 `tsconfig.check.json` 供 IDE 全项目类型检查
- `reference/define-columns.ts` 17 处 `row` 隐式 any 类型修复
- `reference/ag-cell-renders.ts` ElTag type 属性类型断言修复

### Added
- Scanner 规则 R009（状态字段纯文本渲染）、R010（分类 Tag 缺 effect="plain"）、R012（弹窗内 el-table 缺 empty-text）
- SCSS 变量映射层 `$wk-*`（`styles/tokens/index.scss`）
- 构建脚本 `sync:tokens` 自动同步 `dist/tokens.css`
- `sideEffects` 字段优化 tree-shaking
- `package.json` exports 显式声明 `./runtime/common-preset`；`./runtime` 重定向到主入口
- `files` 包含 `reference/` 和 `examples/`
- CHANGELOG.md

### Changed
- `examples/quickstart.md` 删除（与 README 重复）
- SKILL.md 第八节精简（改为引用 README）
- README.md 规范表补充 R009/R010/R012，目录结构更新

## [1.3.0] - 2025-04

### Added

- 五层架构（L0 tokens → L1 element → L2 vendors → L3 layouts → L4 runtime）
- 双运行模式：Native（新项目完整接入）/ Skin（老项目化妆对齐）
- 4 级 SCSS 预设：`full` / `skin` / `element-only` / `tokens-only`
- Runtime API：`defineColumns` / `renderOps` / `renderTagNode` / `renderClassifyTag` / `renderBadge` / `renderCountBadge` / `renderRatingLevel` / `renderDangerText`
- 通用业务预设 `installCommonPreset()`：15+ 字段自动映射
- 动态字典解析器 `setDictResolver()`
- CLI 工具：`wk-ui init/scan/check/fix/all/add-preset`
- Scanner 规则：R001–R018（table/form/button/tag/dialog/color）
- AI Skills 系统：4 flows + 12 单点 skill
- 多编辑器适配：GitHub Copilot / Cursor / Windsurf / Kiro / Trae
- `sideEffects` 字段优化 tree-shaking
- `package.json` exports 显式声明 `./runtime/common-preset`；`./runtime` 重定向到主入口
- `files` 包含 `reference/` 和 `examples/`
- SCSS 变量映射层 `$wk-*`（`styles/tokens/index.scss`）
- 构建脚本 `sync:tokens` 自动同步 `dist/tokens.css`
- Scanner 规则 R009（状态字段纯文本渲染）、R010（分类 Tag 缺 effect="plain"）、R012（弹窗内 el-table 缺 empty-text）

### Fixed

- 全局包名/路径统一为 `@agile-team/wk-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
- `installSafePreset` / `safe-preset` 全部修正为 `installCommonPreset` / `common-preset`
- `renderDangerText` 硬编码 `#f56c6c` → `var(--el-color-danger)`
- `RATING_LEVEL_COLORS` 硬编码颜色 → `var(--wk-rating-lv*, fallback)` 可主题化
- `renderRatingLevel` fallback 硬编码 → `var(--wk-rating-fallback-*, fallback)`
- `reference/define-columns.ts` selection 列宽度 42→55 与标准对齐
- `_registry.md` 版本号 v0.3→v1.3
- README 路线图版本号修正（v1.4/v1.5/v1.6/v2.0）
- License 统一为 UNLICENSED（内部专用）
- `report.mjs` RULE_NAME 补齐 R009/R010/R012
- `scanner/fix.mjs` TOKEN_MAP 重复定义 → 从 `_shared.mjs` 统一导入
- `03-scss-structure.md` tokens 引入方式修正（`@import` → `<link>` 加载）
- `_portal.scss` 注释包名修正
