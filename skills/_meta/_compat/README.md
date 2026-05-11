# 多编辑器兼容指南

wl-skills-ui 的 Skills 可通过 `wl-ui init/update` 安装到不同 AI 编辑器。兼容层只负责“把同一套 Skill 知识转换成编辑器可识别的规则文件”，不绑定任何具体业务项目。

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
npx wl-ui init --project .

# 指定编辑器
npx wl-ui init --project . --editor github-copilot
npx wl-ui init --project . --editor claude-code
npx wl-ui init --project . --editor cline
npx wl-ui init --project . --editor agents-generic
npx wl-ui init --project . --editor qoder

# 更新已安装编辑器规则；或一次性刷新全部支持编辑器
npx wl-ui update --project . --force
npx wl-ui update --project . --editor all --force

# 对比 / 清理
npx wl-ui diff --project .
npx wl-ui clean --project . --dry-run
```

`wl-ui update` 未指定 `--editor` 时，会优先刷新 manifest 中记录的编辑器和项目里已存在的编辑器规则目录；指定 `--editor all` 时会把同一套 `skills/**/*.md` 转换并覆盖写入全部支持编辑器。

## 安装时还会写入

- `.github/wl-skills-ui/TRIGGER_PROMPTS.md`：AI 触发提示
- `.github/wl-skills-ui/README.md`：业务项目内说明
- `.mcp.json`：`wl-skills-ui` MCP Server 配置
- `.wl-skills-ui-manifest.json`：安装清单，供 `update/diff/clean/doctor` 使用

## 格式模板

各编辑器的头模板位于 `headers/`。`wl-ui init/update` 会读取对应 `headers/*.txt`，再拼接 Skill 主体内容生成目标文件。新增编辑器时只需增加 header 并在 CLI/注册表中声明安装路径。
