# 多编辑器兼容指南

wk-skills-ui 的 Skills 支持以下 AI 编辑器/工具，`wk-ui init` 会自动识别并写入正确格式。

## 支持的编辑器

| 编辑器         | 安装路径                             | 文件格式                              |
| -------------- | ------------------------------------ | ------------------------------------- |
| GitHub Copilot | `.vscode/` (copilot-instructions.md) | Markdown + `applyTo:` frontmatter     |
| Cursor         | `.cursor/rules/*.mdc`                | `.mdc` + `globs:` frontmatter         |
| Windsurf       | `.windsurf/rules/*.md`               | 纯 Markdown                           |
| Kiro           | `.kiro/steering/*.md`                | Markdown + `inclusion: manual`        |
| Trae           | `.trae/rules/*.md`                   | Markdown + `description:` frontmatter |

## 手动安装

```bash
# 自动检测项目根目录使用的编辑器并安装
npx wk-ui init --project /path/to/your-project

# 指定编辑器
npx wk-ui init --editor copilot --project /path/to/your-project
npx wk-ui init --editor cursor  --project /path/to/your-project
```

## 格式模板

各编辑器的 frontmatter 模板位于本目录 `headers/` 子目录。

`wk-ui init` 在生成 skill 文件时，会读取对应 `headers/*.txt` 作为 frontmatter 前缀，
后面追加 `SKILL.md` 的主体内容，生成完整的编辑器适配文件。
