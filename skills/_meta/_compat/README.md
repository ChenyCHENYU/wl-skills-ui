# 多编辑器兼容指南

wk-skills-ui 的 Skills 可通过 `wk-ui init/update` 安装到不同 AI 编辑器。兼容层只负责“把同一套 Skill 知识转换成编辑器可识别的规则文件”，不绑定任何具体业务项目。

## 支持的编辑器

| 编辑器 | 安装路径 | 形式 | 说明 |
|---|---|---|---|
| GitHub Copilot | `.github/instructions/wk-skills/*.instructions.md` | 多文件 | 使用 `applyTo` frontmatter |
| Cursor | `.cursor/rules/*.mdc` | 多文件 | 使用 mdc frontmatter |
| Windsurf | `.windsurf/rules/*.md` | 多文件 | 纯 Markdown 规则 |
| Kiro | `.kiro/steering/*.md` | 多文件 | steering 文档 |
| Trae | `.trae/rules/*.md` | 多文件 | description frontmatter |
| Claude Code | `CLAUDE.md` | 单文件 | 合并全部 Skill，适合 Claude Code 自动加载 |
| Cline | `.clinerules` | 单文件 | 合并全部 Skill |
| Generic Agents | `AGENTS.md` | 单文件 | 通用 Agent 协议 |
| Qoder | `.qoder/rules/*.md` | 多文件 | Qoder 项目规则 |

## 常用命令

```bash
# 自动检测编辑器并安装
npx wk-ui init --project .

# 指定编辑器
npx wk-ui init --project . --editor github-copilot
npx wk-ui init --project . --editor claude-code
npx wk-ui init --project . --editor cline
npx wk-ui init --project . --editor agents-generic
npx wk-ui init --project . --editor qoder

# 增量更新 / 对比 / 清理
npx wk-ui update --project .
npx wk-ui diff --project .
npx wk-ui clean --project . --dry-run
```

## 安装时还会写入

- `.github/wk-skills-ui/TRIGGER_PROMPTS.md`：AI 触发提示
- `.github/wk-skills-ui/README.md`：业务项目内说明
- `.mcp.json`：`wk-skills-ui` MCP Server 配置
- `.wk-skills-ui-manifest.json`：安装清单，供 `update/diff/clean/doctor` 使用

## 格式模板

各编辑器的头模板位于 `headers/`。`wk-ui init/update` 会读取对应 `headers/*.txt`，再拼接 Skill 主体内容生成目标文件。新增编辑器时只需增加 header 并在 CLI/注册表中声明安装路径。
