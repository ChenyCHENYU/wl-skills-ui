# @agile-team/wl-skills-ui

**企业级 UI 一致性与 AI 精确治理工具包 v1.16.0** — 面向 Vue 3 + Element Plus 的设计令牌、能力 Profile、样式皮肤、页面骨架、运行时能力、静态扫描、确定性修复、AI Skill、MCP 与脱敏 UI 模板契约。

它把“视觉统一、问题识别、机械修复、项目适配和样例沉淀”拆成可验证、可组合的工程能力。脚本、规则和 MCP 先完成确定性工作，AI 只处理业务语义与人工决策，从而减少重复读源码、上下文 token 和误修改。

[![npm version](https://img.shields.io/npm/v/@agile-team/wl-skills-ui.svg)](https://www.npmjs.com/package/@agile-team/wl-skills-ui)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green.svg)]()

## 你能获得什么

| 目标 | 包提供的能力 | 带来的效果 |
| --- | --- | --- |
| 统一新项目视觉 | Design Tokens、Element Plus 原子样式、页面 Layout、Runtime Preset | 颜色、尺寸、间距、圆角、表格和业务状态从同一事实源产生 |
| 低成本治理老项目 | Skin 模式、Base*/jh-*/C_*/AG Grid 兼容层、定制页豁免 | 不改封装源码也能统一大部分视觉，避免一次性重构风险 |
| 阻止 UI 回归 | 40 条 R-rule、接入检查、漂移基线、Git 增量扫描、CI 门禁 | 表头/内容不共轴、按钮无图标、日期弹层全屏、密集表单失衡等问题在提交前暴露 |
| 安全机械修复 | Profile、only/skip、dry-run 计划哈希、快照、复检与回滚 | 自动化只处理可证明安全且已批准的动作，不让 AI 猜测批改 |
| 降低 AI token | summary、compact-v2 分页、changed-only、Skill 路由、18 个 MCP Tool | AI 先读总览和结构化事实，只在必要时获取有界明细或局部源码 |
| 沉淀领域样例 | `ui-contract` extract / validate / match | 页面转为脱敏语义 JSON，不复制整页代码、接口、字段值或原始文案 |
| 兼容多代项目 | EP 2.2+jh-ui 与原生 EP 2.7+ DOM 契约、Vite/doctor 检查 | 支持声明有 fixture 和真实浏览器证据，不靠文档口头约定 |
| 降低运行时开销 | Shared Observer Hub、可选 guard、幂等安装与完整卸载 | 全部 guard 共用 1 个 MutationObserver + 1 个 ResizeObserver |

适合多项目 Vue 3 企业后台、存量系统视觉治理、AI 辅助开发和领域页面模式沉淀。运行时最低要求：Node.js 22、Vue 3.2、Element Plus 2.2。


每次任务先运行 `wl-ui task "任务" --target <path>`，按选定技能执行工具，最后用 `wl-ui status --run-id <id>` 查看实际执行与验证状态；安装或匹配不会自动变成检查通过。详见[任务判定与真实检查回执](docs/task-observability.md)。

## 快速开始

### 1. 安装

```bash
pnpm add @agile-team/wl-skills-ui
# npm i @agile-team/wl-skills-ui
```

### 2. 选择能力 Profile

Profile 同时决定 vendor adapter、扫描规则、样式入口和 runtime guard。AG Grid 是可选 adapter，不再由 `BaseTable` 隐式推断。

| Profile | 样式入口 | Runtime 入口 | AG Grid |
| --- | --- | --- | --- |
| `native-element` | `styles/presets/native-element` | `runtime/profiles/native-element` | 关闭 |
| `legacy-jh-element` | `styles/presets/legacy-jh-element` | `runtime/profiles/legacy-jh-element` | 关闭 |
| `legacy-jh-ag` | `styles/presets/legacy-jh-ag` | `runtime/profiles/legacy-jh-ag` | 开启 |
| `native-jh-ag` | `styles/presets/full`（等价包根 `styles` 全量入口） | `runtime/profiles/native-jh-ag`（`runtime/auto` 同集别名） | 开启 |

> **兼容承诺（1.13 起）**：只有显式声明（`--profile` / `.wl-ui-profile.json` / 安装清单）的 profile 才驱动严格校验；依赖自动识别仅用于 Skill 过滤与建议。未声明 profile 的项目按 1.11 兼容口径校验（全量 `styles` 入口 + 任意 runtime 引用即通过），升级不会把存量绿灯判红。

Native 项目：

```scss
// src/assets/styles/index.scss
@use "@agile-team/wl-skills-ui/styles/presets/native-element" as *;
```

```ts
// src/main.ts
import "@agile-team/wl-skills-ui/runtime/profiles/native-element";
```

不使用 AG Grid 的老项目：

```scss
@use "@agile-team/wl-skills-ui/styles/presets/legacy-jh-element" as *;
```

```ts
import "@agile-team/wl-skills-ui/runtime/profiles/legacy-jh-element";
```

如需最早稳定 CSS 变量，可在 `index.html` 的 `<head>` 先加载：

```html
<link
  rel="stylesheet"
  href="/node_modules/@agile-team/wl-skills-ui/design/tokens/base.css"
/>
```

### 3. 安装 AI Skill 并验证

```bash
npx wl-ui init --project . --profile native-element
npx wl-ui check --project .
npx wl-ui scan --target src --output summary
```

老项目选择 `legacy-jh-element` 或 `legacy-jh-ag`；平台子应用（native 运行时 + jh/Base 封装 + 联邦 AG Grid）选择 `native-jh-ag`。`init` 仅在显式 `--profile` 时写入 `.wl-ui-profile.json`，自动识别只打印建议；单文件编辑器只维护带边界标记的轻量 Skill 路由块，不覆盖项目自有 `AGENTS.md / CLAUDE.md / .clinerules` 内容。`update`、`diff`、`doctor` 和 `clean --dry-run` 负责后续生命周期。

CLI、安装器和 MCP 无需安装其他 wl-skills 包或统一客户端即可使用，机读边界见 [`bin/capabilities.json`](bin/capabilities.json)。共享入口只维护 `<!-- wl-skills-ui:begin -->` / `<!-- wl-skills-ui:end -->`；`.clinerules` 为目录时改写独有的 `.clinerules/wl-skills-ui.md`。manifest 证明归属的旧整文件路由会迁移成轻量区块。

编辑器规则、支撑文件和本包托管区块在安装、更新、清理时均检查已安装哈希；本地修改会保留，`--force` 不抢占外来文件或同名 MCP 项。MCP 使用包内 JSONC helper，保留其他服务器和注释，键的值或原始文本改变均视为本地修改。预存相同文件与入口配置只引用、不取得清理权限。

`init` 新插入的 HTML tokens link 使用独立边界标记并登记贡献，`clean` 只移除未修改的本包链接，保留项目其他 HTML。历史未标记的链接缺少归属证据，升级时仍作为项目配置保留；SCSS 与 runtime 接入只给出建议，不自动修改或认领项目已有 import。

## 公开集成协议 v1

供 harness、客户端或其他编排层以统一 JSON 入口调用本包判定与状态能力（业务执行仍走本包 CLI/MCP，不因协议新增兄弟包依赖）。

```bash
wl-ui protocol describe --json                      # 能力目录、五操作映射、请求/响应 Schema、错误码
wl-ui protocol request --input-file request.json --json
```

- 操作：`route` / `explain`（只读判定）、`task`（判定并持久化计划，尚未执行）、`status`（回查本包执行回执）、`doctor-host`（宿主入口静态诊断）。
- 请求字段：`protocolVersion`(1)、`operation`、`requestId`、`runId`、`projectRoot`、`task`、`targets`、`skill`、`host`+ `profile`。
- 统一信封：`{ ok, result | error, diagnostics }`；机器结果与诊断分离；非法输入在触达执行器前判 `invalid-input`，不写入任何记录。
- 错误码：`unsupported-protocol` / `unknown-operation` / `missing-input` / `invalid-input` / `internal-error`；请求失败（exit 2）时 stdout 仍为可解析 JSON 信封。
- **`ok=true` 只表示协议调用成功，不代表业务验证通过**；业务状态以 `result` 内 `validationStatus` / `executionStatus` 为准（仅计划时为 `unverified` / `not-executed`）。
- 副作用：仅 `task` 写入本包自己的 runs 目录（见 describe 中各操作 `sideEffects`）；其余操作只读。
- 协议实现为本包内置的同源快照 `integration-protocol.cjs`，五包一致；跨包一致性由 conformance `integration-protocol.check.cjs` 验收。

## 能力地图

| 层级 | 能力 | 典型内容 | 是否需要业务源码 |
| --- | --- | --- | --- |
| L0 | Design Tokens | 品牌色、功能色、字号、间距、圆角、阴影 | 否 |
| L1 | Element Plus | Button、Form、Table、Picker、Dialog、Pagination 等 | 否 |
| L2 | Vendor Skin | Base*、jh-*、C_*/c-*、AG Grid、custom wrappers | 否 |
| L3 | Page Layout | list-page、tree-list、form-dialog、detail-page | 是 |
| L4 | Runtime | defineColumns、renderOps、自动状态 Tag、Preset、Guard | 是 |

Vendor 覆盖顺序是：`Base* > jh-* > C_*/c_* > AG Grid > custom wrappers`。越靠前越接近项目事实源，通用兜底不得覆盖已识别的专用结构。

旧 `native/skin` 参数仍作为兼容别名；新接入应使用 Profile：

| Profile | 层级 | 适用场景 | 边界 |
| --- | --- | --- | --- |
| `native-element` | L0/L1/L3/L4 | 新项目、可渐进重构项目 | 不加载 legacy vendor 与 AG Grid |
| `legacy-jh-element` | L0-L2 | Base/jh/C 老项目，Element 表格 | 编译产物不含 `.ag-*` 选择器，不启动 AG observer |
| `legacy-jh-ag` | L0-L2 | 明确使用 AG Grid 的老项目 | 启用 AG 样式、R021、分屏和空态 guard |
| `native-jh-ag` | L0-L4 | 平台子应用终态：native 运行时叠 jh/Base 封装，AG 经联邦或 npm | full 样式全集 + Base/AG 规则（R003/R021）+ 分屏与空态 guard |

## 分别使用各项能力

### 样式与 Design Tokens

按控制范围选择一个入口，不要重复导入：

```scss
@use "@agile-team/wl-skills-ui/styles" as *; // 完整 L0-L3
@use "@agile-team/wl-skills-ui/styles/presets/native-element" as *; // 无 legacy/AG
@use "@agile-team/wl-skills-ui/styles/presets/legacy-jh-element" as *; // legacy，无 AG
@use "@agile-team/wl-skills-ui/styles/presets/legacy-jh-ag" as *; // legacy + AG
@use "@agile-team/wl-skills-ui/styles/presets/skin" as *; // 老项目 L0-L2
@use "@agile-team/wl-skills-ui/styles/presets/element-only" as *; // L0-L1
@use "@agile-team/wl-skills-ui/styles/presets/tokens-only" as *; // 仅 L0
```

定制登录页、大屏或设计器可使用显式边界退出强覆盖：

```html
<section class="wl-ui-skin-exempt">...</section>
<!-- 或 -->
<section data-wl-ui-skin="off">...</section>
```

### Table、Form、Picker 与 Button 的默认契约

- Element Table 与 AG Grid 的表头、分组表头、普通 cell、renderer 使用同一中心轴；显式 `left/right` 仍优先。
- `defineColumns()` 默认补齐叶子列和表头居中，并合并业务已有 `cellStyle/cellClass/headerClass`；传 `defaultAlign: null` 可退出。
- 普通按钮默认要求 `size="small"` 且带语义图标；已声明动态尺寸、link/text 或操作列图标按钮不会被误改。
- 表单输入、Select、Date/Time Picker 默认 small，日期时间输入根使用 `style="width:100%"`。
- 长标签布局按实际文本、字体和容器宽度确定：R008 对 `el-form`、`BaseForm`、`BaseQuery` 的静态 `labelWidth` / `label-width` 小于 150px 给出人工复核提示；150px 不是统一修复值。加宽标签时同步保证输入区至少 160px，必要时减少列数；不全局取消 jh/Base 标签省略。详见[表单规范](standards/ui/03-form.md)。
- 密集多列表单若静态标签宽度或动态绑定中的字面量兜底值达到 240px，R044 提醒人工核对左右留白与输入区宽度；仅在本表单调整标签预算和对称边距。自定义文本步进输入用单外壳边框与控件高度/步进区宽度 token，R040 可审查未登记的 `stepper` 复合结构。两类问题均不做危险的全局自动改写。详见[表单规范](standards/ui/03-form.md)。
- 原生 `el-date-picker` / `el-time-picker` 的面板通过 Teleport 渲染，面板同样带 `.el-date-picker` 类。包内 `_picker.scss`、R042 与浏览器契约共同阻止裸几何样式把弹层放大为全屏；输入宽度只作用于 `.el-date-editor` 或组件 style，弹层规则必须从 `.el-picker__popper` 限定。

```ts
import { defineColumns, renderOps } from "@agile-team/wl-skills-ui/runtime";

const columns = defineColumns([
  { field: "name", headerName: "名称" },
  {
    field: "operations",
    headerName: "操作",
    defaultSlot: ({ row }) =>
      renderOps([
        { type: "view", onClick: () => view(row.id) },
        { type: "edit", onClick: () => edit(row.id) },
      ]),
  },
]);
```

### Runtime Guard 与共享观察器

`installUiRuntimeGuards()` 与旧 `runtime/auto` 为兼容入口，仍开启全部保护；新项目应使用显式 Profile。`installCommonPreset()` 默认使用 `native-element`，不会启动 AG Grid observer：

```ts
import {
  getObserverHubStats,
  installUiRuntimeGuards,
  installUiRuntimeProfile,
  uninstallUiRuntimeGuards,
} from "@agile-team/wl-skills-ui/runtime";

installUiRuntimeProfile("native-element");
console.log(getObserverHubStats(document));

// 微前端或轻量页面可只启用需要的保护
installUiRuntimeGuards({
  themeLock: true,
  overflowTooltip: true,
  splitGridResize: false,
  agGridEmptyState: false,
});

// 应用卸载时完整清理监听、订阅、target 和结构标记
uninstallUiRuntimeGuards();
```

Observer Hub 按 Document/Window 隔离：全部 guard 开启时仍只有一个 MutationObserver 和一个 ResizeObserver。仓库基准命令 `npm run benchmark:runtime` 会验证 500 批 DOM 变更、实例复用和卸载清零；相对旧结构，观察器实例数分别减少 66.7% 和 50%。

### Scanner：精确、增量、低 token

```bash
# 人工阅读
npx wl-ui scan --target src --output markdown --outFile report.md

# AI/MCP 默认先取总览，不包含逐条问题
npx wl-ui scan --target src --output summary

# 按需取有界明细：规则公共字段只出现一次，可用 nextCursor 翻页
npx wl-ui scan --target src --output compact-v2 --limit 50 --cursor 0

# PR 只扫 Git 变更；范围失败默认终止，避免意外全量输出
npx wl-ui scan --target src --changed --base origin/main --output summary
# 只有明确接受全量时才加：--changed-fallback full

# 只看指定层、vendor 或规则
npx wl-ui scan --target src --mode skin --layer L0,L1,L2
npx wl-ui scan --target src --vendor "jh-*,AG Grid"
npx wl-ui scan --target src --only R001,R005,R041,R042
npx wl-ui scan --target src --skip R031-R037
npx wl-ui rules describe R043
```

SFC 解析器有三种模式：

| 参数 | 行为 | 适用 |
| --- | --- | --- |
| `--parser auto` | 默认；优先目标项目自己的 `@vue/compiler-sfc`，缺失时回退 fast 并报告 | 日常扫描与 MCP |
| `--parser fast` | 零依赖；支持嵌套 slot template、多个 style/script | 极简 CI、超大范围预扫 |
| `--parser sfc` | 强制精确编译器；缺依赖或语法错误直接失败 | 严格 CI、复杂 SFC |

使用目标项目本地 compiler 可以与该项目 Vue 版本保持一致，避免工具包强绑另一版编译器。报告中的 `parsing.requested / used / warnings` 会显示实际路径，不会静默降级。

### Fix、快照与漂移

```bash
# 一定先预览
npx wl-ui fix --target src --profile native-element --only R001,R006,R043 --dry-run --output json

# 使用预览返回的 planHash 执行同一计划；默认先创建 .wl-snapshot
npx wl-ui fix --target src --profile native-element --only R001,R006,R043 --plan-hash <hash>

# 复检与回滚
npx wl-ui scan --target src --fail-on-error
npx wl-ui snapshot list
npx wl-ui snapshot diff --id <id>
npx wl-ui snapshot rollback --id <id>

# PR 漂移门禁
npx wl-ui audit --target src --output json --refresh-baseline
npx wl-ui drift --baseline .wl-baseline.json --current current.json --fail-on-error
```

Fixer 只处理规则目录中声明 `autoFixable` 且已实现的机械变换，并让 `profile / only / skip` 同时约束预览、写入和复检。静态已知按钮文案由 R043 的确定映射修复；动态或未知语义仍归 R005 人工确认。计划哈希不一致时拒绝写入。

### AI Skill

包内含 22 个 Skill 和 4 条组合 Flow，覆盖 Element、vendor、layout、runtime 与 scan/fix/migrate 操作。安装后可直接描述：

```text
用 wl-ui 的 legacy-skin-align 流程统一这个老项目，只处理 L0-L2。
扫描当前 PR 的 UI 变更，先给 summary，不修改代码。
检查这个列表页的表格中心轴、small 图标按钮和日期弹层边界。
把这个成熟页面提取为 produce 领域的脱敏 ui-contract，并匹配已有模板。
```

生命周期命令：

```bash
npx wl-ui init --project . --editor all --profile native-element
npx wl-ui update --project . --force
npx wl-ui diff --project .
npx wl-ui doctor --project . --print-overrides
npx wl-ui clean --project . --dry-run
npx wl-ui prompts
```

支持 GitHub Copilot、Cursor、Windsurf、Kiro、Trae、Claude Code、Cline、Agents、Qoder 等目录格式。

### MCP：让 AI 调用确定性能力

stdio 入口：

```bash
wl-ui-mcp
```

通用 MCP 配置示例：

```json
{
  "mcpServers": {
    "wl-skills-ui": {
      "command": "wl-ui-mcp",
      "env": { "WL_PROJECT_ROOT": "/absolute/path/to/project" }
    }
  }
}
```

13 个 Tool：

| Tool | 作用 | 是否写入 |
| --- | --- | --- |
| `wl_ui_check` | 检查 tokens/styles/runtime 接入 | 否 |
| `wl_ui_scan` | compact/json/markdown 扫描，支持 changed 与 parser | 否 |
| `wl_ui_fix_dry_run` | 预览确定性修复 | 否 |
| `wl_ui_skill_prompt` | 输出 Skill 触发建议 | 否 |
| `wl_ui_route_intent` | 将自然语言路由到 flow/skill/tool | 否 |
| `wl_ui_detect_skin` | 检查 jh-ui/Element Plus 配对与 overrides | 否 |
| `wl_ui_list_rules` | 从 `standards/rules.json` 列出规则摘要 | 否 |
| `wl_ui_describe_rule` | 返回单条规则定义 | 否 |
| `wl_ui_drift` | 比较基线与当前扫描结果 | 否 |
| `wl_ui_recommend_flow` | 根据 compact 结果给出下一步 | 否 |
| `wl_ui_contract_extract` | 从 Vue 文件提取脱敏 UI 契约 | 否 |
| `wl_ui_contract_validate` | 校验 schema、fingerprint 与脱敏边界 | 否 |
| `wl_ui_contract_match` | 匹配项目内领域契约库，只返回摘要 | 否 |

真正写业务文件仍由 CLI `wl-ui fix` 执行，并保留快照；MCP 不提供绕过确认的写入工具。

## 领域 ui-contract：用 JSON 沉淀页面样例

`wl-ui-contract.v1` 保存页面“是什么、有哪些区域、用了哪些组件能力、动作遵守什么约束”，不保存页面代码。

```bash
# 默认只预览 JSON，不写文件
wl-ui contract extract \
  --path src/views/produce/order/list.vue \
  --domain produce --scenario query-table --mode native

# 明确确认后才写入项目私有模板库
wl-ui contract extract \
  --path src/views/produce/order/list.vue \
  --domain produce --scenario query-table \
  --output-file .wl-ui/contracts/produce/order-list.json --confirm

wl-ui contract validate \
  --input .wl-ui/contracts/produce/order-list.json

wl-ui contract match \
  --input .wl-ui/contracts/produce/order-list.json \
  --library .wl-ui/contracts --limit 5
```

契约主要包含：

- `domain / scenario / mode / visibility`；
- layout kind 与 query、toolbar、table、pagination 等区域；
- 组件 family、通用 implementation、数量与能力；
- create/search/edit 等动作语义、位置、small/icon 状态；
- required/observed R-rule、使用到的公开 token、约束；
- 来源内容 hash 与排除来源元数据后的语义 fingerprint。

明确不包含：

- Vue/JS/SCSS 源码与模板片段；
- 真实 API、URL、请求响应与权限值；
- 业务字段、字段值、客户数据；
- 按钮原始文案或任意可还原业务逻辑的正文。

模板建议分层：

| 层级 | 用途 | 建议位置 |
| --- | --- | --- |
| Project-private | 客户/项目特有页面模式，默认层 | 业务仓库 `.wl-ui/contracts/` |
| Domain-private | 生产、销售、主数据等领域模式 | 受控领域仓库或私有包 |
| Shared-reviewed | 跨项目稳定通用模式 | 完成脱敏审计后进入公共模板库 |

Schema 见 [`standards/ui-contract.schema.json`](standards/ui-contract.schema.json)，完整说明见 [`docs/ui-contract.md`](docs/ui-contract.md)，示例见 [`examples/ui-contract.example.json`](examples/ui-contract.example.json)。

## 推荐组合工作流

### 新项目从零接入

```text
wl-ui init --profile native-element
→ 导入 native-element styles/runtime
→ defineColumns + renderOps
→ wl-ui check
→ wl-ui scan --parser sfc
→ CI fail-on-error
```

### 老项目低风险化妆

```text
wl_ui_detect_skin / wl-ui doctor
→ wl-ui init --profile legacy-jh-element（或 legacy-jh-ag）
→ 导入对应 profile styles/runtime
→ scan --profile <id> --output summary
→ fix --dry-run
→ 用户确认后 fix
→ 浏览器契约复查 Picker、Table、AG Grid
```

### PR 级低 token 治理

```text
wl_ui_route_intent
→ wl_ui_scan(changedOnly=true, output=summary, parser=auto)
→ wl_ui_recommend_flow
→ wl_ui_scan(output=compact-v2, limit=50) 获取有界明细
→ AI 只读取命中的局部文件与 Skill
→ wl_ui_fix_dry_run
→ 用户确认后 CLI 修复与复扫
```

`summary` 不携带逐条描述；`compact-v2` 把 severity/category/suggestion 收进一次性的 `ruleCatalog`，并用 cursor/limit 控制明细上限。单文件编辑器的安装产物也从全量 Skill 拼接改成按需路由。三者共同避免 AI 默认读取整份报告、整套 Skill 或整项目源码。

### 成熟页面沉淀与复用

```text
选定已上线成熟页面
→ contract extract（只预览）
→ validate（schema + 脱敏 + fingerprint）
→ 人工确认 domain/scenario/visibility
→ --confirm 写入 project-private 库
→ match 找最接近模式
→ AI 只读取选中的契约或局部源码
```

## 兼容边界与证据

| Profile | 版本组合 | 核心 DOM 假设 | 证据 |
| --- | --- | --- | --- |
| jh Skin | `element-plus@2.2.6-prod.3` + `@jhlc/jh-ui@3.1.0` | `.el-input > .el-input__inner` 旧结构 | legacy fixture、结构契约、SCSS 测试 |
| Native | Element Plus 2.7+ | `.el-input__wrapper`、Teleport Picker panel | fixture、结构契约、Chrome/Edge 计算样式测试 |

`skills/_meta/_compat/vendors.json` 是结构化事实源，`npm run check:compat` 会验证每个 profile 的 peer 声明、fixture、结构契约和浏览器证据都存在。消费项目可用三种方式检查：

```ts
// vite.config.ts
import { wlSkillsCheck } from "@agile-team/wl-skills-ui/vite";

export default { plugins: [wlSkillsCheck({ enforce: "warn" })] };
```

```bash
npx wl-ui check --project .
npx wl-ui doctor --project . --print-overrides
```

完整矩阵见 [`docs/compat-matrix.md`](docs/compat-matrix.md)。不要在未升级 jh-ui 的情况下单独把集团 EP 2.2 组合升级到社区新版；DOM 假设不同，尤其会影响 input wrapper、表单状态和复合控件。

本轮的分类模型、门禁、token 预算与 AG Grid 替换路径见 [`docs/optimization-plan-1.12.md`](docs/optimization-plan-1.12.md)，长期分层边界见 [`standards/architecture/01-layer-boundaries.md`](standards/architecture/01-layer-boundaries.md)。

## CLI 速查

| 命令 | 用途 |
| --- | --- |
| `wl-ui init/update/diff/clean` | Skill、配置和 manifest 生命周期 |
| `wl-ui doctor/prompts` | 项目体检、适配建议与 AI 触发语 |
| `wl-ui check` | 接入完整性和 vendor 配对 |
| `wl-ui scan/audit/all` | 风格扫描、基线审计、接入+扫描组合 |
| `wl-ui fix` | dry-run、快照、确定性修复和复检 |
| `wl-ui snapshot` | list/diff/rollback/clean |
| `wl-ui drift` | 基线与当前问题漂移 |
| `wl-ui exempt init` | 生成定制页豁免候选，需人工审核 |
| `wl-ui contract` | extract/validate/match 脱敏 UI 契约 |
| `wl-ui rules list/describe` | 查询规则事实源，不读取整份规则文档 |
| `wl-ui profiles` | 列出 adapter/style/runtime 组合 |
| `wl-ui add-preset/add-vendor` | 在消费项目脚手架扩展文件 |
| `wl-ui-mcp` | 启动 stdio MCP Server |

完整参数以 `npx wl-ui --help` 为准。旧入口 `wl-scan` 仍保留兼容。

## 安全与治理边界

- `scan/check/audit/drift/contract validate/match` 只读。
- `contract extract` 默认只向 stdout 输出；写文件必须 `--output-file ... --confirm`。
- `fix` 应先 dry-run，实际执行前创建快照，执行后自动复检。
- MCP 只提供只读扫描、dry-run 和契约预览，不提供真实写入捷径。
- `.wl-exempt.json` 只用于明确的登录页、大屏、设计器等边界，不应成为隐藏普通页面问题的白名单。
- `ui-contract` 默认 `project-private`；进入领域库或公共包前必须进行脱敏审计和人工评审。
- 包不会保存 npm token、业务凭据或后端连接信息，也不需要读取项目 `.env` 才能完成 UI 扫描。

## 与 wl-skills-kit 的职责边界

| 包 | 负责 | 不负责 |
| --- | --- | --- |
| `wl-skills-ui` | 视觉绝对管控、组件/布局样式、UI Runtime、R-rule、浏览器契约、UI 语义模板 | 菜单/字典/权限同步、业务 API 契约、整页业务代码生成 |
| `wl-skills-kit` | 项目理解、原型/详设、API 契约、页面生成、AST 校验、菜单字典权限与 Page Blueprint | 取代 UI 包的视觉事实源和多代组件皮肤 |

推荐顺序：先由 `wl-skills-ui` 识别项目皮肤、版本和视觉偏差；涉及 BaseTable 结构、页面生成、API 或后台配置时，再桥接 `wl-skills-kit validate-page / doctor-ui`。两包的 JSON 模板互补：UI contract 关注视觉与组件能力，Kit Blueprint 关注页面业务结构和交付契约。

## 版本与进一步阅读

当前 v1.16.0：公开集成协议 describe/request 统一信封（能力清单与路由语料经真实打包产物验证）、输入校验收口与 MCP 目录对齐真实 tools/list。v1.15.0：任务判定、真实执行/验证回执、实际检查范围和过期检测；Codex 原生薄入口按需加载 canonical Skill。确定性路由覆盖已发布目录与显式缺口，不保证识别所有自然语言。v1.14.0：明确独立能力边界，安装、更新、清理按本包贡献保护用户及其他包内容；共享文件采用单文件原子替换，支持历史路由与 `.clinerules` 目录迁移。v1.13.2：R044 审查多列表单超宽标签，R040 识别自定义 `stepper`，均供人工复核。v1.13.0：新增 `native-jh-ag` Profile、显式 Profile 兼容承诺与联邦 AG 依赖识别。

- [版本摘要](docs/version-history.md)
- [完整 Changelog](CHANGELOG.md)
- [ui-contract 设计与安全边界](docs/ui-contract.md)
- [依赖兼容矩阵](docs/compat-matrix.md)
- [复合组件结构契约](standards/component-structures.json)
- [R-rule 单一事实源](standards/rules.json)
- [MCP 接入](mcp/README.md)
- [根 Skill](SKILL.md)

仓库维护门禁：

```bash
npm run verify
npm run benchmark:runtime
npm run test:visual
npm run test:visual:contracts
npm run pack:dry
```

视觉测试基线按操作系统管理；如果本机没有对应平台截图，完整 `test:visual` 会明确报告缺失，不应自动生成并提交一套未经评审的新基线。发布门禁使用跨浏览器计算样式契约 `test:visual:contracts`；真实浏览器兼容契约也可以单独执行 `browser-compat.spec.ts`。
