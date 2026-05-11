# USAGE — 历史项目迁移 Skill

## 调用方式

```
帮我把这个旧项目接入 wl-skills-ui
这个项目还没有用统一风格库，帮我按标准接入
```

## 快速迁移命令序列

```bash
# 1. 安装
pnpm add @agile-team/wl-skills-ui

# 2. 接入完整性检查（看缺什么）
npx wl-ui check --project .

# 3. 按 check 输出逐步补齐 Step 2~5

# 4. 全量扫描
npx wl-ui all --project . --outFile report.md

# 5. 批量修复 A 类问题
npx wl-ui fix --target src
```

## 预计工作量参考

| 项目规模           | Vue 文件数 | 预计迁移时间 |
| ------------------ | ---------- | ------------ |
| 小型               | < 50       | 1~2 小时     |
| 中型               | 50~150     | 半天         |
| 大型（如 wl-safe） | > 150      | 1~2 天       |
