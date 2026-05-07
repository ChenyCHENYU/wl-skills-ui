# @agile-team/wk-skills-ui

> **企业级 UI 风格对齐框架** — 让 Vue + Element Plus 业务系统获得一致的视觉、可被 AI 精确识别和修复的设计规范，以及可演进的工程能力。

[![npm version](https://img.shields.io/npm/v/@agile-team/wk-skills-ui.svg)](https://www.npmjs.com/package/@agile-team/wk-skills-ui)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)]()

---

## 这是什么？

一套 "**设计令牌 + 控件对齐 + 封装组件化妆 + 页面骨架 + 业务渲染 + 自动化扫描修复 + AI Skills**" 的全栈式风格框架。

它解决的问题：

> 团队有多个 Vue 项目，新老共存。新项目可以从零按规范搭建；老项目用了大量内部封装组件（`Base*` / `jh-*` / `C_*` / `c_*` / 还有野路子自封装），改源码代价大。如何在 **不改业务代码** 的前提下，做到全项目视觉一致；同时给新项目和拿到源码后的老项目，提供更精简、更高效的演进路径？

---

## 架构总览

### 五层模型 (L0 → L4)

```
┌─────────────────────────────────────────────────────────────────┐
│  L0  Design Tokens          颜色 / 间距 / 圆角 / 字号 / 阴影      │
│      → 所有上层依赖的"宪法"                                       │
├─────────────────────────────────────────────────────────────────┤
│  L1  Element Plus 原子层    el-button / el-input / el-table ... │
│      → 一控件一规则、一控件一 SCSS、一控件一 SKILL                │
├─────────────────────────────────────────────────────────────────┤
│  L2  Vendors 封装组件层 ⭐  Base* / jh-* / C_*/c_* / custom / AG │
│      → 老项目化妆主战场（无源码也能覆盖）                          │
├─────────────────────────────────────────────────────────────────┤
│  L3  Page Layouts 骨架层    list-page / tree-list / form-dialog │
│      → 团队约定的页面 DNA                                        │
├─────────────────────────────────────────────────────────────────┤
│  L4  Runtime 业务渲染层     defineColumns / renderOps / preset  │
│      → 让业务代码"消失"（仅有源码场景）                           │
└─────────────────────────────────────────────────────────────────┘
```

### 两种运行模式

| 模式               | 适用                     | 包含层         | 接入方式                                               |
| ------------------ | ------------------------ | -------------- | ------------------------------------------------------ |
| **Native（原生）** | 新项目、能完全可控的项目 | L0+L1+L2+L3+L4 | `@use '.../styles' as *;` + `installCommonPreset()`    |
| **Skin（化妆）**   | 老项目、第三方封装无源码 | L0+L1+L2       | `@use '.../styles/presets/skin' as *;`（不动业务代码） |

---

## 目录结构

```
wk-skills-ui/
├── design/                       # L0 — 设计令牌
│   ├── tokens/
│   │   ├── base.css              # CSS 变量声明（:root --el-color-primary 等）
│   │   └── index.css
│   └── spec/                     # 设计规范文档（color / typography / spacing）
│
├── styles/                       # L1+L2+L3 SCSS 实现
│   ├── tokens/                   # SCSS 变量映射层（$wk-* → CSS 变量）
│   ├── element/                  # L1 Element Plus 控件对齐
│   │   ├── _table.scss
│   │   ├── _form.scss
│   │   ├── _dialog.scss
│   │   ├── _pagination.scss
│   │   └── index.scss
│   ├── vendors/                  # ⭐ L2 封装组件化妆层
│   │   ├── _base-table.scss      # Base* 表格类（优先级 #1）
│   │   ├── _base-components.scss # Base* 通用（按钮组/徽标/Tag）
│   │   ├── _base-query-toolbar.scss  # BaseQuery / BaseToolbar
│   │   ├── _jh-tree.scss         # jh-tree（优先级 #2）
│   │   ├── _jh-pagination.scss   # jh-pagination
│   │   ├── _jh-drag-col.scss     # jh-drag-col 拖拽分割条
│   │   ├── _c-components.scss    # C_/c_ 前缀（优先级 #3，团队未来主流）
│   │   ├── _custom-wrappers.scss # 野路子兜底（优先级 #4）
│   │   ├── _ag-grid.scss         # AG Grid 主题
│   │   ├── _portal.scss          # 弹层/popper
│   │   └── index.scss
│   ├── layouts/                  # L3 页面骨架
│   │   ├── _list-page.scss       # .list-page 列表页
│   │   ├── _tree-list.scss       # .tree-list 左树右表
│   │   ├── _form-dialog.scss     # .form-dialog 表单弹窗
│   │   ├── _detail-page.scss     # .detail-page 详情页
│   │   └── index.scss
│   ├── presets/                  # 组合预设（用户一行接入）
│   │   ├── full.scss             # L0+L1+L2+L3（默认 = styles/index.scss）
│   │   ├── skin.scss             # L0+L1+L2（老项目化妆）
│   │   ├── element-only.scss     # L0+L1
│   │   └── tokens-only.scss      # L0
│   └── index.scss                # = presets/full
│
├── runtime/                      # L4 业务渲染（TS）
│   ├── core/                     # 不可变核心
│   │   ├── types.ts              # 类型定义
│   │   ├── renderers.ts          # renderTagNode / renderOps / renderClassifyTag ...
│   │   ├── registry.ts           # COLUMN_AUTO_MAP + defineColumns
│   │   └── index.ts
│   ├── presets/                  # 业务预设（可扩展）
│   │   ├── registry.ts           # createPreset / installPreset
│   │   ├── common.ts             # 通用业务预设（enable/audit/verify + 起步包）
│   │   └── index.ts
│   └── index.ts                  # 公共 API 入口
│
├── scanner/                      # 自动化扫描 / 修复
│   ├── index.mjs                 # CLI（含 --layer/--vendor/--mode 过滤）
│   ├── rules/                    # 规则集
│   │   ├── _shared.mjs           # 公共工具 + inferMeta(layer/vendor)
│   │   ├── table.mjs             # R001 R002 R003 R014
│   │   ├── form.mjs              # R006 R007 R008
│   │   ├── button.mjs            # R004 R005 R015
│   │   ├── tag.mjs               # R009 R010 R012
│   │   ├── dialog.mjs            # R011
│   │   ├── color.mjs             # R016 R017 R018
│   │   └── index.mjs             # 聚合 + addRules() 插件机制
│   ├── fix.mjs                   # 自动修复引擎
│   ├── integration.mjs           # 接入完整性检查
│   └── report.mjs                # 报告生成器
│
├── skills/                       # ⭐ AI 编辑器知识库
│   ├── _meta/
│   │   ├── _registry.md          # Skills 总索引
│   │   ├── _detection.md         # vendor / layout 识别速查表
│   │   └── _compat/              # 多编辑器适配（Copilot/Cursor/Windsurf/Kiro/Trae/Claude/Cline/Agents/Qoder）
│   ├── _flows/                   # ⭐ 组合流程（一句话跑全套）
│   │   ├── new-project-init.md   # 新项目从零接入
│   │   ├── legacy-skin-align.md  # 老项目化妆对齐 ⭐ 杀手级
│   │   ├── full-audit.md         # 全量审计（不修）
│   │   └── progressive-migrate.md # 渐进迁移到 runtime
│   ├── element/                  # L1 控件 SKILL
│   │   ├── el-table/SKILL.md
│   │   ├── el-form/SKILL.md
│   │   ├── el-dialog/SKILL.md
│   │   └── el-tag/SKILL.md
│   ├── vendors/                  # ⭐ L2 封装识别 SKILL
│   │   ├── base-table/SKILL.md       # 优先级 #1
│   │   ├── jh-components/SKILL.md    # 优先级 #2
│   │   ├── c-components/SKILL.md     # 优先级 #3
│   │   ├── custom-wrappers/SKILL.md  # 优先级 #4 兜底
│   │   ├── ag-grid/SKILL.md
│   │   └── unknown-wrapper/SKILL.md  # 兜底探测
│   ├── layouts/                  # L3 页面骨架 SKILL（按需扩展）
│   ├── runtime/                  # L4 业务渲染 SKILL
│   │   ├── style-align/SKILL.md
│   │   ├── design-tokens/SKILL.md
│   │   └── migration/SKILL.md
│   └── ops/                      # 操作类 SKILL
│       ├── scan/SKILL.md
│       └── fix/SKILL.md
│
├── templates/                    # 代码生成模板
│   ├── list-page/TPL-LIST.md
│   ├── form-dialog/TPL-FORM-DIALOG.md
│   ├── tree-list/TPL-TREE-LIST.md
│   └── ag-grid-page/TPL-AG-GRID.md
│
├── standards/                    # 团队规范文档
│   ├── ui/                       # UI 规范（01-table / 02-button / ...）
│   └── engineering/              # 工程规范（import 顺序 / 命名 / SCSS 结构）
│
├── bin/                          # CLI
│   └── wk-ui.js                  # 统一入口（init/update/diff/clean/doctor/prompts/scan/fix/add-preset）
│
├── dist/                         # 构建产物 + 兼容重定向
│   ├── tokens.css                # = design/tokens/base.css
│   ├── index.scss                # @use '../styles/index'
│   ├── element.scss              # @use '../styles/element/index'
│   ├── ag-grid-override.scss     # @use '../styles/vendors/ag-grid'
│   └── portal.scss               # @use '../styles/vendors/portal'
│
└── es/                           # tsup 构建产物（runtime ESM + d.ts）
    ├── index.js
    ├── common-preset.js
    └── *.d.ts
```

---

## 安装

```bash
pnpm add @agile-team/wk-skills-ui
# 或
npm i @agile-team/wk-skills-ui
yarn add @agile-team/wk-skills-ui
```

要求：Node ≥ 18，Vue ≥ 3.2，Element Plus ≥ 2.2。

---

## 版本亮点

当前小版本重点补齐 AI Skill 的安装、更新、清理和编辑器集成体验：

- `wk-ui init/update` 会安装 Skill、触发提示、MCP 配置和 manifest 清单
- `wk-ui diff/clean/doctor/prompts` 覆盖升级前对比、卸载清理、环境体检和提示词查看
- 内置 `wk-skills-ui` MCP Server，供 AI 编辑器调用扫描、检查和 dry-run 修复
- 支持 GitHub Copilot、Cursor、Windsurf、Kiro、Trae、Claude Code、Cline、Qoder、通用 Agents
- 与 `@agile-team/wl-skills-kit` 只做可选桥接提醒，不建立强依赖
- 接入 `@robot-admin/git-standards`，仓库维护和业务项目均可复用提交/检查规范

---

## 与 wl-skills-kit 的协同闭环

`wk-skills-ui` 与 `wl-skills-kit` 不强耦合，但可以互相配合形成“先统一视觉，再按团队规范渐进修复”的闭环：

- `wk-skills-ui` 负责整体设计体系、tokens、样式风格、化妆层和 UI runtime；无论项目是 kit 最佳写法、纯 Element Plus、老旧 `Base*` 封装，还是其他基于 Element Plus 的封装，都应尽量覆盖成统一视觉风格。
- `wl-skills-kit` 负责 AI 生成页面和前端工作流必须遵守的团队规范、最佳实践、业务模板、mock、api.md、菜单/字典/权限同步等，不直接负责样式体系。
- `wk-ui scan/check` 先识别项目中的多种 UI 写法并给出风格/结构结论；如果需要从“样式统一”进一步升级为“团队最佳实践写法”，再提示使用 `wl-skills-kit` 按扫描结论进行规范化重构。
- 即使暂不重构，`wk-skills-ui` 的 Skin/Native 样式覆盖也应继续生效，保证老项目和非标准写法至少获得统一视觉。

当页面由 `wl-skills-kit` 生成或重构时，推荐最终页面骨架保持：

```text
AbstractPageQueryHook + BaseQuery + BaseToolbar + BaseTable(render-type="agGrid", cid) + jh-pagination
```

---

## 快速开始

### 场景 A — 新项目（Native Mode）

```bash
# 1. 自动安装 skills + 配置接入
npx wk-ui init --mode native
```

```html
<!-- 2. index.html -->
<head>
  <link
    rel="stylesheet"
    href="/node_modules/@agile-team/wk-skills-ui/design/tokens/base.css"
  />
</head>
```

```scss
// 3. src/styles/index.scss
@use "@agile-team/wk-skills-ui/styles" as *;
```

```ts
// 4. src/main.ts
import { installCommonPreset } from "@agile-team/wk-skills-ui/runtime/common-preset";
installCommonPreset();
```

```vue
<!-- 5. 业务代码用 runtime API（参考 templates/list-page/） -->
<script setup>
import { defineColumns, renderOps } from "@agile-team/wk-skills-ui/runtime";

const columns = defineColumns([
  { type: "index", label: "序号", width: 60, align: "center" },
  { name: "name", label: "名称", minWidth: 150 },
  { name: "enableStatus", label: "状态", width: 90 }, // ← 自动渲染 Tag（已注册）
  {
    label: "操作",
    width: 120,
    fixed: "right",
    align: "center",
    defaultSlot: ({ row }) =>
      renderOps([
        { type: "view", onClick: () => modal.value.view(row.id) },
        { type: "edit", onClick: () => modal.value.edit(row.id) },
        { type: "del", onClick: () => handleDel(row.id) },
      ]),
  },
]);
</script>
```

### 场景 B — 老项目（Skin Mode）

```bash
# 1. 化妆模式接入（不安装 runtime/layouts 类 skill）
npx wk-ui init --mode skin
```

```scss
// 2. 仅引入 skin preset（不引入 layouts，避免冲击老布局）
@use "@agile-team/wk-skills-ui/styles/presets/skin" as *;
```

```bash
# 3. AI 编辑器中触发：
#    "用 wk-ui 的 legacy-skin-align 流程跑一下当前项目"
# → AI 按 _flows/legacy-skin-align.md 顺序执行 6 个 phase

# 或纯审计（不修）：
npx wk-ui scan --target src --mode skin --outFile audit.md
```

### 场景 C — AI 编辑器 / MCP 接入

```bash
# 安装或更新 Skill 到当前业务项目
npx wk-ui init --project . --editor auto
npx wk-ui update --project .

# 查看 AI 触发提示
npx wk-ui prompts

# 体检安装结果和 MCP/规范插件提示
npx wk-ui doctor --project .
```

安装后会写入 `.github/wk-skills-ui/TRIGGER_PROMPTS.md`、`.mcp.json` 和 `.wk-skills-ui-manifest.json`。支持的编辑器可以单独指定，例如 `--editor claude-code`、`--editor cline`、`--editor agents-generic`、`--editor qoder`。

### 场景 D — 仅 CI 检查

```json
// package.json
{
  "scripts": {
    "ui:check": "wk-ui check --project .",
    "ui:audit": "wk-ui scan --target src --outFile ui-audit.md",
    "ui:fix": "wk-ui fix --target src --dry-run"
  }
}
```

---

## CLI 速查

```bash
wk-ui init    [--project .] [--editor <e>] [--mode native|skin]
                            [--dry-run] [--skills-only]
wk-ui update  [--project .] [--force] [--dry-run]
wk-ui diff    [--project .]
wk-ui clean   [--project .] [--dry-run]
wk-ui doctor  [--project .]
wk-ui prompts
wk-ui scan    --target src  [--layer L0,L1,L2] [--vendor base-table,jh]
                            [--mode skin|native] [--outFile report.md]
wk-ui check   --project .
wk-ui fix     --target src  [--dry-run]
wk-ui all     --project .
wk-ui add-preset <name>     # 脚手架新业务 preset
```

支持的 AI 编辑器：`github-copilot` / `cursor` / `windsurf` / `kiro` / `trae` / `claude-code` / `cline` / `agents-generic` / `qoder`（自动检测）

`init/update` 会同时写入：

- AI Skill 规则文件
- `.github/wk-skills-ui/TRIGGER_PROMPTS.md` 触发提示
- `.mcp.json` 中的 `wk-skills-ui` MCP Server 配置
- `.wk-skills-ui-manifest.json` 安装清单，供 `update/diff/clean/doctor` 使用

> 可选桥接：如项目也安装了 `@agile-team/wl-skills-kit`，两者保持独立分工，不互相强依赖。kit 负责编码规范/页面生成/菜单字典权限，wk-skills-ui 负责 UI 风格/化妆层/Runtime 渲染。

> 规范插件建议：项目可执行 `npx @robot-admin/git-standards init` 接入 ESLint/Prettier/Husky/提交规范，形成代码质量闭环。

---

## AI Skills 触发模型

### 组合流程触发（一句话跑全套）

```
@workspace 用 wk-ui 的 legacy-skin-align 流程对当前项目做老项目化妆对齐
↓
AI 按 _flows/legacy-skin-align.md 严格 6 phase 执行：
  1. 接入 tokens
  2. 接入 skin preset
  3. 触发 vendors/* skill 修复（按优先级 Base > jh > C_ > custom）
  4. 触发 element/* skill 修复
  5. 触发 tokens/* 规则修复
  6. 不动业务代码
```

### 单点 Skill 触发（精准修复）

```
@workspace 用 wk-ui 的 vendors/base-table skill 检查这个文件
↓ AI 仅加载 base-table SKILL.md，针对 R001/R002/R003/R014 修复
```

### Skin 模式优先级（团队约定）

```
Base* > jh-* > C_*/c_* > custom wrappers
       (高)            (低)
```

样式文件加载顺序在 `styles/vendors/index.scss` 中固化，确保高优先级覆盖低优先级。

---

## 扩展机制

### 1. 新增一个业务 preset

```bash
npx wk-ui add-preset my-biz
# 生成 runtime/presets/my-biz.ts，按提示填字段映射，然后：
```

```ts
// main.ts
import { installMyBizPreset } from "@agile-team/wk-skills-ui/runtime/presets/my-biz";
installMyBizPreset();
```

### 2. 新增一类 vendor 封装组件

1. 在 `styles/vendors/` 新建 `_xxx.scss`
2. 在 `styles/vendors/index.scss` 按优先级 `@forward` 进去
3. 在 `skills/vendors/xxx/` 新建 `SKILL.md`（含 Detect/Diagnose/Repair 三段）
4. 在 `skills/_meta/_detection.md` 追加识别特征
5. 在 `scanner/rules/` 追加规则（带 `category: 'vendor-xxx'`，自动获得 `layer:'L2'`）

### 3. 新增一类页面骨架

1. 在 `styles/layouts/` 新建 `_xxx.scss`
2. 在 `styles/layouts/index.scss` `@forward` 进去
3. 在 `templates/xxx/` 新建 `TPL-XXX.md`
4. 在 `skills/layouts/xxx/` 新建 `SKILL.md`

### 4. 新增一条扫描规则

```js
// scanner/rules/my-rule.mjs
export const myRules = [
  {
    id: "R200",
    category: "vendor-base-table", // 自动 layer=L2 / vendor=base-table
    severity: "warning",
    name: "...",
    check(template, file, lineOffset) {
      /* return issue[] */
    },
  },
];

// scanner/rules/index.mjs 中追加 import + addRules
```

---

## Element Plus 组件族样式管控

`wk-skills-ui` 的核心是样式绝对管控。加载 `styles`、`styles/presets/skin` 或 `styles/presets/element-only` 后，会统一覆盖首批 B 端高频 Element Plus 组件族：

| 组件族       | 覆盖标签                                                   | 典型场景                         |
| ------------ | ---------------------------------------------------------- | -------------------------------- |
| card         | `el-card`                                                  | 列表容器、详情卡片、统计卡片     |
| tabs         | `el-tabs` `el-tab-pane`                                    | 详情页 Tab、配置页 Tab、主从切换 |
| descriptions | `el-descriptions`                                          | 详情页字段展示、只读信息区       |
| tree         | `el-tree`                                                  | 左树右表、组织树、区域树         |
| drawer       | `el-drawer`                                                | 抽屉详情、抽屉编辑               |
| upload       | `el-upload`                                                | 附件上传、图片上传、文件列表     |
| steps        | `el-steps` `el-step`                                       | 审批流、流程状态                 |
| overlay      | `el-popover` `el-tooltip` `el-dropdown`                    | 辅助说明、溢出提示、更多操作     |
| navigation   | `el-menu` `el-breadcrumb`                                  | 导航、面包屑                     |
| feedback     | `el-empty` `el-result` `el-alert` `el-badge` `el-timeline` | 空状态、异常状态、提示反馈       |

扫描器会在 JSON/Markdown 报告中输出 `componentCoverage`、`recommendedSkills`、`recommendations` 和 `kitBridge`，用于 AI 自动判断下一步是继续由 `wk-skills-ui` 做 Skin/Native 视觉统一，还是桥接 `wl-skills-kit` 做页面结构规范化。

同时会识别以下 B 端组合业务场景：

| 场景                | 识别含义                     |
| ------------------- | ---------------------------- |
| `query-table`       | 查询区 + 表格                |
| `toolbar-actions`   | 工具栏 / 批量操作栏          |
| `tree-table`        | 左树右表                     |
| `dialog-form`       | 弹窗表单                     |
| `drawer-detail`     | 抽屉详情 / 抽屉编辑          |
| `detail-card`       | 详情卡片                     |
| `tab-workbench`     | Tab 工作台 / Tab 详情        |
| `attachment-upload` | 附件上传                     |
| `process-flow`      | 流程 / 审批                  |
| `feedback-state`    | 空状态 / 异常状态 / 反馈提示 |

---

## AI/MCP 智能引导

| MCP Tool                | 作用                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `wks_ui_check`          | 检查 tokens/styles/runtime 接入完整性                      |
| `wks_ui_scan`           | 扫描 UI 风格偏差，输出 Markdown 或 JSON                    |
| `wks_ui_fix_dry_run`    | 预览自动修复，不实际写入                                   |
| `wks_ui_skill_prompt`   | 输出 AI 触发提示                                           |
| `wks_ui_route_intent`   | 根据自然语言识别 UI 治理意图并推荐 flow/tool/skill         |
| `wks_ui_recommend_flow` | 根据扫描 JSON 推荐 nextActions 和 `wl-skills-kit` 桥接动作 |

推荐智能体流程：

```text
用户自然语言
  → wks_ui_route_intent
  → wks_ui_scan --output json
  → wks_ui_recommend_flow
  → 先保证样式统一
  → 如需规范化，再桥接 wl-skills-kit validate-page / doctor-ui
```

---

## Runtime API 概览

| API                                              | 说明                                               |
| ------------------------------------------------ | -------------------------------------------------- |
| `defineColumns(cols)`                            | 列定义，自动应用 `COLUMN_AUTO_MAP`                 |
| `renderOps(items)`                               | 操作列图标按钮组（view/edit/del/log/ok/send 预设） |
| `renderTagNode(v, map)`                          | 状态 Tag 渲染                                      |
| `renderClassifyTag(v, map)`                      | 分类 Tag 渲染                                      |
| `renderBadge(v)` / `renderCountBadge(v)`         | 编号 / 计数徽标                                    |
| `renderRatingLevel(v)`                           | 评级颜色                                           |
| `registerColumnAutoMap(field, config)`           | 注册新字段自动渲染                                 |
| `installCommonPreset()`                          | 安装通用业务预设                                   |
| `setDictResolver(fn)`                            | 解耦动态字典查询                                   |
| `createPreset(config)` / `installPreset(config)` | 自定义 preset 工厂                                 |

---

## 设计令牌

详见 `design/spec/`：

| 维度 | 文档                                                   |
| ---- | ------------------------------------------------------ |
| 颜色 | [design/spec/color.md](design/spec/color.md)           |
| 字号 | [design/spec/typography.md](design/spec/typography.md) |
| 间距 | [design/spec/spacing.md](design/spec/spacing.md)       |

主色：`#4368ff` → `--el-color-primary`（与 Element Plus 默认蓝对齐）

---

## 规范清单

### UI 规则（R001-R037，按 layer 自动分组）

| Rule | Layer | Vendor    | 说明                                 |
| ---- | ----- | --------- | ------------------------------------ |
| R001 | L1    | element   | el-table-column 缺 `align="center"`  |
| R002 | L1    | element   | el-table 缺 `empty-text`             |
| R003 | L1    | element   | BaseTable 缺 `empty-text`            |
| R004 | L1    | element   | 操作列按钮非文字按钮                 |
| R005 | L1    | element   | 工具栏按钮缺 icon                    |
| R006 | L1    | element   | 表单控件缺 `size="small"`            |
| R007 | L1    | element   | el-date-picker 缺 `width:100%`       |
| R008 | L1    | element   | label-width ≥ 150px                  |
| R009 | L1    | element   | 状态字段纯文本渲染                   |
| R010 | L1    | element   | 分类字段缺 `effect="plain"`          |
| R011 | L1    | element   | 分页器位置错误                       |
| R012 | L1    | element   | 弹窗内 el-table 缺 `empty-text`      |
| R013 | L4    | runtime   | columnsDef 用旧格式 `operations: []` |
| R014 | L1    | element   | selection 列缺 header-align          |
| R015 | L1    | element   | modal 内表格按钮非 link              |
| R016 | L0    | —         | `<style>` 块硬编码颜色               |
| R017 | L0    | —         | `<template>` 块硬编码颜色            |
| R018 | L0    | —         | `<script>` 块硬编码颜色              |
| R021 | L2    | BaseTable | BaseTable 缺 `render-type="agGrid"`  |
| R022 | L2    | BaseTable | BaseTable 缺唯一 `cid/:cid`          |
| R031 | L1    | element   | el-card 建议使用统一场景 class       |
| R032 | L1    | element   | el-tabs 建议明确页面场景             |
| R033 | L1    | element   | el-descriptions 建议 bordered/容器   |
| R034 | L1    | element   | el-drawer 建议明确 size              |
| R035 | L1    | element   | el-upload 建议配置 tip/限制说明      |
| R036 | L1    | element   | el-steps 建议明确状态来源            |
| R037 | L1    | element   | 空/异常反馈建议统一操作入口          |

### 工程规范

- [01-import-order.md](standards/engineering/01-import-order.md)
- [02-naming.md](standards/engineering/02-naming.md)
- [03-scss-structure.md](standards/engineering/03-scss-structure.md)

---

## 未来路线图

| 阶段       | 目标                                                                |
| ---------- | ------------------------------------------------------------------- |
| **v1.5.x** | 生命周期 CLI + manifest + MCP + 多编辑器适配 + 规范插件接入         |
| **v1.6**   | 多业务 preset 矩阵（safe / hr / asset / ops 等）和更多 MCP 辅助工具 |
| **v2.0**   | 稳定接口冻结，正式标记 stable                                       |

---

## 贡献

```bash
git clone git@github.com:ChenyCHENYU/wl-skills-ui.git
cd wl-skills-ui
pnpm install
pnpm lint
pnpm build
node scanner/index.mjs scan --target reference
```

约定：

- 提交规范见 [Git Commit Convention](#git-commit-convention)
- 新增规则必须带 `category` → 自动获得 `layer/vendor`
- 新增 vendor 必须同时更新：styles + skills + \_detection.md + scanner

### Git Commit Convention

```
类型(作用域): 内容
```

类型：`feat` `fix` `docs` `style` `refactor` `chore` `perf`

---

## License

UNLICENSED — 内部专用，未经授权不得外传
