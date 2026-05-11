# @agile-team/wl-skills-ui — 团队接入指南

> 版本：v1.6.0 · 适用：所有基于 Vue 3 + Element Plus 的业务子应用

---

## 我们现在有什么问题？

各个子系统独自维护样式，导致：

- 同一个按钮，各系统颜色/大小/间距都不一样
- 弹窗、表格、分页、标签——每个系统长一个样
- 模块联邦把各系统挂在同一个平台，视觉割裂感很强
- 改一处要在多个仓库重复改，越改越乱

---

## 这个包解决什么？

**一套 CSS + 一行导入，所有子系统统一视觉。**

核心做三件事：

| 能力 | 说明 |
|------|------|
| **设计令牌** | 统一定义颜色、按钮尺寸、间距、圆角、阴影。改一个变量，全系统生效 |
| **样式化妆层** | 不改业务代码，直接覆盖 Element Plus 原生控件 + 内部封装组件（`Base*` / `jh-*` / `C_*` / `c_*` / AG Grid） |
| **扫描 & 修复** | 自动扫描项目里哪些地方写死了颜色、不合规范，一键 dry-run 预览修复内容，确认后批量修复 |

---

## 两种接入方式，选一种就行

### 方式 A — 化妆模式（推荐老项目，不动业务代码）

适合：**项目已有大量业务代码，不想动**。一行样式导入，立刻对齐视觉。

```bash
pnpm add @agile-team/wl-skills-ui
```

```scss
// src/styles/index.scss（或项目全局样式入口）
@use "@agile-team/wl-skills-ui/styles/presets/skin" as *;
```

完成。刷新页面，按钮、表格、分页、弹窗、标签全部对齐统一风格。

> **可以回退**：把这一行 `@use` 删掉，样式立刻恢复原状，零风险。

---

### 方式 B — 原生模式（推荐新项目 / 可以重构的项目）

适合：**新项目，或者想进一步把业务写法也规范化**。

```scss
// src/styles/index.scss
@use "@agile-team/wl-skills-ui/styles" as *;
```

```ts
// src/main.ts
import { installCommonPreset } from "@agile-team/wl-skills-ui/runtime/common-preset";
installCommonPreset();
```

额外获得：
- 状态字段（启用/禁用/审核/已验证）自动渲染为 Tag，不用手写模板
- 操作列（查看/编辑/删除）按统一规范生成，不用每个页面重复写
- 页面骨架（列表页/左树右表/弹窗表单/详情页）有现成模板

---

## 现在就能看效果吗？

可以，3 分钟验证：

```bash
# 1. 安装
pnpm add @agile-team/wl-skills-ui

# 2. 在全局样式入口加一行
#    @use "@agile-team/wl-skills-ui/styles/presets/skin" as *;

# 3. 启动项目，浏览器看效果
pnpm dev
```

如果效果不对 / 有冲突，删掉那一行即可完全还原。

---

## 想知道项目哪里不符合规范？先扫描

```bash
# 扫描 src 目录，输出报告
npx wl-ui scan --target src --outFile ui-audit.md

# 预览修复内容（不实际写入）
npx wl-ui fix --target src --dry-run

# 确认没问题，执行修复
npx wl-ui fix --target src
```

扫描报告会告诉你：哪些文件写死了颜色、哪些按钮不合尺寸规范、哪些封装组件需要覆盖样式。

---

## 能回退吗？

**完全可以，三个层面都支持回退：**

| 操作 | 回退方式 |
|------|----------|
| 样式导入 | 删除 `@use` 那一行，立即恢复 |
| 扫描修复 | 修复前有 `--dry-run` 预览；git 可随时 `revert` |
| CLI 工具安装 | `npx wl-ui clean --project .` 一键卸载所有注入文件 |

---

## 各系统哪些组件会被统一？

接入后，以下内容会自动对齐视觉（无需任何额外配置）：

**Element Plus 原生控件**
- 按钮颜色、尺寸、间距
- 表格（行高、边框、斑马纹、操作列）
- 表单（Label 宽度、输入框尺寸）
- 弹窗（标题栏、底部按钮位置）
- 分页（对齐方式、按钮样式）
- Tag（颜色语义：成功/警告/危险/信息）
- Card、Tabs、Tree、Drawer、Upload、Steps、Tooltip、Dropdown...

**内部封装组件（有源码没源码都能覆盖）**
- `BaseTable` / `BaseQuery` / `BaseToolbar` / `BaseDialog`
- `jh-tree` / `jh-pagination` / `jh-drag-col`
- `C_*` / `c_*` 前缀组件
- AG Grid 表格主题

---

## 如果用了 AI 编辑器（Copilot / Cursor / Cline 等）

可以一句话触发 AI 自动帮你把整个项目的样式对齐：

```
用 wl-ui 的 legacy-skin-align 流程对当前项目做老项目化妆对齐
```

AI 会按照 6 个阶段依次执行：接入 tokens → 引入 skin preset → 修复各类封装组件样式 → 修复 Element Plus 控件 → 修复硬编码颜色 → 全程不动业务逻辑。

---

## 安装一览

```bash
pnpm add @agile-team/wl-skills-ui
```

要求：Node ≥ 18，Vue ≥ 3.2，Element Plus ≥ 2.2

NPM：[@agile-team/wl-skills-ui](https://www.npmjs.com/package/@agile-team/wl-skills-ui)

---

*有问题找杨晨誉，或直接群里说。*
