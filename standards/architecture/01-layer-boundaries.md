# wl-skills-ui 架构分层与扩展边界

## 核心原则

`wl-skills-ui` 当前服务于既定项目集群，因此默认 tokens、配色、圆角、密度、组件视觉和工程接入方式是固化体系；但这些固化内容必须保持为可替换的独立变量层，不能散落到组件覆盖、vendor 化妆或 AI rules 中形成补丁污染。

任何新增能力都必须遵守：

- 单一事实源：同一类配置只能有一个权威来源。
- 分层隔离：tokens、Element Plus 原子覆盖、项目集群封装覆盖、layouts、runtime、scanner、skills 各自负责自己的边界。
- 向下依赖：上层可以使用下层 token 和规范，下层不能反向依赖上层实现。
- 覆盖有序：后写入和高优先级覆盖必须有明确目录和加载顺序，不能靠零散 `!important` 补丁堆叠。
- 项目集群优先：当前风格先服务当前项目集群；未来多项目集群主题替换应通过 theme/tokens/preset 入口扩展，而不是修改组件规则本身。

## 分层边界

| 层级 | 目录 | 职责 | 不允许做的事 |
| --- | --- | --- | --- |
| L0 Design Tokens | `design/tokens`、`styles/tokens` | 定义颜色、圆角、间距、字号、阴影等基础变量 | 不写具体组件选择器，不绑定业务组件名 |
| L1 Element Plus | `styles/element`、`skills/element` | 统一 Element Plus 原生组件视觉，作为全部封装层的基础视觉规则 | 不把 `Base*`、`jh-*`、`C_*`、AG Grid 的私有选择器混入原子层 |
| L2 Project Vendors | `styles/vendors`、`skills/vendors` | 必须覆盖当前项目集群里的 `Base*`、`jh-*`、`C_*`、自研封装、AG Grid 等封装/组合组件，使其继承同一套风格 | 不重新定义品牌色体系，不脱离 L0/L1 另起一套视觉规则，不覆盖 layout 骨架语义 |
| L3 Layouts | `styles/layouts`、`skills/layouts`、`templates` | 约束列表页、树表页、表单弹窗等页面骨架 | 不改 token，不写 vendor 私有修复 |
| L4 Runtime | `runtime`、`reference` | 提供 `defineColumns`、`renderOps`、preset 等业务渲染能力 | 不直接承担老项目 skin 化妆职责 |
| Automation | `scanner`、`mcp` | 扫描、检查、dry-run 修复和 AI 工具入口 | 不绕过 skills/standards 私自定义新规则语义 |
| AI Rules | `skills`、`standards` | AI 可读规范、流程和修复策略 | 不和代码实现产生第二套事实源 |

## Tokens 与主题替换边界

当前默认主题位于：

```text
design/tokens/base.css
styles/tokens/index.scss
```

这些文件是当前项目集群的默认主题源。组件样式只能引用 token，不应硬编码品牌色、表单圆角、按钮颜色、空状态颜色等可主题化变量。

推荐写法：

```scss
color: var(--el-text-color-secondary, #909399);
border-radius: var(--wk-form-control-radius, 6px);
```

不推荐写法：

```scss
color: #909399;
border-radius: 6px;
```

未来如果不同项目集群需要切换主题，应优先增加新的 token/preset 入口，例如：

```text
design/tokens/<cluster>.css
styles/presets/<cluster>.scss
```

而不是在 `styles/element` 或 `styles/vendors` 中追加按项目名区分的补丁选择器。

## Element Plus 覆盖边界

Element Plus 原生组件覆盖必须保持组件族独立：

```text
styles/element/_button.scss
styles/element/_form.scss
styles/element/_table.scss
styles/element/_feedback.scss
styles/element/_upload.scss
```

每个文件只处理对应组件族或强相关子组件。跨组件一致性通过 token 解决，例如表单圆角统一使用 `--wk-form-control-radius`，不能在 input、select、upload 中分别写不同硬编码。

L1 的“不处理封装私有结构”不是“不覆盖封装组件”，而是要求封装组件进入 L2，由 L2 按当前项目集群真实封装形态做统一风格适配。

## Project Vendors 覆盖边界

Project Vendors 层是当前项目集群的必需覆盖层，不是可选补丁层。它用于承接所有基于 Element Plus 或与 Element Plus 共同组成页面的封装/组合组件，包括：

```text
Base* > jh-* > C_*/c_* > AG Grid > custom wrappers
```

这些组件虽然不是 Element Plus 原生选择器，但在当前项目集群中同样属于统一 UI 风格体系的一部分，必须使用 L0 tokens 和 L1 组件视觉原则进行对齐。

新增 vendor 覆盖时应同时补齐：

1. `styles/vendors/_xxx.scss`
2. `styles/vendors/index.scss` 加载顺序
3. `skills/vendors/xxx/SKILL.md`
4. `skills/_meta/_detection.md`
5. 如需自动检查，补 `scanner/rules/*`

不能只在某个页面局部追加样式补丁。

## AI Rules 单一源原则

AI 编辑器规则由 `skills/**/*.md` 统一生成。不同编辑器只允许通过 `skills/_meta/_compat/editors.json` 和 `headers/*.txt` 做格式转换。

禁止在以下目录手写与 `skills` 不一致的规则语义：

```text
.github/instructions/wk-skills
.cursor/rules
.windsurf/rules
.kiro/steering
.trae/rules
.qoder/rules
CLAUDE.md
.clinerules
AGENTS.md
```

这些目录是安装产物，应由 `wl-ui init/update` 覆盖生成。

## 新增能力检查清单

新增任何 UI 规则或样式覆盖前，先确认：

- 是否能通过 token 解决，而不是新增组件补丁。
- 是否属于 Element Plus 原子层，还是 vendor 封装层。
- 是否需要同步 Skill、Standard、Scanner 和 Template。
- 是否会影响 skin 模式老项目布局。
- 是否会污染未来主题替换能力。
- 是否可以通过 `wl-ui update --editor all --force` 分发给全部 AI 编辑器。
