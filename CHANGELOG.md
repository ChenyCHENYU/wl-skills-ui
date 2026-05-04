# Changelog

All notable changes to **@agile-team/wk-skills-ui** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.4.7] - 2026-05

### Added

- `scanner/rules/tag.mjs`：新增 **R017** — 脚本式 `columnsDef` 中编号/工号/证件号列缺少 `renderBadge` 检测（`checkScript` 钩子）
- `scanner/rules/tag.mjs`：新增 **R018** — 脚本式 `columnsDef` 中 `logicType:dict` 列缺少 `defaultSlot`/`renderDictClassifyTag` 检测（`checkScript` 钩子）
- `scanner/rules/tag.mjs`：R009 补全 `checkScript` — 状态/分类列（label 含"状态/级别/类型"）纯文本渲染检测扩展到脚本式列定义

### Fixed

- `SKILL.md`：规则定义章节补充 R017/R018 条目，含 diff 示例和判断原则
- `SKILL.md`：9.4 迁移规则补充中文 label 关键字表（编号/工号/证件号码 → `renderBadge`），解答"证件号码是否需要 badge"疑问
- 修复 scanner 盲区：此前扫描器仅检测 `<el-table-column>` 模板写法，对 `columnsDef()` 脚本式列定义完全失效，导致安全模块 66 处编号列、13 处状态列遗漏

## [1.4.6] - 2026-05

### Fixed

- `styles/vendors/_base-components.scss`：弹窗底部按钮选择器由 `.el-dialog .dialog-footer .el-button` 改为 `.el-dialog__footer .el-button`，确保 `jh-dialog` 直接在 `#footer` slot 放置按钮时也能命中；高度 30→28px，与内容密度匹配
- `styles/vendors/_base-components.scss`：`.el-message-box__btns .el-button` 高度同步降至 28px

### Added

- `templates/ui-optimization-report/TPL-UI-OPTIM-REPORT.md`：UI 风格优化记录报告结构化模板，含十二章节、R001~R016 规范对照、编号列 R016 防漏规则

## [1.4.5] - 2026-05

### Fixed

- `styles/element/_dialog.scss`：`.dialog-header-fullscreen-icon .svg-icon` font-size 调整为 12px，与 EP 关闭按钮视觉大小匹配

## [1.4.4] - 2026-05

### Fixed

- `styles/element/_dialog.scss`：移除 `.dialog-header-fullscreen-icon` 容器的 `width/height: 32px`，该约束会改变容器右边界导致 `right` 定位偏移

## [1.4.3] - 2026-05

### Added

- `styles/element/_dialog.scss`：新增 `.dialog-header-fullscreen-icon` 覆盖规则，适配 `@jhlc/common-core` `DialogComponent`（jh-dialog）的全屏按钮，`position: absolute; right: 44px; top: 16px`，颜色/hover 与 EP 关闭按钮统一

## [1.4.2] - 2026-05

### Added

- `reference/ag-cell-renders.ts`：`renderOps` 对 `show=false` 的图标按钮改为 `visibility: hidden` 占位，确保同列不同行按钮上下对齐
- `styles/element/_dialog.scss`：新增 EP 原生 fullscreen prop 场景的 headerbtn 间距收紧规则（`.el-dialog__headerbtn { right:8px }`）

## [1.4.1] - 2026-05

### Added

- `styles/presets/security.scss`：security 品牌色预设（`#002a8f` 主色完整梯度 + danger 色系），基于 skin 模式（L0+L1+L2）
- `runtime/presets/security.ts`：`installSecurityPreset()`，安防业务状态字典映射（违章/车辆/出入/布控/报警）
- `examples/migration-operations-to-renderOps.md`：`operations: []` → `defaultSlot + renderOps` 完整迁移示例

## [1.4.0] - 2025-05

### Added

- **快照回退机制**：`wk-scan fix` 自动在修复前创建快照，支持 `wk-scan snapshot rollback` 一键回退
- **快照管理命令**：`snapshot list / rollback / diff / clean`，完整的快照生命周期管理
- **豁免配置系统**：`.wk-exempt.json` 配置文件，支持路径级和规则级豁免（大屏/地图/流程等）
- **结构化报告增强**：报告新增豁免统计、规范覆盖率、回退命令提示
- **security 预设**：`runtime/presets/security.ts` 安防业务状态映射（违章/车辆/出入/布控/报警）
- **security SCSS 预设**：`styles/presets/security.scss` 安防品牌色覆盖（#002a8f 主色系）
- **operations 迁移指南**：`examples/migration-operations-to-renderOps.md` 完整迁移示例
- **豁免配置模板**：`examples/wk-exempt.example.json` 默认豁免路径清单
- CLI 新增参数：`--exempt`（豁免配置）、`--no-snapshot`（跳过快照）、`--id`（指定快照）、`--keep`（清理保留数）

### Changed

- `fix.mjs` 重构为两遍扫描：先收集再写入，支持原子化快照
- `report.mjs` 摘要新增实际检查文件数、豁免文件数、规范覆盖率百分比
- `index.mjs` 支持 `snapshot` 子命令
- `wk-ui.js` CLI help 更新为 v1.4，补充 snapshot 和 exempt 用法
- `package.json` exports 新增 `./runtime/presets/security` 和 `./runtime/presets/*`

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
