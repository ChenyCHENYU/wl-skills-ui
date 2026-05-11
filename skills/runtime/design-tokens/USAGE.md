# USAGE — 设计 Token Skill

## 调用方式

```
帮我检查这个文件里有没有硬编码颜色
把 src/views/ 下所有硬编码 hex 替换为 CSS Token
```

## 一行修复命令

```bash
# 扫描
npx wl-ui scan --target src --output json | grep '"rule":"R01[678]"'

# 修复（会替换所有已知映射的 hex）
npx wl-ui fix --target src --dry-run   # 先 dry-run 看效果
npx wl-ui fix --target src             # 确认后执行
```
