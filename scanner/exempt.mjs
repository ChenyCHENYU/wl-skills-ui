/**
 * scanner/exempt.mjs — 豁免配置
 *
 * 支持两种配置方式：
 *   1. 项目根目录下 .wk-exempt.json
 *   2. CLI --exempt <path> 指定配置文件
 *
 * 配置格式：
 * {
 *   "exemptPaths": [
 *     "src/views/security/big-screen/**",
 *     "src/views/security/map-view/**",
 *     "src/views/security/flow-designer/**",
 *     "src/views/security/topology/**",
 *     "src/views/security/dashboard/**"
 *   ],
 *   "exemptRules": {
 *     "R016": ["src/views/security/big-screen/**"],
 *     "R017": ["src/views/security/big-screen/**"]
 *   },
 *   "exemptCategories": ["dashboard", "big-screen", "map", "chart", "topology", "flow-designer", "3d", "canvas", "report-designer", "rich-editor"],
 *   "description": "大屏、地图、图谱、流程设计器等强个性化页面豁免风格统一扫描"
 * }
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * 简易 glob 匹配（仅支持 ** 和 * 通配符）
 */
function matchGlob(filePath, pattern) {
  const normalized = filePath.replace(/\\/g, "/");
  const escaped = pattern
    .replace(/\\/g, "/")
    .replace(/[.+^${}()|[\]]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${escaped}$`).test(normalized);
}

/**
 * 加载豁免配置
 * @param {string} projectRoot
 * @param {string} [exemptPath]  CLI 指定的配置文件路径
 * @returns {object} { exemptPaths, exemptRules, exemptCategories, isExempt(file, rule?) }
 */
export function loadExemptConfig(projectRoot, exemptPath) {
  const defaultPath = join(projectRoot, ".wk-exempt.json");
  const configPath = exemptPath ? resolve(exemptPath) : defaultPath;

  const empty = {
    exemptPaths: [],
    exemptRules: {},
    exemptCategories: [],
    isExempt: () => false,
  };

  if (!existsSync(configPath)) return empty;

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    console.warn(`[wk-scan] 豁免配置解析失败: ${configPath}`);
    return empty;
  }

  const exemptPaths = config.exemptPaths || [];
  const exemptRules = config.exemptRules || {};
  const exemptCategories = config.exemptCategories || [];

  /**
   * 判断文件+规则是否被豁免
   * @param {string} relFile  相对路径
   * @param {string} [ruleId] 规则 ID
   */
  function isExempt(relFile, ruleId) {
    // 全局路径豁免
    if (exemptPaths.some((p) => matchGlob(relFile, p))) return true;
    // 规则级路径豁免
    if (ruleId && exemptRules[ruleId]) {
      if (exemptRules[ruleId].some((p) => matchGlob(relFile, p))) return true;
    }
    return false;
  }

  return { exemptPaths, exemptRules, exemptCategories, isExempt };
}

/**
 * 生成默认豁免配置模板
 */
export function generateExemptTemplate() {
  return JSON.stringify(
    {
      exemptPaths: [
        "src/views/**/big-screen/**",
        "src/views/**/dashboard/**",
        "src/views/**/map-view/**",
        "src/views/**/topology/**",
        "src/views/**/flow-designer/**",
        "src/views/**/report-designer/**",
        "src/views/**/chart/**",
        "src/views/**/3d/**",
        "src/views/**/canvas/**",
      ],
      exemptRules: {},
      exemptCategories: [
        "dashboard",
        "big-screen",
        "map",
        "chart",
        "topology",
        "flow-designer",
        "3d",
        "canvas",
        "report-designer",
        "rich-editor",
      ],
      description:
        "大屏、地图、图谱、流程设计器等强个性化页面豁免风格统一扫描",
    },
    null,
    2,
  );
}
