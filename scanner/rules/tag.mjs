/** scanner/rules/tag.mjs — 标签/状态规则：R009 R010 R012 R017 R018 */
import { lineOf, issue, findTags } from "./_shared.mjs";

/** 状态类字段名关键字（动态流转状态） */
const STATUS_FIELD_PATTERN =
  /(?:Status|State|Flag|status|state|flag)(?=\s*["']|:\s*["']|$)/;

/** 分类字段名关键字（组织/归档属性） */
const CLASSIFY_FIELD_PATTERN =
  /(?:Type|Level|Kind|Class|Category|type|level|kind|class|category)(?=\s*["']|:\s*["']|$)/;

export const tagRules = [
  // R009: 状态字段纯文本渲染（应使用 renderTagNode / ElTag）
  {
    id: "R009",
    category: "tag",
    severity: "warning",
    name: "状态字段纯文本渲染（应使用 renderTagNode / ElTag）",
    check(template, file, lineOffset) {
      const issues = [];
      // 检测 el-table-column 中 name/prop 含 Status/Level/State 但无 renderTagNode/ElTag/jh-tag/defaultSlot
      for (const tag of findTags(template, "el-table-column")) {
        const nameMatch = tag.text.match(/(?:name|prop)\s*=\s*["'](\w+)["']/);
        if (!nameMatch) continue;
        const fieldName = nameMatch[1];
        if (
          !STATUS_FIELD_PATTERN.test(fieldName) &&
          !CLASSIFY_FIELD_PATTERN.test(fieldName)
        )
          continue;
        // 有渲染器则跳过
        if (
          /renderTagNode|renderOps|ElTag|jh-tag|defaultSlot|defaultNode|renderClassifyTag|renderBadge/.test(
            tag.text,
          )
        )
          continue;
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R009",
            "tag",
            "warning",
            `状态字段 "${fieldName}" 使用纯文本渲染，应改为 renderTagNode / ElTag`,
            `使用 defineColumns() 包裹列定义，或手动添加 defaultSlot: ({ row }) => renderTagNode(row.${fieldName}, MAP)`,
          ),
        );
      }
      return issues;
    },
    // 脚本式列定义（columnsDef / columns 数组）中状态字段纯文本（含 logicType:dict 但无 defaultSlot）
    checkScript(script, file, lineOffset) {
      const issues = [];
      const lines = script.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const labelMatch = lines[i].match(/label:\s*["']([^"']+)["']/);
        if (!labelMatch) continue;
        const label = labelMatch[1];
        if (!STATUS_FIELD_PATTERN.test(label) && !/状态|级别|类型/.test(label))
          continue;
        const blockStart = Math.max(0, i - 3);
        const blockEnd = Math.min(lines.length, i + 8);
        const block = lines.slice(blockStart, blockEnd).join("\n");
        // 已有渲染器则跳过
        if (
          /defaultSlot|defaultNode|renderTag|renderClassify|renderDictClassify|renderEnable|renderBadge|ElTag/.test(
            block,
          )
        )
          continue;
        issues.push({
          file,
          line: lineOffset + i + 1,
          rule: "R009",
          category: "tag",
          severity: "warning",
          description: `状态/分类列 "${label}" 纯文本渲染，应使用 renderTagNode / renderDictClassifyTag`,
          suggestion: `添加 defaultSlot: ({ row }) => renderDictClassifyTag(row.xxx, 'dictKey') 或 renderTagNode(row.xxx, MAP)`,
        });
      }
      return issues;
    },
  },

  // R010: 分类字段使用填充色 ElTag（应使用 effect="plain"）
  {
    id: "R010",
    category: "tag",
    severity: "warning",
    name: '分类字段使用填充色 ElTag（应使用 effect="plain" outline 风格）',
    check(template, file, lineOffset) {
      const issues = [];
      // 检测含 Type/Level/Class/Category 的 el-tag 缺少 effect="plain"
      for (const tag of findTags(template, "el-tag")) {
        // 判断上下文是否是分类字段（前后 200 字符内含分类关键字）
        const contextStart = Math.max(0, tag.index - 200);
        const context = template.slice(
          contextStart,
          tag.index + tag.text.length,
        );
        if (!CLASSIFY_FIELD_PATTERN.test(context)) continue;
        // 已有 effect="plain" 则跳过
        if (/effect\s*=\s*["']plain["']/.test(tag.text)) continue;
        // 有 effect="dark" 或无 effect 的分类 Tag → 建议改为 plain
        if (
          /effect\s*=\s*["']dark["']/.test(tag.text) ||
          !/effect\s*=/.test(tag.text)
        ) {
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R010",
              "tag",
              "warning",
              '分类字段 ElTag 未使用 effect="plain"（outline 风格），视觉权重过高',
              '添加 effect="plain"，或使用 renderClassifyTag() 自动渲染',
            ),
          );
        }
      }
      return issues;
    },
  },

  // R017: 编号/工号/证件号列缺少 renderBadge（脚本式 columnsDef）
  {
    id: "R017",
    category: "tag",
    severity: "warning",
    name: "编号/工号/证件号列缺少 renderBadge（脚本式 columnsDef）",
    checkScript(script, file, lineOffset) {
      const issues = [];
      /** label 关键字：编号、工号、证件号、以及常见英文组合 */
      const BADGE_LABEL_RE =
        /编号|工号|证件号|驾驶员证件号|车主证件号|处置人工号/;
      const lines = script.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const labelMatch = lines[i].match(/label:\s*["']([^"']+)["']/);
        if (!labelMatch) continue;
        const label = labelMatch[1];
        if (!BADGE_LABEL_RE.test(label)) continue;
        const blockStart = Math.max(0, i - 2);
        const blockEnd = Math.min(lines.length, i + 10);
        const block = lines.slice(blockStart, blockEnd).join("\n");
        if (/renderBadge|defaultSlot|defaultNode/.test(block)) continue;
        const nameMatch = block.match(/name:\s*["']([^"']+)["']/);
        const fieldName = nameMatch ? nameMatch[1] : "xxx";
        issues.push({
          file,
          line: lineOffset + i + 1,
          rule: "R017",
          category: "tag",
          severity: "warning",
          description: `编号列 "${label}" 未使用 renderBadge，纯文本无视觉区分`,
          suggestion: `添加 defaultSlot: ({ row }) => renderBadge(row.${fieldName})，并 import { renderBadge } from "@/util/ag-cell-renders"`,
        });
      }
      return issues;
    },
  },

  // R018: 脚本式列定义使用 logicType:dict 但缺少 defaultSlot（应改为 renderDictClassifyTag）
  {
    id: "R018",
    category: "tag",
    severity: "warning",
    name: "dict列缺少 defaultSlot/renderDictClassifyTag（脚本式 columnsDef）",
    checkScript(script, file, lineOffset) {
      const issues = [];
      const lines = script.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!/logicType.*dict|BusLogicDataType\.dict/.test(lines[i])) continue;
        const blockStart = Math.max(0, i - 5);
        const blockEnd = Math.min(lines.length, i + 5);
        const block = lines.slice(blockStart, blockEnd).join("\n");
        if (
          /defaultSlot|defaultNode|renderTag|renderClassify|renderDictClassify|renderEnable|renderBadge/.test(
            block,
          )
        )
          continue;
        const labelMatch = block.match(/label:\s*["']([^"']+)["']/);
        const label = labelMatch ? labelMatch[1] : "(unknown)";
        const logicMatch = block.match(/logicValue:\s*["']([^"']+)["']/);
        const dictKey = logicMatch ? logicMatch[1] : "dictKey";
        const nameMatch = block.match(/name:\s*["']([^"']+)["']/);
        const fieldName = nameMatch ? nameMatch[1] : "xxx";
        issues.push({
          file,
          line: lineOffset + i + 1,
          rule: "R018",
          category: "tag",
          severity: "warning",
          description: `"${label}" 使用 logicType:dict 但无 defaultSlot，纯文本展示枚举值`,
          suggestion: `改为 defaultSlot: ({ row }) => renderDictClassifyTag(row.${fieldName}, '${dictKey}')，删除 logicType/logicValue`,
        });
      }
      return issues;
    },
  },

  // R012: 弹窗内 el-table 缺少空状态
  {
    id: "R012",
    category: "tag",
    severity: "warning",
    name: "弹窗内 el-table 缺少 empty-text",
    check(template, file, lineOffset) {
      const issues = [];
      // 检测 el-dialog 内的 el-table 缺少 empty-text
      const dialogPattern = /<el-dialog\b/g;
      let dm;
      while ((dm = dialogPattern.exec(template)) !== null) {
        // 找到 dialog 结束标签
        const dialogStart = dm.index;
        const afterDialog = template.slice(dialogStart);
        const dialogCloseMatch = afterDialog.match(/<\/el-dialog>/);
        if (!dialogCloseMatch) continue;
        const dialogEnd =
          dialogStart + dialogCloseMatch.index + "</el-dialog>".length;
        const dialogContent = template.slice(dialogStart, dialogEnd);

        // 在 dialog 内容中找 el-table
        for (const tag of findTags(dialogContent, "el-table")) {
          if (!tag.text.includes("empty-text=")) {
            issues.push(
              issue(
                file,
                lineOf(template, dialogStart + tag.index, lineOffset),
                "R012",
                "tag",
                "warning",
                "弹窗内 el-table 缺少 empty-text 属性",
                '添加 empty-text="暂无数据"',
              ),
            );
          }
        }
      }
      return issues;
    },
  },
];
