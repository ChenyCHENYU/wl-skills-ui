---
description: |
  UI 风格对齐 Skill — 扫描业务系统 Vue SFC 文件，识别与 wl-skills-ui 标准不一致的写法，
  生成整改清单，经用户确认后执行自动修复，最终验证归零。
  覆盖：表格对齐/空状态、按钮图标化、表单控件尺寸、弹窗分页位置、颜色 Token。
applyTo: "**/*.vue"
---

# UI 风格对齐 Skill

## 一、工作流程（严格按顺序，不得跳过）

### Phase 1 — 扫描（只读，不修改任何文件）

```bash
# 推荐：一站式扫描（接入完整性 + 风格 + 报告）
npx wl-ui all --project [项目根目录] --outFile /tmp/scan-result.md

# 单独风格扫描
npx wl-ui scan --target [项目src目录] --outFile /tmp/scan-result.md

# 接入完整性检查
npx wl-ui check --project [项目根目录]
```

读取扫描输出，提取：

- 接入完整性 I001~I004 通过情况
- 总 issue 数、按规则分类统计（R001~R018）
- 每个 issue：文件路径 + 行号 + 规则 + 建议

### Phase 2 — 汇报

向用户展示摘要：

```
扫描结果摘要
- 扫描文件数：XX
- 发现问题数：XX（高危 X / 中危 X / 低危 X）

高危（直接影响视觉一致性）
| 规则 | 说明 | 数量 | 代表文件 |
...
```

### Phase 3 — 确认（强制门槛）

询问用户：

1. 是否全量修复？还是指定规则/文件？
2. 无法自动修复的规则（R008/R009/R010/R013）是否手动处理？

**未经用户确认，禁止修改任何文件。**

### Phase 4 — 修复

按确认范围执行：

- **A 类（attr 缺失 / hex 颜色）** → `npx wl-ui fix --target [src] [--dry-run]`
- **B 类（结构改造，R004/R013/R015）** → AI 逐文件编辑

每修复一个文件，输出该文件修改摘要。

### Phase 5 — 验证

重新执行 Phase 1 扫描，验证 issue 数量归零或达到预期水平。

---

## 二、规则总览（指针式）

**所有 R-rule 的权威定义统一在 `standards/rules.json`**。本节只列分类与编号映射，禁止在此复述规则细节（避免漂移）。AI 需要某条规则的完整定义时，调用 MCP `wl_ui_describe_rule R001` 或读取 `standards/rules.json`。

| 分类 | 编号 | 关联 SKILL |
| --- | --- | --- |
| 表格 / 列定义 | R001 R002 R003 R012 R014 R021 R022 | `element/el-table`, `vendors/base-table` |
| 按钮 / 操作列 | R004 R005 R015 | `element/el-table`, `layouts/list-page`, `layouts/form-dialog` |
| 表单 / 控件 | R006 R007 R008 | `element/el-form`, `layouts/form-dialog` |
| 弹窗 / 分页 | R011 | `element/el-dialog`, `layouts/form-dialog` |
| 状态 / 分类 / 编号 / 字典 | R009 R010 R019 R020 | `element/el-tag` |
| 颜色 / Token | R016 R017 R018 | `runtime/design-tokens` |
| 组件族场景化 | R031–R037 | `element/component-family` |
| 布局 / 操作组合 | R013（人工评审） | `ops/migrate`, `runtime/migration` |

> 历史 ID 漂移：v1.8.0 起 `tag.mjs` 中的旧 R017/R018 重号为 **R019/R020**（避免与 `color.mjs` 的 R017/R018 冲突）；旧 ID 在 `rules.json` 通过 `aliases` 兼容。

## 三、可否自动修复

由 `standards/rules.json` 的 `autoFixable` 字段权威决定，不在此另行声明。`npx wl-ui fix --target src --dry-run` 会按该字段筛选可自动修复条目。

---

## 四、执行约束

1. Phase 3 用户确认是强制门槛，未确认不得修改文件
2. 每次只修改一类规则，修改后立即验证该类归零再继续
3. 不修改路径：`node_modules/`、`dist/`、`*.min.js`、用户标注为"已手动调整"的文件
4. 脚本幂等：已符合标准的不会被二次修改
