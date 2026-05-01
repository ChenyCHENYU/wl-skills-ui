/** scanner/rules/form.mjs — 表单控件规则：R006 R007 R008 */
import { lineOf, issue, findTags } from "./_shared.mjs";

export const formRules = [
  // R006: el-input / el-select 缺少 size="small"
  {
    id: "R006",
    category: "form",
    severity: "warning",
    name: 'el-input / el-select 缺少 size="small"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-input", "el-select"]) {
        for (const tag of findTags(template, tagName)) {
          if (!/:?size\s*=/.test(tag.text))
            issues.push(
              issue(
                file,
                lineOf(template, tag.index, lineOffset),
                "R006",
                "form",
                "warning",
                `<${tagName}> 缺少 size="small"`,
                '添加 size="small"',
              ),
            );
        }
      }
      return issues;
    },
  },

  // R007: el-date-picker 缺少 width:100%
  {
    id: "R007",
    category: "form",
    severity: "warning",
    name: 'el-date-picker 缺少 style="width:100%"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-date-picker")) {
        if (!tag.text.includes("style=") && !tag.text.includes(":style="))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R007",
              "form",
              "warning",
              "el-date-picker 缺少宽度样式",
              '添加 style="width:100%"',
            ),
          );
      }
      return issues;
    },
  },

  // R008: el-form labelWidth < 150px
  {
    id: "R008",
    category: "form",
    severity: "info",
    name: "el-form labelWidth 偏小（< 150px）",
    check(template, file, lineOffset) {
      const issues = [];
      const pattern = /labelWidth="(\d+)px"/g;
      let m;
      while ((m = pattern.exec(template)) !== null) {
        if (parseInt(m[1]) < 150)
          issues.push(
            issue(
              file,
              lineOf(template, m.index, lineOffset),
              "R008",
              "form",
              "info",
              `labelWidth="${m[1]}px" 偏小，长标签（≥8字）可能换行`,
              '建议改为 labelWidth="150px"（需人工确认）',
            ),
          );
      }
      return issues;
    },
  },
];
