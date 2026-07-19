# USAGE — 自动修复 Skill

## 调用方式

```
帮我修复扫描到的所有 A 类问题
批量修复这个目录的 hex 颜色
```

## 最佳实践

```bash
# 1. 先扫描了解情况
npx wl-ui scan --target src --outFile /tmp/before.md

# 2. dry-run 预览修复效果
npx wl-ui fix --target src --dry-run

# 3. 确认无误后执行
npx wl-ui fix --target src

# 4. 命令会自动复检；需要留档时再导出报告
npx wl-ui scan --target src --outFile /tmp/after.md

# 若复检仍有 error 则非零退出
npx wl-ui fix --target src --fail-on-error

# 回退最近一次自动修复
npx wl-ui snapshot rollback --project .
```
