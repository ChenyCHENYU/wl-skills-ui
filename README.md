# @agile-team/wl-skills-ui

> **企业级 UI 风格对齐框架** — 让 Vue + Element Plus 业务系统获得一致的视觉、可被 AI 精确识别和修复的设计规范，以及可演进的工程能力。

[![npm version](https://img.shields.io/npm/v/@agile-team/wl-skills-ui.svg)](https://www.npmjs.com/package/@agile-team/wl-skills-ui)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg)]()

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
wl-skills-ui/
├── design/                       # L0 — 设计令牌
│   ├── tokens/
│   │   ├── base.css              # CSS 变量声明（:root --el-color-primary 等）
│   │   └── index.css
│   └── spec/                     # 设计规范文档（color / typography / spacing）
│
├── styles/                       # L1+L2+L3 SCSS 实现
│   ├── tokens/                   # SCSS 变量映射层（$wk-* → CSS 变量）
│   ├── element/                  # L1 Element Plus 控件对齐
│   │   ├── _button.scss           # 主按钮四态强覆盖（设计规范色阶）
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
│   ├── auto.ts                   # Skin/老项目包级保护自动入口
│   ├── guards.ts                 # 主题锁 + 长文本 + 分屏表格尺寸保护聚合
│   ├── overflow-tooltip.ts       # 普通表格真实溢出 Tooltip 兜底
│   ├── split-grid-resize.ts      # jh-drag-row 内 AG Grid Resize/高度链守护
│   └── index.ts                  # 公共 API 入口
│
├── scanner/                      # 自动化扫描 / 修复
│   ├── index.mjs                 # CLI（含 --layer/--vendor/--mode 过滤）
│   ├── rules/                    # 规则集
│   │   ├── _shared.mjs           # 公共工具 + inferMeta(layer/vendor)
│   │   ├── table.mjs             # R001 R002 R003 R014 R039
│   │   ├── form.mjs              # R006 R007 R008
│   │   ├── button.mjs            # R004 R005 R015 R038
│   │   ├── componentStructure.mjs # R040 复合结构登记审查
│   │   ├── tag.mjs               # R009 R010 R012
│   │   ├── dialog.mjs            # R011
│   │   ├── color.mjs             # R016 R017 R018
│   │   ├── semantic.mjs          # R025 R026 R027
│   │   ├── componentFamily.mjs   # R031 R032 R033 R034 R035 R036 R037
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
│   │   ├── el-tag/SKILL.md
│   │   └── component-family/      # 扩展组件族（card/tabs/descriptions/drawer/upload/steps/feedback）
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
│       ├── audit/SKILL.md
│       ├── fix/SKILL.md
│       └── migrate/SKILL.md
│
├── templates/                    # 代码生成模板
│   ├── list-page/TPL-LIST.md
│   ├── form-dialog/TPL-FORM-DIALOG.md
│   ├── tree-list/TPL-TREE-LIST.md
│   └── ag-grid-page/TPL-AG-GRID.md
│
├── standards/                    # 团队规范文档
│   ├── component-structures.json # 复合控件结构契约单一事实源
│   ├── ui/                       # UI 规范（01-table / 02-button / ...）
│   └── engineering/              # 工程规范（import 顺序 / 命名 / SCSS 结构）
│
├── tests/visual/                 # Chromium 真实浏览器视觉回归与基准图
│
├── bin/                          # CLI
│   └── wl-ui.js                  # 统一入口（init/update/diff/clean/doctor/prompts/scan/fix/add-preset）
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
pnpm add @agile-team/wl-skills-ui
# 或
npm i @agile-team/wl-skills-ui
yarn add @agile-team/wl-skills-ui
```

要求：Node ≥ 22，Vue ≥ 3.2，Element Plus ≥ 2.2。

---

## 项目-依赖适配矩阵速查

集团项目集群推荐组合（**单一事实源**：`docs/compat-matrix.md` + `skills/_meta/_compat/vendors.json` 的 `jh.compat`）：

| 依赖 | 推荐版本 | 备注 |
|---|---|---|
| `element-plus` | **`2.2.6-prod.3`** | 集团 jh- 定制版；EP 2.3.0 起引入 `.el-input__wrapper`，与 jh-ui 3.x 不兼容 |
| `@jhlc/jh-ui` | **`3.1.0`** | SCSS 皮肤包，`.com-text` label 包裹 + `.has-colon` 冒号注入（wl-skills-ui 已统一屏蔽表单冒号） |
| `@agile-team/wl-skills-ui` | `^1.9.14` | 已对齐上述组合的 DOM 假设、客户主题锁、圆角契约、复合数字框、跨浏览器字体、AG Grid 原生对齐与定制页边界 |

三种识别方式，任选其一：

- **启动期自动**：`vite.config.ts` 加一行 `import { wlSkillsCheck } from '@agile-team/wl-skills-ui/vite'; export default defineConfig({ plugins: [wlSkillsCheck()] })`，每次 `dev/build` 偏离推荐组合时彩色打印警告（支持 `enforce: 'error'` 阻断）。
- **手动 CLI**：`npx wl-ui check --project .` 看 `I005:<vendor>`；偏离时执行 `npx wl-ui doctor --print-overrides` 拿到可直接复制的 `pnpm.overrides` 修复片段。
- **AI 协作**：MCP 工具 `wl_ui_detect_skin` 一次返回多 vendor 评估结果（`vendors[].verdict / fixSnippet / summary`）。

完整版本-项目实测表见 `docs/compat-matrix.md`。

---

## 版本亮点

当前 v1.9.14：

- **Edge/Chrome 字体收敛**：受管 Element、BaseTable 与 AG Grid 统一使用覆盖中英文数字的
  `--wk-font-family-sans`，AG 表头/正文使用整数 13px；不改写 `body/*`，登录页、大屏、
  编辑器、图表、图标字体和显式豁免区不受影响。
- **jh-input-number 精准解耦**：普通 Element 数字框规则不再误命中
  `.com-inputNumber-content`；复合根统一 26px 和唯一状态描边，同时保留组件自身
  `textAlign`、controls、单位及后缀语义。
- **BaseTable/AG Grid 原生语义恢复**：焦点单元格四边框完整；取消普通单元格和表头的
  强制居中，`align/headerAlign` 重新以列配置和 AG Grid 原生样式为准，复选框列仍精准居中。
- **双浏览器门禁**：Windows Edge 维护像素基准，Edge + Google Chrome 同时验证字体、
  数字框高度、焦点边框及左右对齐计算样式。

上一版 v1.9.13：

- **输入附加段不再割裂**：`el-input-group` 由组合根统一 26px 高度、6px 外圆角和 default/hover/focus/error/disabled 描边；左侧 prefix、右侧 append 图标统一 14px，纯图标附加段 32px，文字/单位/按钮仍按内容宽度。
- **新旧 DOM 同时覆盖**：兼容 jh-ui 配套旧版 input 直挂结构和新版 `.el-input__wrapper` 结构，内部输入不再重复描边；普通 input、普通按钮、登录页和显式豁免区保持原行为。
- **分屏表格真正重布局**：`runtime/auto` 只观察 `jh-drag-row` 内真实 AG Grid pane，补齐可收缩高度链并按帧派发局部重布局事件；AG Grid 自身 ResizeObserver 生成内部滚动条，不给外层加滚动条、不广播全局 resize、不访问 Vue 私有实例。
- **回归边界闭环**：结构清单新增 input-group 新旧 DOM 与 drag-row/AG Grid 契约；Node 行为测试覆盖动态挂载、批量 Resize、豁免区，真实浏览器验证附加段计算样式及 220px→120px 收缩后的内部滚动。

上一版 v1.9.12：

- **复合结构有清单**：`standards/component-structures.json` 登记边框所有者、内部无描边层、高度策略、状态与 Teleport 出口；首批覆盖 common-core 多标签、人员/部门/树选择、多选、混合数字框及 BaseToolbar 分裂按钮。
- **未知结构先评审**：新增 R040，对疑似复合 Element wrapper 只报告、不自动修复，要求先核对真实 DOM 并登记契约，禁止继续放大普通 Element 选择器。
- **发版前真实浏览器门禁**：新增 Chromium 视觉回归，验证客户主题防反覆盖、按钮与圆角、textarea focus、数字框单描边、复合输入自然增高、长文本省略/提示、表格行状态和定制区域豁免；截图基准不进入 npm 产物。

上一版 v1.9.11：

- **复合输入不再误伤**：common-core 多标签/人员选择器不再被普通 input 的固定高度压缩；无标签时保持 26px 紧凑基线，标签换行时容器自然增高。
- **视觉契约保持统一**：复合输入外层继续使用统一 6px 圆角及默认、hover、品牌 focus、error、disabled 边框，内部编辑 input 不重复描边；普通 input/select/date/input-number 原有规则不变。
- **结构级防回归**：新增与 common-core 实际 DOM 一致的分类测试，明确区分复合外壳、内部编辑器和普通输入框，防止后续通用选择器再次误命中。

上一版 v1.9.10：

- **长文本真正包级闭环**：普通 Element Table、BaseTable 与 AG Grid 即使没有经过 `defineColumns()`，真实超宽时也会稳定显示省略号，并由 `runtime/auto` 在悬停或键盘聚焦时兜底完整文本提示；动态行和虚拟滚动无需额外处理。
- **严格防污染边界**：已有组件 Tooltip 优先，编辑列、操作列、Tag、复选框、自定义 renderer、主动换行列、登录页及显式皮肤豁免区域均不接管；没有溢出时不创建 Tooltip。
- **发布验证补强**：新增真实 DOM 行为测试，并将 SCSS 门禁从路径存在检查升级为完整入口编译，防止 flex 省略冲突或无效选择器再次漏发。

上一版 v1.9.9：

- **主操作按钮不再漏色**：新增/新建/添加/创建类按钮强制使用客户主题 `primary` 填充样式，扫描器可识别并自动修复漏写 `type` 或误带 `plain` 的存量代码。
- **长文本交互统一**：普通数据列在空间不足时单行省略，悬停显示完整内容；Tag、操作列、自定义渲染和主动换行列不被机械覆盖。
- **表格行状态降噪**：Element Table 与 AG Grid 的 hover/selected 统一为品牌色 4%/7% 浅层，选中态优先于悬停，同时保留编辑控件、校验态、Tag 和业务语义单元格底色。
- **紧凑表单字号闭环**：业务表单 label、输入值、选择值、placeholder、textarea 与数字输入统一为 12px；登录页和显式定制区域继续保持项目自身设计。
- **输入边框状态闭环**：textarea 聚焦始终显示品牌色边框；数字输入兼容 Element Plus 新旧及混合 wrapper DOM，默认、hover、focus、错误、禁用态均只保留一层正确边框。
- **分裂操作保持一体**：BaseToolbar 的主动作与下拉箭头共用外轮廓和状态色，下拉菜单中的业务按钮扁平化为菜单项；规则精准限定在平台工具栏结构，不污染普通按钮组和普通下拉菜单。
- **Vite 4 运行时兼容**：浏览器 ESM 产物不再暴露可被开发转换误替换的 Node 环境变量成员链，预构建与直接加载均保持合法语法。
- **登录页精准退出**：内置识别 `.lp-root` 与 `.session-login`，其内部表单、按钮、焦点和校验态保留登录页自身设计；业务页面仍由包高权重统一管控。
- **通用定制页边界**：其他定制页在根节点增加 `.wl-ui-skin-exempt` 或 `data-wl-ui-skin="off"` 即可退出组件级强覆盖，不需要删除全局化妆包。
- **主题锁不降级**：豁免只作用于 Element Plus / vendor 的直接组件覆盖；全局客户品牌 token 和平台动态主题防反覆盖继续生效。定制页若需独立色，可在自己的根节点重新声明 token 或直接编写局部样式。

```vue
<template>
  <main class="wl-ui-skin-exempt">
    <!-- 登录、大屏等定制内容 -->
  </main>
</template>
```

上一版 v1.9.2：

- **动态主题不可反覆盖**：品牌色、功能色和圆角使用 CSS `!important` + runtime `MutationObserver` 双保险；平台登录后写入 `document.body.style` 也会立即恢复为包内规范值。
- **圆角契约恢复**：按钮、输入框等基础控件统一 `6px`，不再回退到 jh-ui 的 `2px`；圆形、胶囊、按钮组仍保留各自语义。
- **语义色降噪**：成功 `#2BB268`、警告 `#EA9A13`、危险 `#BB2D3F` 均被主题锁保护，按钮彩色强阴影调整为轻量中性阴影，整体更稳重。

上一版 v1.9.1：

- **客户主色纠偏**：严格按《烟台华新数智化信息化改造项目 UI 规范 v1》统一主色为 `#002A8F`，并同步完整深浅色阶。
- **按钮四态强覆盖**：主按钮常规 `#002A8F`、悬停 `#1A3F9A`、点击 `#002681`、禁用 `#B2BFDD`；`html body` 高特异性和填充按钮 `!important` 抵御 Element Plus、jh-ui 与旧业务皮肤覆盖。
- **单源防漂移**：主色半透明场景统一读取 `--el-color-primary-rgb`，发布校验会阻断 token、SCSS、按钮状态或文档重新漂移到旧亮蓝。

上一版 v1.9.0：

- **独立闭环**：不依赖 kit/design/bd 即可安装、审计、修复、复检、快照和回退；存在 kit 的 page-spec 时只复用页面模式与组件命名约定，不形成运行时硬依赖。
- **CLI 真实一致**：统一入口正式支持 `audit/drift/exempt/snapshot`，未知命令非零退出，`audit --refresh-baseline` 可维护增量治理基线。
- **修复失败安全**：快照失败即停止写入；快照与回退拒绝路径越界/符号链接越界；写入中断自动恢复本轮已写文件，修复结束自动复检。
- **发布面闭环**：修复 `./runtime` 导出，新增构建产物导入烟测、规则/fixer 一致性校验和 `verify/release:check/prepublishOnly` 门禁。

上一版 v1.8.17：

- **操作列状态辨识**：可用图标默认使用柔和主题蓝，hover 保留蓝/绿/红语义色；禁用态统一浅灰且不响应 hover，选中行不再改变按钮语义色

上一版 v1.8.16：

- **label 冒号通杀（根治"就它带冒号"）**：jh-* 组件的 `showColon` 默认 true，渲染冒号走 `.com-text` 但不带 `.has-colon`，旧规则（仅 `.has-colon` 限定）命不中。新增不限 `.has-colon` 的通杀规则，咔嚓所有 `.el-form-item__label` 内冒号伪元素

上一版 v1.8.15：

- **jh-drag-row 上下分栏手柄覆盖**：新增 `styles/vendors/_jh-drag-row.scss`，补齐此前缺失的 `jh-drag-row`（上下/主从表）手柄覆盖，与 `_jh-drag-col.scss`（左右）同源风格。手柄颜色统一跟随 `--el-color-primary`，不再保留独立色值
- **平台包职责澄清**：`@jhlc/jh-ui` 是纯 SCSS 包（零组件），所有 `jh-*`/`Base*`/`C_*` 组件来自 `@jhlc/common-core`。本包作为化妆层精准层叠覆盖二者视觉，不改平台层源码——L0 token 用 `:root body` 压过 jh-ui 编译产物的 `:root`，L2 直接写目标属性 + `!important` 绕过组件 `var()` 引用。**项目装了本包后，一切以本包为准**

上一版 v1.8.14：

- **jh-picker 精准修复**：补齐 `.com-picker` / `.com-reference-picker` / `jh-picker` trigger 输入高度，客户等 picker 查询项与 input / select 保持一致
- **label 冒号兜底**：同时屏蔽 jh-ui `.com-text:after` 与 `.text-line-2:after` 冒号注入，picker / select / input label 全部不带 `:`
- **表单密度统一**：label 与右侧控件间距统一 16px，单行 input / select / picker / jh-* 控件高度统一 26px
- **label 冒号统一**：屏蔽 jh-ui `.has-colon .com-text::after` 冒号注入，picker / select / input 不再有的带冒号、有的不带冒号
- **loading 遮罩质感优化**：BaseTable / AG Grid 的 v-loading 由灰色蒙层改为毛玻璃半透明（backdrop-filter），数据切换无感
- **R027** 检测业务代码硬编码 `.el-loading-mask` 背景色 → 提示删除，由包统一覆盖
- **R025** 语义合规：`options:[]` 退化检测 → 升级 `renderTagSlot` / `renderDictClassifyTag`
- **R026** 原生 HTML 拦截：`<table>/<input>/<select>/<button>/<textarea>` → 替换 el-* 组件
- `scan --only/--skip` 规则过滤 + `exempt init` 智能豁免脚手架
- `scan --baseline` 漂移对比 + SCSS 链路检查 + R-rule 单一事实源（35 条）

历史亮点（v1.7.1）：

- 新增 Vite 插件 `@agile-team/wl-skills-ui/vite`：消费方一行配置即可在每次启动 dev/build 时自动跑版本配对校验，偏离时彩色提示 + 修复片段
- 新增 `npx wl-ui doctor --print-overrides`：检测到偏离直接输出 pnpm/npm/yarn overrides JSON，复制粘贴即可修复
- `vendors.json` `compat` 升级为 `peers / gatingPeer / conflictsWith / domAssumptions` 结构化 schema，未来新增 vendor 配对零代码改动
- scanner `I005` 拆为 `I005:<vendor>`，MCP `wl_ui_detect_skin` 一次返回多 vendor 结果
- 抽出 `skills/_meta/_compat/loader.mjs` 共享加载器，scanner/MCP/Vite/CLI 单源共用

历史亮点（v1.7.0 起）：

- 新增 `docs/compat-matrix.md` 作为项目集群推荐版本与 wl-skills-ui 的适配矩阵单一事实源；`skills/_meta/_compat/vendors.json` 在 `jh.compat` 字段钉死 `element-plus@2.2.6-prod.3` + `@jhlc/jh-ui@3.1.0`
- scanner 接入完整性新增 `I005`：基于 `vendors.json` 校验消费方 `package.json` 是否锚定推荐组合，偏离时给出明确建议
- MCP 新增 `wl_ui_detect_skin` 工具，AI 写样式前可一键拿到 `verdict: match | mismatch | no-jh-ui` 与推荐 SCSS 列表
- `legacy-skin-align` flow 增加 Phase 0.5 强约束：写样式前必须先识别版本配对；`jh-components` SKILL 补全反例（`.el-input__wrapper.is-focus` 在 EP 2.2 永远命中不到等）
- `docs:check` 扩展校验：`docs/compat-matrix.md` 中的版本号必须与 `vendors.json` 同步，避免事实源漂移
- 沿用 v1.6.14 的 `_jh-ui.scss` 适配层（`.com-text` label / EP 2.2.x `.el-input__inner` focus + error / 必填星号）
- 兼容 Element Plus 2.2.x（`.el-input__inner` 直挂结构）下输入、选择、日期控件的圆角 / focus / error 三态，jh-select 与 jh-date-picker focus 行为稳定
- 补强输入、选择、日期、文本域 focus 品牌色边框和必填星号红色显示规则，兼容 Element Plus 定制版本差异
- 修复表单必填星号、错误 label、错误提示和错误边框红色态，避免校验反馈被通用 label/input 样式覆盖
- 优化 BaseToolbar 下拉/分裂按钮组，让“主动作 + 下拉动作”按一个动作组展示，避免视觉割裂
- 优化 AG Grid 操作列 `jh-op-*` 图标/胶囊/文字按钮，取消按压缩放抖动，并提升选中行下的可读性
- 补齐输入控件 focus 品牌色边框、统一圆角、长 label 单行省略和自定义弹窗图标居中尺寸规则
- 移除旧 `wk-` 工程命名（包名 / CLI / 快照目录 / 豁免配置 / MCP 工具名）；`--wk-*` 设计 token 作为既有公共契约继续保留，避免破坏消费项目的变量覆盖，它不代表加载了旧包
- 新增 `skills/_meta/_compat/vendors.json` 作为 L2 Project Vendors 的单一事实源（id / priority / patterns / baseline / styles），`scanner/coverage.mjs` 启动时一次性编译 RegExp，零运行时开销
- 新增 `wl-ui add-vendor <tag> [--family <id>] [--dry-run]` 脚手架命令：一键生成专项 SCSS、`@forward` 注册、`vendors.json` baseline 追加、scanner 规则草稿
- MCP 工具前缀统一为 `wl_ui_*`（`wl_ui_check` / `wl_ui_scan` / `wl_ui_fix_dry_run` / `wl_ui_skill_prompt` / `wl_ui_route_intent` / `wl_ui_recommend_flow`）
- `npm run docs:check` 扩展到全部代码与文档类型，新增禁忌词、vendor 优先级一致性、`jh-components` 全量通配语义防回归

历史亮点（v1.6.9）：

- `skills/**/*.md` 作为唯一规则源，`wl-ui init/update` 会按编辑器格式转换并覆盖写入目标 rules
- `skills/_meta/_compat/editors.json` 作为 AI 编辑器安装配置唯一来源，CLI 不再维护第二份编辑器路径映射
- `wl-ui update --editor all --force` 可一次性刷新全部支持编辑器；未指定编辑器时会刷新 manifest 与项目中已存在的编辑器规则目录
- `standards/architecture/01-layer-boundaries.md` 固化 tokens、Element Plus、Project Vendors、layouts、runtime、scanner、skills 的扩展边界，明确 `Base*` / `jh-*` / `C_*` / AG Grid 是当前项目集群必覆盖层
- `vendors/jh-components` 使用 `<jh-*>` 全量通配治理，当前只维护代表性基线和专项覆盖准入，避免遗漏新增 jh 封装
- `npm run docs:check` 校验旧命名、旧命令、版本文案和编辑器配置，防止规则文档回退
- 表格空状态改为对应表格区域内自适应居中，避免嵌套表格靠固定高度猜效果
- 查询区/工具栏按钮补齐 token fallback，禁用按钮独立保留清晰禁用态
- 表单控件圆角统一使用 `--wk-form-control-radius`，覆盖 input/select/date/textarea/upload 等控件家族
- `wl-ui init/update` 会安装 Skill、触发提示、MCP 配置和 manifest 清单
- `wl-ui diff/clean/doctor/prompts` 覆盖升级前对比、卸载清理、环境体检和提示词查看
- 内置 `wl-skills-ui` MCP Server，供 AI 编辑器调用扫描、检查和 dry-run 修复
- 支持 GitHub Copilot、Cursor、Windsurf、Kiro、Trae、Claude Code、Cline、Qoder、通用 Agents
- 与 `@agile-team/wl-skills-kit` 只做可选桥接提醒，不建立强依赖
- 接入 `@robot-admin/git-standards`，仓库维护和业务项目均可复用提交/检查规范

---

## 与 wl-skills-kit 的协同闭环

`wl-skills-ui` 与 `wl-skills-kit` 不强耦合，但可以互相配合形成“先统一视觉，再按团队规范渐进修复”的闭环：

- `wl-skills-ui` 负责整体设计体系、tokens、样式风格、化妆层和 UI runtime；无论项目是 kit 最佳写法、纯 Element Plus、老旧 `Base*` 封装，还是其他基于 Element Plus 的封装，都应尽量覆盖成统一视觉风格。
- `wl-skills-kit` 负责 AI 生成页面和前端工作流必须遵守的团队规范、最佳实践、业务模板、mock、api.md、菜单/字典/权限同步等，不直接负责样式体系。
- `wl-ui scan/check` 先识别项目中的多种 UI 写法并给出风格/结构结论；如果需要从“样式统一”进一步升级为“团队最佳实践写法”，再提示使用 `wl-skills-kit` 按扫描结论进行规范化重构。
- 即使暂不重构，`wl-skills-ui` 的 Skin/Native 样式覆盖也应继续生效，保证老项目和非标准写法至少获得统一视觉。

当页面由 `wl-skills-kit` 生成或重构时，推荐最终页面骨架保持：

```text
AbstractPageQueryHook + BaseQuery + BaseToolbar + BaseTable(render-type="agGrid", cid) + jh-pagination
```

---

## 快速开始

### 场景 A — 新项目（Native Mode）

```bash
# 1. 自动安装 skills + 配置接入
npx wl-ui init --mode native
```

```html
<!-- 2. index.html -->
<head>
  <link
    rel="stylesheet"
    href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css"
  />
</head>
```

```scss
// 3. src/styles/index.scss
@use "@agile-team/wl-skills-ui/styles" as *;
```

```ts
// 4. src/main.ts
import { installCommonPreset } from "@agile-team/wl-skills-ui/runtime/common-preset";
installCommonPreset();
// 已包含主题锁、普通表格长文本和分屏 AG Grid 尺寸保护，无需重复引入 runtime/auto。
```

```vue
<!-- 5. 业务代码用 runtime API（参考 templates/list-page/） -->
<script setup>
import { defineColumns, renderOps } from "@agile-team/wl-skills-ui/runtime";

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
npx wl-ui init --mode skin
```

```scss
// 2. 仅引入 skin preset（不引入 layouts，避免冲击老布局）
@use "@agile-team/wl-skills-ui/styles/presets/skin" as *;
```

```ts
// 3. src/main.ts：只安装包级保护，不接管页面布局或业务列定义
import "@agile-team/wl-skills-ui/runtime/auto";
```

```bash
# 4. AI 编辑器中触发：
#    "用 wl-ui 的 legacy-skin-align 流程跑一下当前项目"
# → AI 按 _flows/legacy-skin-align.md 顺序执行 6 个 phase

# 或纯审计（不修）：
npx wl-ui scan --target src --mode skin --outFile audit.md
```

### 场景 C — AI 编辑器 / MCP 接入

```bash
# 安装或更新 Skill 到当前业务项目
npx wl-ui init --project .
npx wl-ui update --project . --force
npx wl-ui update --project . --editor all --force

# 查看 AI 触发提示
npx wl-ui prompts

# 体检安装结果和 MCP/规范插件提示
npx wl-ui doctor --project .
```

安装后会写入 `.github/wl-skills-ui/TRIGGER_PROMPTS.md`、`.mcp.json` 和 `.wl-skills-ui-manifest.json`。支持的编辑器可以单独指定，例如 `--editor kiro`、`--editor claude-code`、`--editor cline`、`--editor agents-generic`、`--editor qoder`；也可以使用 `--editor all` 一次性生成全部编辑器规则。

### 场景 D — 仅 CI 检查

```json
// package.json
{
  "scripts": {
    "ui:check": "wl-ui check --project .",
    "ui:audit": "wl-ui audit --target src --outFile ui-audit.md",
    "ui:fix": "wl-ui fix --target src --dry-run"
  }
}
```

---

## CLI 速查

```bash
wl-ui init    [--project .] [--editor <e>] [--mode native|skin]
                            [--dry-run] [--skills-only]
wl-ui update  [--project .] [--editor <e|all>] [--force] [--dry-run]
wl-ui diff    [--project .]
wl-ui clean   [--project .] [--dry-run]
wl-ui doctor  [--project .]
wl-ui prompts
wl-ui scan    --target src  [--layer L0,L1,L2] [--vendor base-table,jh]
                            [--mode skin|native] [--outFile report.md]
wl-ui audit   --target src  [--output json] [--refresh-baseline]
wl-ui check   --project .
wl-ui fix     --target src  [--dry-run]
wl-ui all     --project .
wl-ui drift   --baseline .wl-baseline.json --current .wl-current.json
wl-ui exempt init --project . --target src
wl-ui snapshot list|diff|rollback|clean
wl-ui add-preset <name>     # 脚手架新业务 preset
```

支持的 AI 编辑器：`github-copilot` / `cursor` / `windsurf` / `kiro` / `trae` / `claude-code` / `cline` / `agents-generic` / `qoder` / `all`。`update` 未指定编辑器时会优先刷新 manifest 与项目中已存在的编辑器规则目录。

`init/update` 会同时写入：

- AI Skill 规则文件
- `.github/wl-skills-ui/TRIGGER_PROMPTS.md` 触发提示
- `.mcp.json` 中的 `wl-skills-ui` MCP Server 配置
- `.wl-skills-ui-manifest.json` 安装清单，供 `update/diff/clean/doctor` 使用

> 可选桥接：如项目也安装了 `@agile-team/wl-skills-kit`，两者保持独立分工，不互相强依赖。kit 负责编码规范/页面生成/菜单字典权限，wl-skills-ui 负责 UI 风格/化妆层/Runtime 渲染。

具体独立使用、可选 page-spec 协同和验证边界见 [`docs/delivery-compatibility.md`](docs/delivery-compatibility.md)。

> 规范插件建议：项目可执行 `npx @robot-admin/git-standards init` 接入 ESLint/Prettier/Husky/提交规范，形成代码质量闭环。

---

## AI Skills 触发模型

### 组合流程触发（一句话跑全套）

```
@workspace 用 wl-ui 的 legacy-skin-align 流程对当前项目做老项目化妆对齐
↓
AI 按 _flows/legacy-skin-align.md 严格 6 phase 执行：
  1. 接入 tokens
  2. 接入 skin preset
  3. 触发 vendors/* skill 修复（按优先级 Base > jh-* > C_ > AG Grid > custom）
  4. 触发 element/* skill 修复
  5. 触发 tokens/* 规则修复
  6. 不动业务代码
```

### 单点 Skill 触发（精准修复）

```
@workspace 用 wl-ui 的 vendors/base-table skill 检查这个文件
↓ AI 仅加载 base-table SKILL.md，针对 R001/R002/R003/R014 修复
```

### Skin 模式优先级（团队约定）

```
Base* > jh-* > C_*/c_* > AG Grid > custom wrappers
       (高)            (低)
```

样式文件加载顺序在 `styles/vendors/index.scss` 中固化，确保高优先级覆盖低优先级。vendor 层不是可选补丁层，而是当前项目集群统一风格的必需适配层。

---

## 扩展机制

### 1. 新增一个业务 preset

```bash
npx wl-ui add-preset my-biz
# 在消费项目生成 src/wl-ui/presets/my-biz.ts，按提示填字段映射，然后：
```

```ts
// main.ts
import { installMyBizPreset } from "@/wl-ui/presets/my-biz";
installMyBizPreset();
```

### 2. 新增一类 vendor 封装组件

1. 在 `styles/vendors/` 新建 `_xxx.scss`
2. 在 `styles/vendors/index.scss` 按优先级 `@forward` 进去
3. 在 `skills/vendors/xxx/` 新建 `SKILL.md`（含 Detect/Diagnose/Repair 三段）
4. 在 `skills/_meta/_detection.md` 追加识别特征
5. 在 `scanner/rules/` 追加规则（带 `category: 'vendor-xxx'`，自动获得 `layer:'L2'`）

### 3. 新增复杂 jh-* 封装专项覆盖

`<jh-*>` 默认已由 `vendors/jh-components` 全量识别。只有当某个 jh 组件满足以下条件之一时，才升级为专项样式：

1. 内部包含多个 Element Plus 组件或复杂 DOM
2. 默认样式明显偏离当前项目集群 tokens / spacing / radius
3. 高频出现在列表、树表、弹窗、详情、上传、流程等核心页面
4. scanner 或人工审计反复发现相同视觉问题
5. AI 按通用 jh 规则无法稳定修复

专项覆盖落地时，新增 `styles/vendors/_jh-xxx.scss`，并同步 `skills/vendors/jh-components/SKILL.md` 的代表性基线。

### 4. 新增一类页面骨架

1. 在 `styles/layouts/` 新建 `_xxx.scss`
2. 在 `styles/layouts/index.scss` `@forward` 进去
3. 在 `templates/xxx/` 新建 `TPL-XXX.md`
4. 在 `skills/layouts/xxx/` 新建 `SKILL.md`

### 5. 新增一条扫描规则

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

`wl-skills-ui` 的核心是样式绝对管控。加载 `styles`、`styles/presets/skin` 或 `styles/presets/element-only` 后，会先统一覆盖首批 B 端高频 Element Plus 组件族；基于 Element Plus 的 `Base*`、`jh-*`、`C_*`、AG Grid 等封装/组合组件由 `styles/vendors` 继续承接，确保当前项目集群不管怎么封装组装，都收敛到同一套视觉体系：

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

扫描器会在 JSON/Markdown 报告中输出 `componentCoverage`、`recommendedSkills`、`recommendations` 和 `kitBridge`，用于 AI 自动判断下一步是继续由 `wl-skills-ui` 做 Skin/Native 视觉统一，还是桥接 `wl-skills-kit` 做页面结构规范化。

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

## AI/MCP 智能引导（10 个工具）

| MCP Tool                | 作用                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `wl_ui_check`          | 检查 tokens/styles/runtime 接入完整性                      |
| `wl_ui_scan`           | 扫描 UI 风格偏差，输出 Markdown 或 JSON                    |
| `wl_ui_fix_dry_run`    | 预览自动修复，不实际写入                                   |
| `wl_ui_detect_skin`    | 检测项目 vendor 版本配对                                   |
| `wl_ui_skill_prompt`   | 输出 AI 触发提示                                           |
| `wl_ui_route_intent`   | 根据自然语言识别 UI 治理意图并推荐 flow/tool/skill         |
| `wl_ui_list_rules`     | 列出全部扫描规则及说明                                     |
| `wl_ui_describe_rule`  | 查询单条规则详情                                           |
| `wl_ui_drift`          | 对比基线漂移                                               |
| `wl_ui_recommend_flow` | 根据扫描 JSON 推荐 nextActions 和 `wl-skills-kit` 桥接动作 |

推荐智能体流程：

```text
用户自然语言
  → wl_ui_route_intent
  → wl_ui_scan --output json
  → wl_ui_recommend_flow
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
| `installUiRuntimeGuards()`                       | 安装主题锁与普通表格长文本包级保护                 |
| `installOverflowTooltipGuard()`                  | 单独安装真实溢出 Tooltip 兜底                      |
| `setDictResolver(fn)`                            | 解耦动态字典查询                                   |
| `createPreset(config)` / `installPreset(config)` | 自定义 preset 工厂                                 |

长文本兜底的接入方式、排除边界和验收方法见
[表格长文本包级兜底机制](docs/table-overflow-tooltip.md)。

---

## 设计令牌

详见 `design/spec/`：

| 维度 | 文档                                                   |
| ---- | ------------------------------------------------------ |
| 颜色 | [design/spec/color.md](design/spec/color.md)           |
| 字号 | [design/spec/typography.md](design/spec/typography.md) |
| 间距 | [design/spec/spacing.md](design/spec/spacing.md)       |

客户规范主色：`#002a8f` → `--el-color-primary`；业务代码只引用 token，不直接硬编码色值。

---

## 规范清单

### UI 规则（R001-R040，按 layer 自动分组）

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
| R038 | L1    | element   | 创建类主按钮缺 primary 填充主题色    |
| R039 | L1    | element   | 普通数据列缺省略与悬停完整提示       |
| R040 | L2    | common-core | 未登记复合控件结构需人工评审       |

### 维护者防回归

复合控件必须先登记结构契约，再增加精准样式；包发版必须经过 Edge 基准图与
Edge/Chrome 双浏览器计算样式验证：

```bash
# Windows 默认使用已安装的 Edge Chromium；非 Windows 首次安装一次
pnpm exec playwright install chromium

# 日常验证
pnpm test
pnpm test:visual

# 仅在设计变更已经人工确认时更新基准图
pnpm test:visual:update

# 完整发版门禁（含 lint、契约、SCSS、文档、构建、包校验、视觉回归）
pnpm release:check
```

机制与准入细则见 [复合控件结构契约](docs/composite-component-contracts.md) 和
[浏览器视觉回归](docs/visual-regression.md)。视觉基准依赖字体、浏览器与操作系统渲染，
必须在相同环境中比较；当前项目基准由 Windows Edge Chromium 生成。

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
