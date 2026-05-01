# USAGE — UI 风格对齐 Skill

## 调用方式

在 AI 对话中，触发本 Skill 的典型问法：

```
帮我检查一下这个项目的 UI 风格是否符合规范
扫描 src/ 目录，找出所有不符合 wk-skills-ui 标准的地方
对 src/views/safety/ 下的文件做风格对齐修复
```

## 完整执行流程（示例）

```
用户：帮我对 src/views/check/ 目录做完整的风格扫描修复

AI 执行：
  1. [Phase 1] npx wk-ui all --project . --outFile /tmp/scan.md
  2. [Phase 2] 展示摘要（文件数、问题数、按规则分类）
  3. [Phase 3] 询问：是否全量修复？哪些文件需要跳过？
  4. [Phase 4] 执行修复（A 类 → wk-ui fix；B 类 → 逐文件编辑）
  5. [Phase 5] 重新扫描，展示 before/after 对比
```

## 期望输出格式

```markdown
## 扫描结果（Phase 2）

- 扫描文件数：43
- 发现问题数：127（高危 38 / 中危 64 / 低危 25）

| 规则 | 类型 | 数量 | 代表文件 |
| R001 | 高危 | 23 | src/views/check/list.vue:34 |
...

## 修复摘要（Phase 4）

- src/views/check/list.vue：R001×3, R006×2, R016×1
  ...

## 验证结果（Phase 5）

- 剩余问题：12（仅含需人工确认的 R009/R013）✅
```

## 相关 Skills

- 首次接入新项目 → [core/migration/SKILL.md](../migration/SKILL.md)
- 仅修复颜色 Token → [core/design-tokens/SKILL.md](../design-tokens/SKILL.md)
- 仅修复表格问题 → [components/table/SKILL.md](../../components/table/SKILL.md)
