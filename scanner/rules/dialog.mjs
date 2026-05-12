/** scanner/rules/dialog.mjs — 弹窗分页规则：R011
 *  v1.8.0 修复：之前逻辑反了（要求"必须放 #footer"），与 standards/ui/05-dialog-pagination.md
 *  「分页必须放在内容区，不得放在 #footer」语义矛盾。本版反转为正确语义：检测到
 *  #footer 内含 el-pagination 即报错。
 *  事实源：standards/rules.json (R011)
 */
import { lineOf, issue } from "./_shared.mjs";

export const dialogRules = [
  // R011: el-pagination 不得位于 #footer 插槽中
  {
    id: "R011",
    category: "dialog",
    severity: "error",
    name: "弹窗内 el-pagination 不得放在 #footer 插槽中",
    check(template, file, lineOffset) {
      const issues = [];
      // 提取所有 <template #footer ...> ... </template> 段
      const footerSegments = [];
      const footerOpenRe = /<template\s+#footer\b[^>]*>/g;
      let openMatch;
      while ((openMatch = footerOpenRe.exec(template)) !== null) {
        const start = openMatch.index;
        const after = template.slice(start);
        // 简易匹配最近的 </template>（v3 中 footer slot 不嵌套 template）
        const closeRel = after.search(/<\/template>/);
        if (closeRel === -1) continue;
        footerSegments.push({ start, end: start + closeRel });
      }
      const inFooter = (idx) =>
        footerSegments.some((s) => idx >= s.start && idx <= s.end);

      const paginationRe = /<el-pagination\b/g;
      let m;
      while ((m = paginationRe.exec(template)) !== null) {
        // 必须在 el-dialog 内
        const before = template.slice(0, m.index);
        const dialogOpens = (before.match(/<el-dialog\b/g) || []).length;
        const dialogCloses = (before.match(/<\/el-dialog>/g) || []).length;
        if (dialogOpens <= dialogCloses) continue;
        if (inFooter(m.index)) {
          issues.push(
            issue(
              file,
              lineOf(template, m.index, lineOffset),
              "R011",
              "dialog",
              "error",
              "弹窗内 el-pagination 位于 #footer 插槽中（会逃出 dialog 容器漂浮在页面底部）",
              '将 el-pagination 移到内容区，包裹 <div class="popup-pagination">；#footer 仅放操作按钮',
            ),
          );
        }
      }
      return issues;
    },
  },
];
