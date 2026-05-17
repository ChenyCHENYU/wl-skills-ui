/** scanner/rules/semantic.mjs — 语义合规规则：R025 R026
 *
 *  R025: defineColumns 列定义中 options:[] 退化为纯文本（应用 renderTagSlot / renderDictClassifyTag）
 *  R026: 模板中使用原生 HTML 元素（<table>/<input>/<select>/<button>/<textarea>），
 *        应替换为 Element Plus 组件以纳入统一风格体系
 */
import { lineOf, issue, findTags } from "./_shared.mjs";

export const semanticRules = [
  // R025: options:[] 退化检测
  {
    id: "R025",
    category: "table",
    severity: "warning",
    name: "defineColumns 列使用 options:[] 纯文本渲染状态/分类（应使用 renderTagSlot / renderDictClassifyTag）",
    checkScript(script, file, lineOffset) {
      const issues = [];
      const lines = script.split("\n");
      for (let i = 0; i < lines.length; i++) {
        // 检测 options: [...] 或 options: SOME_VAR
        if (!/\boptions\s*:\s*[\[A-Z]/.test(lines[i])) continue;
        // 排除 parseArgs / CLI 等非列定义上下文
        const blockStart = Math.max(0, i - 8);
        const blockEnd = Math.min(lines.length, i + 5);
        const block = lines.slice(blockStart, blockEnd).join("\n");
        // 必须在列定义上下文中（有 label: 或 name: 或 prop:）
        if (
          !/\blabel\s*:/.test(block) &&
          !/\bname\s*:/.test(block) &&
          !/\bprop\s*:/.test(block)
        )
          continue;
        // 已有渲染器则跳过
        if (
          /defaultSlot|defaultNode|renderTag|renderDictClassify|renderBadge|renderEnable|cellRenderer/.test(
            block,
          )
        )
          continue;
        // 排除 type: "selection" / "index" / "expand"
        if (/type\s*:\s*["'](selection|index|expand)["']/.test(block)) continue;
        const labelMatch = block.match(/label\s*:\s*["']([^"']+)["']/);
        const label = labelMatch ? labelMatch[1] : "(未知列)";
        issues.push({
          file,
          line: lineOffset + i + 1,
          rule: "R025",
          category: "table",
          severity: "warning",
          description: `列 "${label}" 使用 options:[] 纯文本渲染，视觉无颜色区分`,
          suggestion: `替换为 defaultSlot: ({ row }) => renderDictClassifyTag(row.xxx, 'dictKey') 或 renderTagSlot(row.xxx, MAP)，移除 options`,
        });
      }
      return issues;
    },
  },

  // R026: 原生 HTML 元素应换 Element Plus 组件
  {
    id: "R026",
    category: "form",
    severity: "warning",
    name: "模板使用原生 HTML 元素，应替换为 Element Plus 组件以纳入统一风格体系",
    check(template, file, lineOffset) {
      const issues = [];
      const NATIVE_TO_EL = {
        table: {
          el: "el-table",
          reason: "原生 <table> 不受 wl-skills-ui 表格样式覆盖",
        },
        input: {
          el: "el-input",
          reason: "原生 <input> 不受统一 size/密度/圆角控制",
        },
        select: {
          el: "el-select",
          reason: "原生 <select> 不受统一下拉样式控制",
        },
        textarea: {
          el: 'el-input type="textarea"',
          reason: "原生 <textarea> 不受统一输入框样式控制",
        },
        button: {
          el: "el-button",
          reason: "原生 <button> 不受统一按钮样式控制",
        },
      };
      for (const [nativeTag, { el, reason }] of Object.entries(NATIVE_TO_EL)) {
        // 匹配 <table / <input / <select 等原生标签，排除 el-table / el-input 等
        const re = new RegExp(`<${nativeTag}(?:\\s|>|/)`, "g");
        let m;
        while ((m = re.exec(template)) !== null) {
          // 排除已是组件前缀的情况：el-table, el-input 等
          const before = template.slice(Math.max(0, m.index - 10), m.index);
          if (/[-\w]$/.test(before)) continue;
          // 排除注释
          const lineStart = template.lastIndexOf("\n", m.index) + 1;
          const lineText = template.slice(lineStart, m.index);
          if (/<!--/.test(lineText) && !/-->/.test(lineText)) continue;
          if (/^\s*\/\//.test(lineText)) continue;
          // 排除 slot/template 内嵌的特殊情况（如 <table> 在 rich-text/markdown 中）
          // 但不做过度排除，让开发者自行决定豁免
          issues.push(
            issue(
              file,
              lineOf(template, m.index, lineOffset),
              "R026",
              "form",
              "warning",
              `${reason}，建议替换为 <${el}>`,
              `将 <${nativeTag}> 替换为 <${el}>，确保纳入 wl-skills-ui 风格体系`,
            ),
          );
        }
      }
      return issues;
    },
  },

  // R027: 检测业务代码中对 .el-loading-mask 的灰色背景覆盖（应由 wl-skills-ui 统一管控）
  {
    id: "R027",
    category: "style",
    severity: "warning",
    name: "业务代码硬编码 el-loading-mask 背景色（应删除，由 wl-skills-ui 统一覆盖）",
    check() {
      return [];
    },
    checkStyle(styleBlock, file, lineOffset) {
      const issues = [];
      const lines = styleBlock.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 检测 .el-loading-mask 相关的 background 硬编码
        if (
          /\.el-loading-mask/.test(line) ||
          (i > 0 &&
            /\.el-loading-mask/.test(
              lines.slice(Math.max(0, i - 5), i).join("\n"),
            ))
        ) {
          if (
            /background(-color)?\s*:/.test(line) &&
            !/transparent/.test(line)
          ) {
            issues.push(
              issue(
                file,
                lineOffset + i + 1,
                "R027",
                "style",
                "warning",
                "业务代码硬编码 .el-loading-mask 背景色，与 wl-skills-ui 统一遮罩层冲突",
                "删除此规则，wl-skills-ui v1.8.5+ 已内置毛玻璃遮罩覆盖（styles/vendors/_base-table.scss）",
              ),
            );
          }
        }
      }
      return issues;
    },
  },
];
