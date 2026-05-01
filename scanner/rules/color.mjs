/** scanner/rules/color.mjs — 颜色 Token 规则：R016 R017 R018 */
import { lineOf, issue, TOKEN_MAP } from "./_shared.mjs";

export const colorRules = [
  // R016: <style> 块硬编码 hex
  {
    id: "R016",
    category: "style",
    severity: "warning",
    name: "<style> 块存在硬编码 hex 颜色（应替换为 CSS Token 变量）",
    check() {
      return [];
    },
    checkStyle(styleBlock, file, lineOffset = 0) {
      const issues = [];
      styleBlock.split("\n").forEach((line, idx) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
        let m;
        while ((m = hexPattern.exec(line)) !== null) {
          const hex = m[0].toLowerCase();
          const suggested = TOKEN_MAP[hex];
          if (suggested)
            issues.push(
              issue(
                file,
                lineOffset + idx + 1,
                "R016",
                "style",
                "warning",
                `<style> 块硬编码颜色 "${hex}"，应使用 CSS Token`,
                `将 "${hex}" 替换为 ${suggested}`,
              ),
            );
        }
      });
      return issues;
    },
  },

  // R017: <template> 内硬编码 hex
  {
    id: "R017",
    category: "style",
    severity: "warning",
    name: "<template> 块存在硬编码 hex 颜色（应替换为 CSS Token 变量）",
    check(template, file, lineOffset) {
      const issues = [];
      const patterns = [
        /\bcolor\s*=\s*"(#[0-9a-fA-F]{3,8})"/g,
        /\bcolor\s*=\s*'(#[0-9a-fA-F]{3,8})'/g,
        /:style\s*=\s*"[^"]*?(#[0-9a-fA-F]{3,8})[^"]*?"/g,
        /\bstyle\s*=\s*"[^"]*?(#[0-9a-fA-F]{3,8})[^"]*?"/g,
      ];
      for (const p of patterns) {
        let m;
        while ((m = p.exec(template)) !== null) {
          const hex = m[1].toLowerCase();
          const suggested = TOKEN_MAP[hex];
          if (suggested)
            issues.push(
              issue(
                file,
                lineOf(template, m.index, lineOffset),
                "R017",
                "style",
                "warning",
                `template 内硬编码颜色 "${hex}"，应使用 CSS Token`,
                `将 "${hex}" 替换为 ${suggested}`,
              ),
            );
        }
      }
      return issues;
    },
  },

  // R018: <script> 块硬编码 hex（ECharts 等）
  {
    id: "R018",
    category: "style",
    severity: "warning",
    name: "<script> 块存在硬编码 hex 颜色（ECharts/inline 配色应统一项目色系）",
    check() {
      return [];
    },
    checkScript(scriptBlock, file, lineOffset = 0) {
      const SCRIPT_TOKEN_MAP = {
        ...TOKEN_MAP,
        "#409eff": "var(--el-color-primary) / CHART_COLORS.primary",
        "#4368ff": "var(--el-color-primary)",
      };
      const issues = [];
      scriptBlock.split("\n").forEach((line, idx) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
        let m;
        while ((m = hexPattern.exec(line)) !== null) {
          const hex = m[0].toLowerCase();
          const suggested = SCRIPT_TOKEN_MAP[hex];
          if (suggested)
            issues.push(
              issue(
                file,
                lineOffset + idx + 1,
                "R018",
                "style",
                "warning",
                `<script> 块硬编码颜色 "${hex}"，应改用项目色系常量`,
                `${hex} → ${suggested}（建议统一使用 src/util/chart-colors.ts CHART_COLORS）`,
              ),
            );
        }
      });
      return issues;
    },
  },
];
