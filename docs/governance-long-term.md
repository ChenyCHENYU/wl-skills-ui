# 长效治理：业务项目如何避免遗留与漂移污染

> 适用：使用 `@agile-team/wl-skills-ui` 的业务项目，长期迭代过程中**不让历史违规无限累积**、**不让新代码反向污染**、**不让升级回归打穿主干**。
> 事实源：本文档结合 `standards/rules.json` 单一事实源 + `scanner/snapshot.mjs` + `scanner/exempt.mjs` 共同提供。

## 一、问题画像

业务项目随时间会出现三种"污染"：

| 类型 | 表现 | 根因 |
| --- | --- | --- |
| **历史遗留**（legacy） | 旧页面违规但没人修，scanner 报错被忽略 | 一次性扫描门槛太高，团队选择 mute |
| **风格漂移**（drift） | 同一种场景不同写法，hex 颜色又冒出来 | 没有 PR 级别的增量校验 |
| **升级回归**（regression） | wl-skills-ui 升版后老页面视觉错乱 | vendor 版本配对没钉死、scoped 样式覆盖底层 |

下面三条机制对应三个根因。

---

## 二、机制 1 · 基线快照（Baseline）

**目标**：把"历史欠债"冻结，新代码只对增量负责。

```bash
# 在主干分支建立基线（团队第一次接入时执行一次）
npx wl-ui audit --target src --output json --outFile .wl-baseline.json
git add .wl-baseline.json && git commit -m "chore: wl-ui baseline snapshot"
```

`.wl-baseline.json` 记录当前所有违规条目的 `(file, line, ruleId)` 指纹。后续：

```bash
# PR 检查（仅报新增违规）
npx wl-ui scan --target src --baseline .wl-baseline.json --fail-on=new-issues
```

- **历史条目不再阻塞构建**（团队按计划逐步消化）
- **新代码引入新违规 → 立即红灯**
- 团队修复历史条目后跑 `npx wl-ui audit --refresh-baseline` 收敛基线

> 实现入口：`scanner/snapshot.mjs` 已具备文件级快照能力，issue 级 baseline 在 v1.8.0 起以 `audit --output json` 输出为契约，业务项目可自行 diff。

---

## 三、机制 2 · 豁免与隔离（Quarantine）

**目标**：大屏、地图、流程设计器等强个性化页面 + 不再迭代的旧模块，明确隔离，**不参与统一风格扫描**。

`.wl-exempt.json`：

```json
{
  "exemptPaths": [
    "src/views/**/big-screen/**",
    "src/views/**/dashboard/**",
    "src/views/legacy/**"
  ],
  "exemptRules": {
    "R016": ["src/views/**/chart/**"]
  },
  "exemptCategories": ["dashboard", "big-screen", "report-designer"],
  "description": "大屏与遗留模块豁免风格统一扫描；新功能不得新增豁免路径"
}
```

约束（团队规约）：

1. 豁免清单**只能减少**，不能增加（新增需架构组评审 PR）
2. 豁免路径**禁止承载新业务**；新业务必须落到非豁免目录
3. 每季度团队负责人审视豁免清单：能解开就解开

> 实现入口：`scanner/exempt.mjs::loadExemptConfig` 已支持 glob + 规则级豁免；CLI/MCP/Vite 插件统一读取。

---

## 四、机制 3 · 漂移看板（Drift Dashboard）

**目标**：让"逐渐变烂"可见，每次升级都能量化。

```bash
# 方式一：scan 一步到位（v1.8.2+）
npx wl-ui scan --target src --baseline .wl-baseline.json --fail-on-error

# 方式二：独立 drift 子命令
npx wl-ui scan --target src --output json --outFile .wl-current.json
npx wl-ui drift --baseline .wl-baseline.json --current .wl-current.json
```

输出示例：

```
╭──────────────────────────────────────╮
│        wl-skills-ui 漂移报告         │
╰──────────────────────────────────────╯

基线违规: 120  →  当前违规: 87  (-33)

  🔴 gained   +3  新增违规
  🟢 fixed    -36  消化历史

新增 Top 规则:
  R017  +2
  R001  +1

消化 Top 规则:
  R009  -15
  R004  -12
  R016  -9
```

> 实现入口：`scanner/drift.mjs` 提供 `drift()` / `driftFromFiles()` / `formatDriftText()` / `formatDriftJson()` 四个 API。MCP 工具 `wl_ui_drift` 可供 AI 直接调用。

---

## 五、机制 4 · 版本钉死（Lock & Detect）

**目标**：vendor（Element Plus / @jhlc/jh-ui）版本飘移导致老页面 DOM 不匹配的问题，**在启动期就发现**，而不是页面坏了才查。

```ts
// vite.config.ts
import { wlSkillsCheck } from '@agile-team/wl-skills-ui/runtime/vite/check.mjs'

export default defineConfig({
  plugins: [
    wlSkillsCheck({
      enforce: 'warn',          // 'warn' | 'error'
      verbose: false,
    }),
  ],
})
```

启动时输出（不匹配示意）：

```
[wl-skills-ui] 版本偏离推荐组合：
  element-plus@2.6.3 ≠ 推荐 2.2.6-prod.3（jh 集群）
  @jhlc/jh-ui@3.1.0 ✓
  修复片段：
    "pnpm": { "overrides": { "element-plus": "2.2.6-prod.3" } }
```

> 推荐组合 = `skills/_meta/_compat/vendors.json`（事实源）。CLI: `npx wl-ui doctor --print-overrides`。MCP: `wl_ui_detect_skin`。

---

## 六、机制 5 · 写作期 AI 守护（Editor Skill）

**目标**：在 AI 写出新代码的那一刻就让它**对齐 rules.json**，而不是事后扫描。

- 编辑器接入：`npx wl-ui init` 会把 `.cursor/rules` / `.windsurf/rules` 等指向 `skills/` 目录
- AI 强约束（写入 SKILL 头部）：
  - 任何样式相关结论必须先通过 MCP `wl_ui_describe_rule` 查 `standards/rules.json`
  - **禁止**在业务 SFC 的 `<style scoped>` 中覆盖 `.el-*` / `.jh-*` 全局选择器；样式补丁全部归 wl-skills-ui 升级
  - 新增组件族适配优先升级到 wl-skills-ui，而不是在业务侧封 `Base*` 二代

效果：AI 写出的代码 day-1 即合规，不再产生历史欠债。

---

## 七、典型业务项目接入清单

```bash
# 1. 安装
pnpm add -D @agile-team/wl-skills-ui

# 2. 编辑器规则 + MCP + 启动期插件
npx wl-ui init --project . --mode skin

# 3. 基线
npx wl-ui audit --target src --outFile .wl-baseline.json --output json
git add .wl-baseline.json

# 4. 豁免（如有）
cp node_modules/@agile-team/wl-skills-ui/.wl-exempt.example.json .wl-exempt.json
# 编辑为本项目实际豁免路径

# 5. CI 加 PR gate
#   npx wl-ui scan --target src --baseline .wl-baseline.json --fail-on=new-issues

# 6. 每季度 / 每次升级
npx wl-ui doctor --print-overrides     # 版本对齐
npx wl-ui audit --refresh-baseline      # 基线收敛
```

---

## 八、wl-skills-ui 自身的承诺

为了让业务项目"敢于"长期跟随：

1. **R-rule 不删只迁**：v1.8.0 起 `tag.mjs` 的旧 R017/R018 → R019/R020，旧 ID 在 `rules.json.aliases` 保留，scanner 输出兼容
2. **CSS Token 不破坏**：`design/tokens/base.css` 的变量名为长期契约，重命名走 deprecate → alias → remove 三段式
3. **vendor 适配可选**：业务项目偏离推荐组合时插件**只警告不阻塞**，由项目方决策升级节奏
4. **每个 minor 版本附带 compat-matrix 更新**：`docs/compat-matrix.md` 是版本与 vendor 的双向契约
5. **`docs:check` 守护文档/规则/scanner 一致性**：包级 CI 不通过则不发版

---

## 九、不做的事

- ❌ 不强行重写业务 SFC 结构（除非走 ops/migrate 显式确认）
- ❌ 不在业务项目里塞自动 commit hook（团队自行选 husky/lefthook）
- ❌ 不收集业务项目数据（所有扫描结果留在本地或 CI artifact）
