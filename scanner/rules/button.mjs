/** scanner/rules/button.mjs — 按钮规则：R004 R005 R015 */
import { lineOf, issue, findTags } from "./_shared.mjs";

export const buttonRules = [
  // R004: 操作列文字按钮
  {
    id: "R004",
    category: "button",
    severity: "error",
    name: "操作列使用旧格式文字按钮而非 renderOps 图标系统",
    check(template, file, lineOffset) {
      const issues = [];
      const btnPattern =
        /<el-button\b(?![^>]*jh-op-btn)[^>]*@click="handle(?:Edit|Delete|View|Remove|Cancel|Audit|Verify)[^"]*"[^>]*>[^<]*<\/el-button>/g;
      let m;
      while ((m = btnPattern.exec(template)) !== null)
        issues.push(
          issue(
            file,
            lineOf(template, m.index, lineOffset),
            "R004",
            "button",
            "error",
            "操作列使用文字 el-button，应改为 renderOps 图标按钮系统",
            'defaultSlot: ({ row }) => renderOps([{ type: "edit", onClick: () => ... }])',
          ),
        );
      return issues;
    },
  },

  // R005: 工具栏按钮缺少 icon
  {
    id: "R005",
    category: "button",
    severity: "warning",
    name: "工具栏按钮缺少 icon",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-button")) {
        if (!/type=["'](primary|success|warning|danger)["']/.test(tag.text))
          continue;
        if (/\blink\b/.test(tag.text)) continue;
        if (/jh-op-btn/.test(tag.text)) continue;
        if (!/:?icon=/.test(tag.text))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R005",
              "button",
              "warning",
              "工具栏 el-button 缺少 icon 属性",
              '添加 icon="Plus / Edit / Search / Refresh" 等语义图标',
            ),
          );
      }
      return issues;
    },
  },

  // R015: 弹窗嵌套表格操作列用 el-button link
  {
    id: "R015",
    category: "button",
    severity: "error",
    name: "弹窗嵌套表格操作列使用文字 el-button（应改为 jh-op-btn 图标按钮）",
    check(template, file, lineOffset) {
      const issues = [];
      if (!file.endsWith("modal.vue")) return issues;
      const pattern = /<el-button[\s\S]*?link[\s\S]*?<\/el-button>/g;
      let m;
      while ((m = pattern.exec(template)) !== null) {
        const btnText = m[0];
        if (/取消|确认|确定|关闭|保存|提交/.test(btnText)) continue;
        if (
          !/<el-table-column/.test(
            template.slice(Math.max(0, m.index - 500), m.index),
          )
        )
          continue;
        issues.push(
          issue(
            file,
            lineOf(template, m.index, lineOffset),
            "R015",
            "button",
            "error",
            "弹窗嵌套表格操作列使用 el-button link，风格不统一",
            '改为 <button class="jh-op-btn jh-op-del/view/edit"> + <el-icon>图标</el-icon>',
          ),
        );
      }
      return issues;
    },
  },
];
