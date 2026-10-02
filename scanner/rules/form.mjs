/** scanner/rules/form.mjs — 表单控件规则：R006 R007 R008 R042 R044 */
import { lineOf, issue, findTags } from "./_shared.mjs";

function isPickerPanelScoped(selector) {
  const pickerBranches = selector
    .split(",")
    .filter((branch) => /\.el-date-picker(?![-\w])/.test(branch));
  return (
    pickerBranches.length > 0 &&
    pickerBranches.every((branch) =>
      /\.el-picker__popper|\.wl-ui-picker-geometry-off/.test(branch),
    )
  );
}

export const formRules = [
  // R006: 表单输入与 picker 缺少 size="small"
  {
    id: "R006",
    category: "form",
    severity: "warning",
    name: '表单控件缺少 size="small"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of [
        "el-input",
        "el-select",
        "el-date-picker",
        "el-time-picker",
      ]) {
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

  // R007: el-date/time-picker 缺少 width:100%
  {
    id: "R007",
    category: "form",
    severity: "warning",
    name: 'el-date/time-picker 缺少 style="width:100%"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-date-picker", "el-time-picker"]) {
        for (const tag of findTags(template, tagName)) {
          const hasDynamicStyle = /(?:^|\s):style\s*=/.test(tag.text);
          const staticStyle = tag.text.match(/(?:^|\s)style\s*=\s*["']([^"']*)["']/)?.[1];
          if (hasDynamicStyle || /(?:width|inline-size)\s*:\s*100%/.test(staticStyle || "")) {
            continue;
          }
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R007",
              "form",
              "warning",
              `${tagName} 缺少 width:100% 宽度样式`,
              '添加 style="width:100%"',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R042: .el-date-picker 同时是弹层类，裸几何样式会把 Teleport 面板放大甚至全屏。
  {
    id: "R042",
    category: "form",
    severity: "error",
    name: "裸 .el-date-picker 几何样式污染 Teleport 弹层",
    checkStyle(style, file, lineOffset) {
      const issues = [];
      const rulePattern = /([^{}]*\.el-date-picker(?![-\w])[^{}]*)\{([^{}]*)\}/g;
      let match;
      while ((match = rulePattern.exec(style)) !== null) {
        const selector = match[1].trim();
        const declarations = match[2];
        if (isPickerPanelScoped(selector)) continue;
        const hasDangerousGeometry =
          /(?:^|;)\s*(?:width|inline-size)\s*:\s*100(?:%|[dsl]?vw)/m.test(
            declarations,
          ) ||
          /(?:^|;)\s*(?:height|block-size)\s*:\s*100(?:%|[dsl]?vh)/m.test(
            declarations,
          ) ||
          /(?:^|;)\s*position\s*:\s*fixed/m.test(declarations) ||
          /(?:^|;)\s*inset\s*:\s*0(?:px|r?em|%|vh|vw)?(?:\s*!important)?\s*(?:;|$)/m.test(
            declarations,
          );
        if (!hasDangerousGeometry) continue;
        issues.push(
          issue(
            file,
            lineOf(style, match.index, lineOffset),
            "R042",
            "form",
            "error",
            "裸 .el-date-picker 同时命中输入组件弹层，可能导致日期面板全屏",
            "表单输入宽度请改用 .el-date-editor 或组件 style=\"width:100%\"；弹层定制必须从 .el-picker__popper 开始限定",
          ),
        );
      }
      return issues;
    },
  },

  // R008: 静态标签宽度小于基础阈值；长标签仍需按实际文本测量。
  {
    id: "R008",
    category: "form",
    severity: "info",
    name: "表单静态标签宽度偏小（< 150px）",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-form", "BaseForm", "base-form", "BaseQuery", "base-query"]) {
        for (const tag of findTags(template, tagName)) {
          const match = tag.text.match(/(?:^|\s)(?:label-width|labelWidth)\s*=\s*["'](\d+)px["']/);
          if (!match || Number(match[1]) >= 150) continue;
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R008",
              "form",
              "info",
              `${tagName} 标签宽度 ${match[1]}px 偏小，长标签可能被截断`,
              "量取最长实际标签并核对控件宽度；必要时增加标签宽度、减少列数（需人工确认）",
            ),
          );
        }
      }
      return issues;
    },
  },

  // R044: 多列表单的超宽静态标签或动态字面量兜底值会把首列输入推向右侧。
  // 只做 review：标签文本、列宽和响应式断点都可能使宽标签成为必要配置。
  {
    id: "R044",
    category: "form",
    severity: "review",
    name: "多列表单标签宽度过大（≥ 240px）",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tagName of ["el-form", "BaseForm", "base-form"]) {
        for (const tag of findTags(template, tagName)) {
          const widthAttribute = tag.text.match(
            /(?:^|\s)(:)?(?:label-width|labelWidth)\s*=\s*(["'])([\s\S]*?)\2/,
          );
          if (!widthAttribute) continue;
          const widths = widthAttribute[1]
            ? [...widthAttribute[3].matchAll(/(["'`])(\d+)px\1/g)].map((match) => Number(match[2]))
            : [Number(/^(\d+)px$/.exec(widthAttribute[3].trim())?.[1])];
          const wideWidth = widths.find((width) => width >= 240);
          if (!wideWidth) continue;
          const columns = tag.text.match(/(?:^|\s)(?::columns|columns)\s*=\s*["']([^"']+)["']/);
          if (!columns || columns[1].trim() === "1") continue;
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R044",
              "form",
              "review",
              `${tagName} 在多列布局中使用 ${wideWidth}px 标签宽度，可能造成首列大留白`,
              "核对最长实际标签与输入区≥160px；仅在本表单缩窄标签并设置对称边距，宽/窄屏实测后再应用，不自动改写",
            ),
          );
        }
      }
      return issues;
    },
  },
];
