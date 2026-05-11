---
description: |
  审计 Skill — 对项目做只读的全量 UI 规范合规审计，输出分层问题报告（不自动修改任何文件）。
  支持 --layer / --vendor / --mode 精准过滤，生成 markdown 报告供人工或 AI 渐进修复。
applyTo: "**"
---

# ops/audit SKILL

## 一、审计目标

对目标项目做**完整只读扫描**，产出：

1. 接入完整性报告（I001-I005：tokens/styles/runtime/skills 是否接入）
2. 风格合规报告（R001-R018：按 layer/vendor 分组）
3. 优先级建议（高危 → 中危 → 低危 三层）

**本 skill 不修改任何文件，仅审计和报告。**

---

## 二、审计命令

### 全量审计（推荐）

```bash
npx wl-ui all --project . --outFile audit-report.md
```

### 分层审计

```bash
# 仅看 L0 颜色 token 违规
npx wl-ui scan --target src --layer L0 --outFile l0-report.md

# 仅看 L1 Element Plus 控件问题
npx wl-ui scan --target src --layer L1 --outFile l1-report.md

# 仅看 L2 封装组件问题（vendor 层）
npx wl-ui scan --target src --layer L2 --outFile l2-report.md

# 化妆模式项目只看 L0/L1/L2（跳过 L3/L4）
npx wl-ui scan --target src --mode skin --outFile skin-audit.md
```

### 精准 vendor 审计

```bash
# 仅扫描 BaseTable 相关规则
npx wl-ui scan --target src --vendor base-table

# 仅扫描 Element Plus 原生控件
npx wl-ui scan --target src --vendor element
```

---

## 三、AI 审计流程

在 AI 编辑器中触发：

```
用 wl-ui 的 ops/audit skill 对当前项目做全量审计
```

**AI 执行步骤：**

1. `npx wl-ui check --project .` → 接入完整性（I001-I005）
2. `npx wl-ui scan --target src --output json --outFile /tmp/audit.json` → JSON 格式结果
3. 读取 JSON，按如下格式汇报：

```markdown
## 审计摘要
- 扫描文件数：XX
- 发现问题数：XX（高危 X / 中危 X / 低危 X）
- 接入完整性：✅ X 项通过 / ❌ X 项缺失

### 高危（直接影响视觉一致性）
| 规则 | 文件 | 行号 | 说明 |
| R001 | src/pages/Foo.vue | 45 | 列缺少 align="center" |
...

### 修复建议（优先级排序）
1. 运行 `npx wl-ui fix --target src --dry-run` 先预览 A 类自动修复
2. 对 R009/R010 状态字段手工确认并应用 renderTagNode
3. 对 L0 颜色违规批量替换为 CSS Token
```

4. 询问用户：是否进入修复阶段（`ops/fix` skill），还是只看报告？

---

## 四、接入完整性检查项（I001-I005）

| 编号 | 检查项 | 说明 |
|---|---|---|
| I001 | tokens.css / base.css 已引入 | index.html `<head>` 中有 wl-skills-ui tokens |
| I002 | styles 预设已引入 | SCSS 入口含 `@use '@agile-team/wl-skills-ui/styles...'` |
| I003 | runtime preset 已安装 | main.ts 含 `installCommonPreset()` |
| I004 | skills 已安装 | `.github/instructions/` 或 `.cursor/rules/` 等目录存在 wk-skills 文件 |
| I005 | package.json 版本 | @agile-team/wl-skills-ui 版本 ≥ 0.3.0 |

---

## 关联资源

- 修复：[ops/fix](../fix/SKILL.md)
- 渐进迁移：[runtime/migration](../../runtime/migration/SKILL.md)
- 全审计流程：[_flows/full-audit]( ../../_flows/full-audit.md)
