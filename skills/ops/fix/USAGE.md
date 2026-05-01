# USAGE — 自动修复 Skill

## 调用方式

```
帮我修复扫描到的所有 A 类问题
批量修复这个目录的 hex 颜色
```

## 最佳实践

```bash
# 1. 先扫描了解情况
npx wk-ui scan --target src --outFile /tmp/before.md

# 2. dry-run 预览修复效果
npx wk-ui fix --target src --dry-run

# 3. 确认无误后执行
npx wk-ui fix --target src

# 4. 验证效果
npx wk-ui scan --target src --outFile /tmp/after.md
```
