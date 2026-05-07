/** scanner/rules/table.mjs — 表格相关规则：R001 R002 R003 R014 R021 R022 */
import { lineOf, issue, findTags } from "./_shared.mjs";

export const tableRules = [
  // R001: el-table-column 缺少 align="center"
  {
    id: "R001",
    category: "table",
    severity: "error",
    name: 'el-table-column 缺少 align="center"',
    check(template, file, lineOffset) {
      const issues = [];
      const hasCenter = (t) =>
        /(?::?align)\s*=\s*["'](?:center|'center'|"center")["']/.test(t) ||
        /align\s*=\s*["']center["']/.test(t);
      const hasLeft = (t) => /align\s*=\s*["']left["']/.test(t);
      for (const tag of findTags(template, "el-table-column")) {
        if (!hasCenter(tag.text)) {
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R001",
              "table",
              "error",
              hasLeft(tag.text)
                ? '有 align="left"，应改为 align="center"'
                : '缺少 align="center"',
              '添加 align="center"；selection列同时加 header-align="center"、width=55，index列width=60',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R002: el-table 缺少 empty-text
  {
    id: "R002",
    category: "table",
    severity: "warning",
    name: 'el-table 缺少 empty-text="暂无数据"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-table")) {
        if (!tag.text.includes("empty-text="))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R002",
              "table",
              "warning",
              "缺少 empty-text 属性",
              '添加 empty-text="暂无数据"',
            ),
          );
      }
      return issues;
    },
  },

  // R003: BaseTable 缺少 empty-text
  {
    id: "R003",
    category: "table",
    severity: "warning",
    name: 'BaseTable 缺少 empty-text="暂无数据"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "BaseTable")) {
        if (!tag.text.includes("empty-text="))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R003",
              "table",
              "warning",
              "BaseTable 缺少 empty-text 属性",
              '添加 empty-text="暂无数据"',
            ),
          );
      }
      return issues;
    },
  },

  // R014: selection 列缺少 header-align="center"
  {
    id: "R014",
    category: "table",
    severity: "warning",
    name: 'selection 列缺少 header-align="center"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-table-column")) {
        if (
          tag.text.includes('type="selection"') &&
          !tag.text.includes("header-align=")
        )
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R014",
              "table",
              "warning",
              'selection 列缺少 header-align="center"，会导致表头复选框不居中',
              '添加 header-align="center"',
            ),
          );
      }
      return issues;
    },
  },

  // R021: BaseTable 必须使用 AGGrid 渲染模式
  {
    id: "R021",
    category: "table",
    severity: "error",
    name: 'BaseTable 缺少 render-type="agGrid"',
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "BaseTable")) {
        if (!/render-type\s*=\s*["']agGrid["']/.test(tag.text))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R021",
              "table",
              "error",
              'BaseTable 必须显式配置 render-type="agGrid"',
              '添加 render-type="agGrid"',
            ),
          );
      }
      return issues;
    },
  },

  // R022: BaseTable 必须有唯一 cid
  {
    id: "R022",
    category: "table",
    severity: "error",
    name: "BaseTable 缺少 cid/:cid",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "BaseTable")) {
        if (!/(^|\s)(:cid|cid)\s*=/.test(tag.text))
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R022",
              "table",
              "error",
              "BaseTable 必须配置全局唯一 cid",
              '添加 cid="页面缩写-唯一后缀" 或 :cid="TABLE_CID"',
            ),
          );
      }
      return issues;
    },
  },
];
