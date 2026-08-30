---
description: |
  wl-ui scan 扫描器使用指南 — 如何运行风格扫描、接入完整性检查，解读报告格式。
applyTo: "**"
---

# 扫描器使用指南

## 命令速查

```bash
# 一站式（推荐）：接入完整性 + 风格扫描 + 生成 Markdown 报告
npx wl-ui all --project . --outFile report.md

# 仅风格扫描
npx wl-ui scan --target src

# 仅接入完整性检查（I001~I004）
npx wl-ui check --project .

# JSON 格式输出（方便程序处理）
npx wl-ui scan --target src --output json

# 低 token / PR 增量（MCP 默认使用 summary）
npx wl-ui scan --target src --changed --base origin/main --output summary
npx wl-ui scan --target src --changed --base origin/main --output compact-v2 --limit 50
```

## 参数说明

| 参数              | 默认值                   | 说明                                           |
| ----------------- | ------------------------ | ---------------------------------------------- |
| `--target`        | `./src`                  | Vue 文件扫描根目录                             |
| `--project`       | `.`                      | 项目根目录（用于接入完整性检查）               |
| `--output`        | `markdown`               | `summary` \| `compact-v2` \| `compact` \| `json` \| `markdown` |
| `--changed`       | `false`                  | 仅扫描 Git 变更 Vue 文件，解析失败默认终止       |
| `--changed-fallback` | `error`               | 只有显式设为 `full` 才允许扩大到全量             |
| `--profile`       | 自动检测                 | `native-element` / `legacy-jh-element` / `legacy-jh-ag` |
| `--limit/cursor`  | `100/0`                  | `compact-v2` 的有界分页                          |
| `--base`          | `HEAD`                   | 增量基线，例如 `origin/main`                    |
| `--exclude`       | `node_modules,dist,.git` | 排除目录（逗号分隔）                           |
| `--outFile`       | `""`                     | 写入文件路径，为空则输出到 stdout              |
| `--fail-on-error` | `false`                  | 存在 error 级别问题时以非零退出码退出（CI 用） |

## CI 集成

```yaml
# .github/workflows/style-check.yml
- name: wl-skills-ui 风格检查
  run: npx wl-ui all --project . --fail-on-error
```

## 报告格式说明

`summary` 只返回计数、规则分布和下一步；`compact-v2` 将公共规则字段放入一次性的
`ruleCatalog`，问题项为 `[line, rule, description]` 并支持分页；`compact` v1 保留兼容，
`json` 保留完整字段，`markdown` 面向人工评审。

```
一、接入完整性仪表盘
  ✅ I001 — tokens.css 已在 index.html 引入
  ✅ I002 — 全局 SCSS 已引入 wl-skills-ui 样式
  ✅ I003 — runtime 已被引用
  ✅ I004 — peerDependencies 版本满足要求

二、风格扫描摘要
  扫描文件数：43  总问题数：127

三、按规则统计
  | 规则 | 类别 | 严重级 | 问题数 |
  ...

四、问题明细（按严重级）
  ### error
  - src/views/check/list.vue:34 [R001] el-table-column 缺少 align="center"
  ...
```

## 退出码

| 退出码 | 含义                                             |
| ------ | ------------------------------------------------ |
| `0`    | 扫描完成（无论是否有问题，除非 --fail-on-error） |
| `1`    | 存在 error 级别问题且设置了 --fail-on-error      |
