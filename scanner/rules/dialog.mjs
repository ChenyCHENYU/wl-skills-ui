/** scanner/rules/dialog.mjs — 弹窗分页规则：R011 */
import { lineOf, issue } from "./_shared.mjs";

export const dialogRules = [
  // R011: pagination 放在 #footer 外面
  {
    id: "R011",
    category: "dialog",
    severity: "error",
    name: "弹窗内分页器应放在 #footer slot 中",
    check(template, file, lineOffset) {
      const issues = [];
      // 找到 #footer slot 的范围
      const footerMatch = /<template\s+#footer\b/;
      const footerIdx = template.search(footerMatch);
      // 找 el-pagination
      const paginationPattern = /<el-pagination\b/g;
      let m;
      while ((m = paginationPattern.exec(template)) !== null) {
        // 是否在 el-dialog 里？
        const before = template.slice(0, m.index);
        const dialogOpens = (before.match(/<el-dialog\b/g) || []).length;
        const dialogCloses = (before.match(/<\/el-dialog>/g) || []).length;
        if (dialogOpens <= dialogCloses) continue; // 不在 dialog 内
        // 是否在 footer 之外？
        if (footerIdx === -1 || m.index < footerIdx)
          issues.push(
            issue(
              file,
              lineOf(template, m.index, lineOffset),
              "R011",
              "dialog",
              "error",
              "弹窗内 el-pagination 未放在 <template #footer> 中",
              '将 el-pagination 移至 <template #footer><div class="dialog-footer">...</div></template>',
            ),
          );
      }
      return issues;
    },
  },
];
