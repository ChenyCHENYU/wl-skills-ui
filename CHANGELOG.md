# Changelog

All notable changes to **@agile-team/wl-skills-ui** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.8.6] - 2026-05-17

### Added

- **`renderOps` 运行时类型守门**：dev 模式下检测到 `OpItem.type` 不在 `view | edit | del | danger | log | ok | send | chip | link` 集合中时，`console.warn` 一次性提示并按 `link` 兜底渲染。修复下游项目（`strict: false`）传错 type 时图标静默降级为纯文字、毫无察觉的隐性体验问题。production 环境无任何副作用。

## [1.8.5] - 2026-05-17

### Added

- **R025**：检测 defineColumns 列中 `options:[]` 纯文本退化，提示升级为 `renderTagSlot` / `renderDictClassifyTag` 彩色标签。
- **R026**：检测模板中原生 HTML 元素（`<table>/<input>/<select>/<button>/<textarea>`），提示替换为对应 Element Plus 组件以纳入统一风格体系。
- fixture 测试覆盖 R025/R026（20 条自动化测试）。

## [1.8.3] - 2026-05-13

### Added

- **scan --only / --skip**：支持规则级过滤，`--only R001,R016` 仅跑指定规则，`--skip R031-R037` 排除范围（支持连字符范围展开）。
- **exempt init 脚手架**：`wl-scan exempt init --target src` 智能扫描 src 下 big-screen/dashboard/chart 等个性化目录，自动生成 `.wl-exempt.json` 模板。

## [1.8.2] - 2026-05-13

### Fixed

- **搜索区字号不一致**：`_base-query-toolbar.scss` 统一 label / input / select / placeholder 为 **12px**，消除 13px→12px 混杂导致的视觉跳动。
- **必填星号重复 `* *`**：`_base-components.scss` 必填星号改为精确模式——默认只显示 `::before`，`asterisk-right` 仅显示 `::after`，避免 `display: inline-block !important` 同时作用于两个伪元素。`_jh-ui.scss` 同步精简为只声明颜色不控制 `display`。

### Added

- **scanner fixture 测试集**：`scanner/__tests__/` 覆盖 R001/R002/R006/R011/R016/R021 + drift 模块共 16 条自动化测试，`npm test` 一键跑。
- **SCSS 链路检查**：`scripts/check-scss.mjs` 递归验证 `styles/index.scss` 和 `presets/skin.scss` 的 `@forward/@use` 链路完整性。
- **scan --baseline 一步到位**：`wl-scan scan --target src --baseline .wl-baseline.json` 扫描后自动对比基线输出漂移报告，`--fail-on-error` 同时拦截新增违规。
- `package.json` 新增 `test` 和 `check:scss` 脚本。

## [1.8.1] - 2026-05-13

### Added

- 新增 **`scanner/drift.mjs`** 漂移检测模块：对比基线与当前扫描 JSON，输出 gained / fixed / regressed 结构化报告。
- 新增 CLI `wl-scan drift --baseline <f> --current <f>` 子命令，支持 `--output json` 和 `--fail-on-error` 门槛。
- 新增 MCP 工具 **`wl_ui_drift`**：AI 可直接传入两份扫描 JSON 拿漂移报告。

## [1.8.0] - 2026-05-12

### Added

- 新增 **`standards/rules.json`** R-rule 单一事实源：29 条规则按 `id / category / severity / appliesTo / autoFixable / scanner / skills` 结构化注册，所有 standards 文档、SKILL.md、scanner、MCP、未来 ESLint 插件均从此派生。
- 新增 **`standards/rules-loader.mjs`** 共享加载器：暴露 `loadRules / listRules / getRule / groupByCategory / buildRuleSummary`，scanner / MCP / check-docs / Vite 插件统一读取。
- 新增 MCP 工具 **`wl_ui_list_rules`**：按 `category / severity / autoFixable` 过滤返回规则摘要。
- 新增 MCP 工具 **`wl_ui_describe_rule`**：按 ID 返回单条 R-rule 完整定义（含 aliases 兼容旧 ID）。
- 新增 **`docs/governance-long-term.md`**：业务项目长效治理方案（基线 / 豁免 / 漂移看板 / 版本钉死 / 写作期 AI 守护五机制）。
- `scripts/check-docs.mjs` 扩展：校验 `scanner/rules/*.mjs` 中所有 `id` 必须在 `rules.json` 注册、SKILL.md 引用的 R-id 必须存在、`_registry.md` 引用的 skill 目录必须真实存在。

### Changed (Breaking-ish)

- **修复 R011 逻辑反转 bug**：之前 scanner 检测分页"不在 #footer 报错"，与 `standards/ui/05` "分页必须放内容区，不得放 #footer" 相互矛盾。v1.8.0 反转 scanner 检测语义，与 standards 对齐。
- **`scanner/rules/tag.mjs` R017/R018 重号为 R019/R020**：原 ID 与 `color.mjs` 的 R017/R018 冲突。`rules.json` 通过 `aliases: [R017_TAG_LEGACY/R018_TAG_LEGACY]` 兼容历史引用；scanner 输出 `rule` 字段改为新 ID。
- **`skills/_meta/_registry.md` 清理 12 条幽灵条目**：删除 9 个不存在的 `element/*` SKILL 引用（el-card/el-tabs/el-descriptions/el-tree/el-drawer/el-upload/el-steps/el-overlay/el-navigation/el-feedback），声明已统一归入 `element/component-family`；删除 2 个 `ops/*` 引用（route-intent / recommend-flow），声明为 MCP 工具而非独立 SKILL。
- **`skills/runtime/style-align/SKILL.md` 改为指针式引用**：不再复述 17 条 R-rule 内容，仅保留分类→编号→SKILL 映射表，规则细节统一查 `standards/rules.json` 或 `wl_ui_describe_rule`。
- `tsup.config.ts` `clean: true`：每次构建清空 `es/` 目录，避免 hash 残留。

### Notes

- R013（Upload 嵌入 operations[]）由文档约束晋升为 `rules.json` 正式条目（`severity: review`，无 scanner 实现）。
- 推荐业务项目跟进：跑一次 `npx wl-ui audit --target src --outFile .wl-baseline.json` 建立基线，配合 `--baseline` 增量门槛使用（详见 `docs/governance-long-term.md`）。

## [1.7.1] - 2026-05-12

### Added

- 新增 Vite 插件 `@agile-team/wl-skills-ui/vite`：消费方在 `vite.config.ts` 加一行 `wlSkillsCheck()` 即可在每次 `dev/build` 启动期自动校验 vendor 版本配对，偏离推荐组合时彩色打印警告与一键修复片段（`enforce: 'warn' | 'error' | 'silent'`）。
- 新增 `npx wl-ui doctor --print-overrides` 子命令：检测到偏离时直接输出 pnpm/npm/yarn `overrides` JSON 片段，复制即可修复。
- `skills/_meta/_compat/loader.mjs` 抽出共享 compat 加载器，统一 `evaluateVendor` / `buildOverridesSnippet` 语义，scanner、MCP、Vite、CLI 单源共用。
- `vendors.json` 的 `compat` 升级为结构化 schema（`peers / gatingPeer / conflictsWith / domAssumptions`），同时保留旧平铺字段兜底；未来新增 vendor 配对无需改读取方代码。

### Changed

- scanner `I005` 改为遍历全部声明 `compat` 的 vendor，输出按 vendor 拆分的子检查项 `I005:<id>`，更易定位。
- MCP `wl_ui_detect_skin` 返回结构升级：`vendors[].verdict`、`fixSnippet`、`summary` 统一暴露，AI 一次拿全多 vendor 评估结果。
- `package.json` `files` 字段加入 `runtime/vite`，确保 Vite 插件随包发布。

## [1.7.0] - 2026-05-12

### Added

- 新增 `docs/compat-matrix.md`：项目集群推荐版本与 wl-skills-ui 的适配矩阵单一事实源（`element-plus@2.2.6-prod.3` + `@jhlc/jh-ui@3.1.0`）。
- `skills/_meta/_compat/vendors.json` 在 `jh.compat` 字段钉死推荐 EP/jh-ui 版本与 EP 2.2 vs 2.3 DOM 差异说明。
- scanner 接入完整性新增 `I005`：从 `vendors.json` 读取推荐版本，校验消费方 `package.json` 是否命中推荐组合。
- MCP 新增 `wl_ui_detect_skin` 工具：读取项目 `package.json` 返回 `verdict (match / mismatch / no-jh-ui)` 与推荐 SCSS 列表。

### Changed

- `legacy-skin-align` flow 增加 Phase 0.5 强约束：写样式前必须先识别 jh-ui ↔ EP 版本配对。
- `skills/vendors/jh-components/SKILL.md` 补全反例（`.el-input__wrapper.is-focus` 在 EP 2.2 永远命中不到等），并显式钉死推荐组合。
- `scripts/check-docs.mjs` 扩展：`docs/compat-matrix.md` 的 EP/jh-ui 版本必须与 `vendors.json` 一致。
- README 新增「项目-依赖适配矩阵速查」章节，引导消费方一键判断推荐组合是否命中。

## [1.6.14] - 2026-05-12

### Added

- 新增 `styles/vendors/_jh-ui.scss` 专项承接 `@jhlc/jh-ui` SCSS 皮肤包，覆盖 `.com-text` label 包裹、`.has-colon` 冒号注入、`.com-input` / `.com-textarea` 控件 wrapper 等 jh-ui 特有 DOM 模式。
- 新增 Element Plus 2.2.x（`.el-input__inner` 直挂结构、无 `.el-input__wrapper`）下输入、选择、日期控件的圆角 / focus / error 三态规则，jh-select 与 jh-date-picker focus 表现稳定。
- `skills/_meta/_compat/vendors.json` 在 jh vendor 下登记 `@jhlc/jh-ui` baseline 与 `_jh-ui.scss` 样式来源；`skills/vendors/jh-components/SKILL.md` 补齐识别表与全局样式来源。

## [1.6.13] - 2026-05-12

### Fixed

- 补强表单输入、选择、日期和文本域的 focus 品牌色边框兼容规则，确保普通 focus 态稳定生效。
- 补强 Element Plus 必填星号红色显示规则，兼容未显式配置 asterisk 方向的表单场景。

## [1.6.12] - 2026-05-12

### Fixed

- 修复表单 label 单行省略样式覆盖后，必填星号、错误 label、错误提示和错误边框红色态不明显的问题。

## [1.6.11] - 2026-05-11

### Changed

- 优化 BaseToolbar 下拉/分裂按钮组样式，统一高度、圆角、间距和下拉菜单 hover 可读性。
- 优化 AG Grid 操作列内 `jh-op-*` 操作按钮，取消 active 缩放并提升选中行可读性。
- 补齐输入控件 focus 品牌色边框、统一圆角、长表单 label 单行省略和弹窗图标居中尺寸规则。

## [1.6.10] - 2026-05-11

### Removed

- 移除所有 `wk-skills-ui` / `wk-ui` / `wk-scan` / `wks_ui_*` / `.wk-snapshot` / `wk-exempt` 旧命名（运行时、注释、文档、headers、MCP 工具名、scanner、styles），未来不再兼容旧前缀。
- `examples/wk-exempt.example.json` 重命名为 `examples/wl-exempt.example.json`。

### Added

- 新增 vendor 单一事实源 `skills/_meta/_compat/vendors.json`，承载 Base / jh / C / AG Grid / custom 的 id、priority、patterns、baseline、styles。`scanner/coverage.mjs` 启动时一次性 parse + 编译 RegExp，长生命周期复用，零运行时性能开销。
- 新增 CLI 子命令 `wl-ui add-vendor <tag> [--family <id>] [--dry-run]`，一键生成专项 SCSS、`@forward` 注册、vendors.json baseline 追加、scanner 规则草稿。
- `npm run docs:check` 扩展校验范围至 `.md/.mjs/.js/.ts/.scss/.css/.txt/.json/.vue`，新增 `wk-scan` / `.wk-snapshot` / `wk-exempt` / `wks_ui_` 禁忌词、vendor 优先级一致性、`jh-components` SKILL 全量通配语义校验。

### Changed

- MCP 工具前缀统一为 `wl_ui_*`（原 `wks_ui_*`），server name 同步为 `wl-skills-ui`。

## [1.6.9] - 2026-05-11

### Changed

- `vendors/jh-components` 明确采用 `<jh-*>` 全量通配治理，当前文档中的 `jh-table`、`jh-form`、`jh-tree`、`jh-pagination`、`jh-drag-col` 仅作为代表性基线，不是完整清单。
- README、架构边界和检测速查表补齐复杂 `jh-*` 封装升级为专项样式覆盖的准入条件，避免盲目穷举或局部补丁污染。
- 同步 `styles/vendors/index.scss` 中 Base、jh、C、AG Grid、custom wrappers 的 L2 优先级注释。

## [1.6.8] - 2026-05-11

### Changed

- 修正架构边界文档中 L1/L2 的表述：L1 负责 Element Plus 原生组件族，L2 Project Vendors 是当前项目集群的必需覆盖层。
- README 和架构文档明确 `Base*`、`jh-*`、`C_*`、AG Grid、自研封装和 custom wrappers 都必须按统一 tokens 与 Element Plus 基础视觉对齐，不应被理解为可选补丁。

## [1.6.7] - 2026-05-11

### Added

- 新增 `standards/architecture/01-layer-boundaries.md`，明确 tokens、Element Plus、vendors、layouts、runtime、scanner、skills 的职责边界和扩展规则。
- 新增 `npm run docs:check`，校验旧命名、旧命令、README 版本文案、CHANGELOG 版本记录和编辑器配置完整性。

### Changed

- CLI 编辑器安装配置改为读取 `skills/_meta/_compat/editors.json`，消除代码内第二份 `EDITOR_TARGETS` 路径映射。
- `editors.json` 补齐 `ext`、`singleFile`、`headerFile` 等安装行为字段，使 AI 编辑器配置成为单一事实源。

## [1.6.6] - 2026-05-11

### Changed

- README、主 `SKILL.md`、Flow、Standards、Templates 和多编辑器兼容文档同步到 `wl-ui` / `wl-skills-ui` 当前命名，移除旧版 `wk-ui` / `wk-skills-ui` 过期写法。
- README 和多编辑器兼容文档补齐 `wl-ui update --editor all --force`、manifest 多编辑器刷新策略和 v1.6.5 规则分发说明。

## [1.6.5] - 2026-05-11

### Added

- `wl-ui update --editor all --force`：支持一次性将同一套 `skills/**/*.md` 规则转换并覆盖写入全部支持的 AI 编辑器目录。
- manifest 新增 `editors` 数组记录，兼容旧版 `editor` 字符串字段，便于多编辑器项目持续更新。

### Changed

- `wl-ui update` 未指定 `--editor` 时，会优先刷新 manifest 中记录的编辑器和项目里已存在的编辑器规则目录，避免团队不同 AI 编辑器 rules 漂移。

## [1.6.4] - 2026-05-11

### Fixed

- 表单控件圆角统一使用 `--wk-form-control-radius`，覆盖 input、select、date、input-number、cascader、autocomplete、textarea、upload 等控件族。
- Element Plus 上传拖拽区和上传列表项补齐圆角 token 与 fallback，避免局部硬编码导致视觉不一致。
- `el-form`、`style-align` Skill 和 `standards/ui/03-form.md` 补齐表单圆角一致性规则，引导 AI 避免局部 patch。

## [1.6.3] - 2026-05-11

### Fixed

- Element Plus 表格空状态改为在对应表格区域内自适应居中，嵌套表格不再依赖固定高度猜效果。
- AG Grid 空状态提示文案改为更通用并支持 CSS 变量自定义。
- 查询区和工具栏按钮补齐 CSS 变量 fallback，避免 token 未加载时按钮颜色丢失。
- 禁用按钮增加独立样式约束，避免 hover/active 覆盖禁用态。

### Changed

- `el-table`、`base-table`、`style-align` 等 Skill 补充智能空状态修复规则，要求 AI 根据真实业务上下文判断空态文案与区域，而不是硬编码。

## [1.6.2] - 2026-05-09

### Changed

- vendors 层多组件样式精细化调整：`_base-components`、`_ag-grid`、`_portal`、`_jh-tree`、`_jh-pagination`、`_jh-drag-col`、`_c-components`、`_base-query-toolbar` 选择器精准度与覆盖范围优化。
- `design/tokens/base.css` / `dist/tokens.css` 同步更新设计令牌变量。
- `styles/presets/security.scss` 安全模块预设样式调整。

## [1.6.1] - 2026-05-09

### Changed

- 同步版本文案至 1.6.1，补齐 1.6.0 发布后文档一致性。

## [1.6.0] - 2026-05-07

### Added

- 扩展 Element Plus 高频组件族样式覆盖，补齐 card、tabs、descriptions、tree、drawer、upload、steps、overlay、navigation、feedback。
- 新增 scanner 组件覆盖和 B 端业务场景识别，输出 componentCoverage、recommendedSkills、recommendations、kitBridge。
- 新增 R031-R037 组件族治理规则，覆盖卡片、Tabs、详情、抽屉、上传、步骤和反馈状态。
- 新增 MCP 工具 wks_ui_route_intent 和 wks_ui_recommend_flow，支持 AI 意图路由和扫描结果推荐。

### Changed

- 同步 README、Skill registry、detection 和 component-family Skill，明确与 wl-skills-kit 的桥接边界。

## [1.5.1] - 2026-05-05

### Changed

- 更新 README、SKILL、Flow 与多编辑器兼容文档，补齐 manifest 生命周期、MCP、触发提示和规范插件说明
- 明确 `wl-skills-kit` 可选桥接边界：两包可组合提醒，但不互相强依赖
- 同步发布文档到 1.5.x 现状，避免旧版 CLI 和编辑器路径误导使用者

## [1.5.0] - 2026-05

### Added

- `wl-ui update/diff/clean/doctor/prompts`：补齐安装生命周期管理、安装清单、差异检查、清理与体检能力
- `wl-ui init/update`：安装 AI Skill 时同步写入 `.github/wl-skills-ui/TRIGGER_PROMPTS.md` 触发提示与 `.mcp.json` MCP 配置
- `mcp/server.js`：新增 `wl-skills-ui` MCP Server，提供 `wks_ui_check`、`wks_ui_scan`、`wks_ui_fix_dry_run`、`wks_ui_skill_prompt`
- 多编辑器适配扩展：新增 `claude-code`、`cline`、`agents-generic`、`qoder`
- 可选桥接提醒：检测/提示 `@agile-team/wl-skills-kit`，保持两包独立分工、不强耦合
- 规范插件提醒：建议业务项目执行 `npx @robot-admin/git-standards init` 接入代码质量与提交规范闭环

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

- **快照回退机制**：`wl-scan fix` 自动在修复前创建快照，支持 `wl-scan snapshot rollback` 一键回退
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
- `wl-ui.js` CLI help 更新为 v1.4，补充 snapshot 和 exempt 用法
- `package.json` exports 新增 `./runtime/presets/security` 和 `./runtime/presets/*`

## [1.3.1] - 2025-05

### Fixed

- 全局包名/路径统一为 `@agile-team/wl-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
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
- CLI 工具：`wl-ui init/scan/check/fix/all/add-preset`
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

- 全局包名/路径统一为 `@agile-team/wl-skills-ui`（scanner init、integration check、SKILL.md、模板、标准文档、runtime 注释）
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
