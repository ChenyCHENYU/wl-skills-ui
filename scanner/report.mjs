/**
 * 报告生成器 v3 — 结构化全量报告模板
 *
 * 自动输出以下章节：
 *   一、接入完整性仪表盘
 *   二、扫描总览（目录/文件/分类/严重度）
 *   三、豁免统计
 *   四、按分类统计（token/表格/表单/按钮/弹窗/标签 …）
 *   五、按规则统计
 *   六、按目录 & 文件明细
 *   七、问题明细（高/中/低）
 *   八、残留问题与后续建议
 *   附录：豁免配置 & 快照说明
 */
import { listRules } from "../standards/rules-loader.mjs";

const SEVERITY_LABEL = {
  error: "🔴 高危",
  warning: "🟡 中危",
  info: "🔵 低危",
};

const CATEGORY_LABEL = {
  color: "色值 Token",
  token: "色值 Token",
  style: "样式规范",
  table: "表格 (el-table)",
  form: "表单 (el-form/input/select)",
  input: "表单 (el-input)",
  dialog: "弹窗 (el-dialog)",
  button: "按钮 / 操作列",
  tag: "标签 (el-tag)",
  pagination: "分页 (pagination)",
  card: "卡片 (el-card)",
  tabs: "标签页 (el-tabs)",
  descriptions: "描述列表 (el-descriptions)",
  tree: "树 (el-tree)",
  drawer: "抽屉 (el-drawer)",
  upload: "上传 (el-upload)",
  steps: "步骤条 (el-steps)",
  overlay: "弹层 (popover/tooltip/dropdown)",
  navigation: "导航 (menu/breadcrumb)",
  feedback: "反馈 (empty/result/alert/badge)",
};

let ruleMetaById = null;

/** Markdown 明细才需要规则元数据；compact/json 路径不读取规则目录。 */
function getRuleMetaById() {
  ruleMetaById ??= Object.fromEntries(
    listRules().map((rule) => [rule.id, rule]),
  );
  return ruleMetaById;
}

function getRuleNameById() {
  const meta = getRuleMetaById();
  return Object.fromEntries(
    Object.entries(meta).map(([id, rule]) => [id, rule.title]),
  );
}

/** 严重度列取 rules.json 真值，杜绝 R01x 序号启发式失真。 */
const SEVERITY_ICONS = { error: "🔴", warning: "🟡", info: "🔵", review: "🟣" };

function severityIcon(ruleId) {
  const meta = getRuleMetaById()[ruleId];
  return meta ? SEVERITY_ICONS[meta.severity] || "⚪" : "—";
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function buildSummary(issues, fileCount) {
  const byRule = {};
  // 契约键完整初始化（wl-ui-scan.summary.v1 / compact.v2 字段不可缺），
  // 未知新级别仍会动态出现，无需在此登记。
  const bySeverity = { error: 0, warning: 0, info: 0, suggestion: 0, review: 0 };
  const byCategory = {};
  for (const i of issues) {
    byRule[i.rule] = (byRule[i.rule] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    const cat = i.category || "other";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }
  return { fileCount, total: issues.length, bySeverity, byRule, byCategory };
}

/** 从文件路径提取目录（第一级 + 第二级） */
function dirOf(filePath) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.length <= 1) return ".";
  return parts.slice(0, -1).join("/");
}

/** 提取模块目录（取 views/xxx/yyy 级别） */
function moduleOf(filePath) {
  const parts = filePath.replace(/\\/g, "/").split("/");
  // 找到 views 之后取两级
  const vi = parts.indexOf("views");
  if (vi >= 0 && parts.length > vi + 2)
    return parts.slice(vi, vi + 3).join("/");
  if (vi >= 0 && parts.length > vi + 1)
    return parts.slice(vi, vi + 2).join("/");
  // components
  const ci = parts.indexOf("components");
  if (ci >= 0 && parts.length > ci + 1)
    return parts.slice(ci, ci + 2).join("/");
  return parts.slice(0, 2).join("/");
}

/* ── section builders ────────────────────────────────────────────────── */

function buildIntegrationSection(integration) {
  if (!integration || integration.length === 0) return [];
  const lines = ["## 一、接入完整性仪表盘", ""];
  const okCount = integration.filter((c) => c.ok).length;
  lines.push(`**通过：${okCount} / ${integration.length}**`);
  lines.push("");
  lines.push("| 编号 | 检查项 | 结果 | 说明 |");
  lines.push("|------|--------|------|------|");
  for (const c of integration) {
    const icon = c.ok
      ? "✅ 通过"
      : c.severity === "error"
        ? "❌ 未通过"
        : "⚠️ 警告";
    const note = c.ok ? "—" : c.suggestion || "";
    lines.push(`| ${c.id} | ${c.description} | ${icon} | ${note} |`);
  }
  lines.push("");
  return lines;
}

function buildOverviewSection(issues, fileCount, extras) {
  const summary = buildSummary(issues, fileCount);
  const scannedFiles = fileCount - (extras.exemptFileCount || 0);
  const affectedFiles = new Set(issues.map((i) => i.file));
  const affectedDirs = new Set(issues.map((i) => dirOf(i.file)));
  const cleanFiles = scannedFiles - affectedFiles.size;
  const coverageRate =
    scannedFiles > 0 ? `${((cleanFiles / scannedFiles) * 100).toFixed(1)}%` : "未检查";

  const lines = ["## 二、扫描总览", ""];
  lines.push("| 维度 | 数量 |");
  lines.push("|------|------|");
  lines.push(`| 扫描 .vue 文件总数 | **${fileCount}** |`);
  if (extras.profile) {
    lines.push(
      `| UI Profile | **${extras.profile.id}**（${extras.profile.source || "explicit"}） |`,
    );
  }
  if (extras.changed?.requested) {
    lines.push(
      `| 增量范围 | **${extras.changed.fallback ? "full fallback" : `${extras.changed.files} changed files`}** |`,
    );
  }
  lines.push(
    `| 实际检查文件数 | **${scannedFiles}**（豁免 ${extras.exemptFileCount || 0}） |`,
  );
  lines.push(`| 涉及问题的文件数 | **${affectedFiles.size}** |`);
  lines.push(`| 涉及问题的目录数 | **${affectedDirs.size}** |`);
  lines.push(
    `| 发现问题总数 | **${summary.total}**（🔴 ${summary.bySeverity.error} / 🟡 ${summary.bySeverity.warning} / 🔵 ${summary.bySeverity.info}） |`,
  );
  lines.push(
    `| 无已报告问题文件占比 | **${coverageRate}**（${cleanFiles} / ${scannedFiles}；不代表全部规范覆盖） |`,
  );
  lines.push(`| 分类数 | **${Object.keys(summary.byCategory).length}** |`);
  if (extras.parsing) {
    const used = Object.entries(extras.parsing.used || {})
      .filter(([, count]) => count > 0)
      .map(([parser, count]) => `${parser} ${count}`)
      .join(" / ");
    lines.push(
      `| SFC 解析 | **${extras.parsing.requested}**（${used || "无文件"}） |`,
    );
  }
  lines.push("");
  return { lines, summary };
}

function buildExemptSection(extras) {
  const lines = [];
  const exemptFileCount = extras.exemptFileCount || 0;
  const exemptedIssueCount = extras.exemptedIssueCount || 0;
  const exemptPaths = extras.exemptPaths || [];
  if (
    exemptFileCount === 0 &&
    exemptedIssueCount === 0 &&
    exemptPaths.length === 0
  )
    return lines;

  lines.push("## 三、豁免统计");
  lines.push("");
  lines.push("| 维度 | 数量 |");
  lines.push("|------|------|");
  lines.push(`| 豁免文件数 | **${exemptFileCount}** |`);
  lines.push(`| 豁免问题数 | **${exemptedIssueCount}** |`);
  lines.push(`| 豁免路径规则数 | **${exemptPaths.length}** |`);
  lines.push("");
  if (exemptPaths.length > 0) {
    lines.push("豁免路径：");
    lines.push("");
    for (const p of exemptPaths) lines.push(`- \`${p}\``);
    lines.push("");
  }
  return lines;
}

function buildCategorySection(summary) {
  const lines = ["## 四、按分类统计", ""];
  lines.push("| 分类 | 说明 | 问题数 |");
  lines.push("|------|------|--------|");
  const sorted = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const label = CATEGORY_LABEL[cat] || cat;
    lines.push(`| ${cat} | ${label} | **${count}** |`);
  }
  lines.push("");
  return lines;
}

function buildRuleSection(summary) {
  if (Object.keys(summary.byRule).length === 0) return [];
  const ruleNames = getRuleNameById();
  const lines = ["## 五、按规则统计", ""];
  lines.push("| 规则 | 名称 | 严重度 | 数量 |");
  lines.push("|------|------|--------|------|");
  const sortedRules = Object.entries(summary.byRule).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [rule, count] of sortedRules) {
    const name = ruleNames[rule] || "";
    lines.push(`| ${rule} | ${name} | ${severityIcon(rule)} | **${count}** |`);
  }
  lines.push("");
  return lines;
}

function buildDirFileSection(issues) {
  const lines = ["## 六、按目录 & 文件明细", ""];

  // 按模块分组
  const byModule = {};
  for (const i of issues) {
    const mod = moduleOf(i.file);
    if (!byModule[mod]) byModule[mod] = {};
    if (!byModule[mod][i.file]) byModule[mod][i.file] = [];
    byModule[mod][i.file].push(i);
  }

  const sortedModules = Object.keys(byModule).sort();
  for (const mod of sortedModules) {
    const files = byModule[mod];
    const fileCount = Object.keys(files).length;
    const issueCount = Object.values(files).reduce(
      (s, arr) => s + arr.length,
      0,
    );
    lines.push(`### 📁 ${mod}（${fileCount} 个文件，${issueCount} 个问题）`);
    lines.push("");
    lines.push("| 文件 | 问题数 | 高危 | 中危 | 低危 | 主要规则 |");
    lines.push("|------|--------|------|------|------|----------|");

    for (const [file, fileIssues] of Object.entries(files).sort()) {
      const shortFile = file.split("/").pop();
      const sevCounts = { error: 0, warning: 0, info: 0 };
      const ruleSet = new Set();
      for (const fi of fileIssues) {
        sevCounts[fi.severity]++;
        ruleSet.add(fi.rule);
      }
      const topRules = [...ruleSet].slice(0, 3).join(", ");
      lines.push(
        `| \`${shortFile}\` | ${fileIssues.length} | ${sevCounts.error} | ${sevCounts.warning} | ${sevCounts.info} | ${topRules} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

function buildDetailSection(issues) {
  if (issues.length === 0) {
    return [
      "## 七、问题明细",
      "",
      "✅ **所有风格检查项均已通过，无需修复。**",
      "",
    ];
  }
  const lines = ["## 七、问题明细", ""];
  for (const sev of ["error", "warning", "info"]) {
    const group = issues.filter((i) => i.severity === sev);
    if (group.length === 0) continue;
    lines.push(`### ${SEVERITY_LABEL[sev]}（${group.length} 项）`);
    lines.push("");
    lines.push("| 规则 | 分类 | 文件 | 行号 | 问题描述 | 修复建议 |");
    lines.push("|------|------|------|------|----------|----------|");
    for (const i of group) {
      const shortFile = i.file.length > 60 ? "..." + i.file.slice(-55) : i.file;
      lines.push(
        `| ${i.rule} | ${i.category || "-"} | \`${shortFile}\` | ${i.line} | ${i.description} | ${i.suggestion} |`,
      );
    }
    lines.push("");
  }
  return lines;
}

function buildCoverageSection(extras) {
  const coverage = extras.coverage;
  const recommendations = extras.recommendations;
  if (!coverage && !recommendations) return [];
  const lines = ["## 八、组件覆盖与 AI 下一步建议", ""];

  if (coverage) {
    lines.push("### 组件覆盖");
    lines.push("");
    lines.push("| 类型 | 命中 |");
    lines.push("|------|------|");
    lines.push(
      `| Element Plus | ${(coverage.element || []).map((v) => `\`${v}\``).join(", ") || "—"} |`,
    );
    lines.push(
      `| Vendor 封装 | ${(coverage.vendors || []).map((v) => `\`${v}\``).join(", ") || "—"} |`,
    );
    lines.push(
      `| Layout 场景 | ${(coverage.layouts || []).map((v) => `\`${v}\``).join(", ") || "—"} |`,
    );
    lines.push(
      `| B 端业务场景 | ${(coverage.businessScenarios || []).map((v) => `\`${v}\``).join(", ") || "—"} |`,
    );
    lines.push(
      `| 推荐 Skills | ${(coverage.recommendedSkills || []).map((v) => `\`${v}\``).join(", ") || "—"} |`,
    );
    lines.push("");
  }

  if (recommendations) {
    lines.push("### 推荐流程");
    lines.push("");
    for (const flow of recommendations.recommendedFlows || []) {
      lines.push(`- \`${flow}\``);
    }
    lines.push("");
    lines.push("### 下一步");
    lines.push("");
    for (const action of recommendations.nextActions || []) {
      lines.push(`- ${action}`);
    }
    lines.push("");
    if (recommendations.kitBridge) {
      lines.push("### wl-skills-kit 桥接判断");
      lines.push("");
      lines.push(
        `- 是否建议桥接：**${recommendations.kitBridge.needed ? "是" : "否"}**`,
      );
      lines.push(`- 原因：${recommendations.kitBridge.reason}`);
      if (recommendations.kitBridge.commands?.length) {
        lines.push("- 建议命令：");
        for (const command of recommendations.kitBridge.commands) {
          lines.push(`  - \`${command}\``);
        }
      }
      lines.push("");
    }
  }

  return lines;
}

function buildFooter() {
  const lines = [];
  lines.push("## 九、快照与回滚说明");
  lines.push("");
  lines.push("`.wl-snapshot/` 是 `wl-skills-ui` 自动生成的修复前快照目录。");
  lines.push("每次执行 `wl-ui fix` 前会自动备份即将修改的文件，支持一键回退。");
  lines.push("");
  lines.push("```bash");
  lines.push("wl-ui snapshot list              # 列出所有快照");
  lines.push("wl-ui snapshot diff --id <id>    # 查看某次快照与当前差异");
  lines.push("wl-ui snapshot rollback --id <id> # 回滚到指定快照");
  lines.push("wl-ui snapshot clean --keep 3    # 仅保留最近 3 个快照");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("> 由 `wl-skills-ui` scanner 自动生成。修复前请经用户确认。");
  lines.push("> 回退命令：`npx wl-scan snapshot rollback`");
  return lines;
}

/* ── 主入口 ──────────────────────────────────────────────────────────── */

export function generateReport(
  issues,
  fileCount,
  format = "markdown",
  extras = {},
) {
  const summary = buildSummary(issues, fileCount);
  if (format === "summary") {
    const coverage = extras.coverage || {};
    const recommendations = extras.recommendations || {};
    return JSON.stringify({
      schema: "wl-ui-scan.summary.v1",
      ...extras.execution,
      profile: extras.profile || null,
      summary: {
        files: summary.fileCount,
        total: summary.total,
        bySeverity: summary.bySeverity,
        byCategory: summary.byCategory,
        byRule: summary.byRule,
      },
      skills: coverage.recommendedSkills || [],
      next: {
        flows: recommendations.recommendedFlows || [],
        actions: recommendations.nextActions || [],
      },
      changed: extras.changed || null,
      parsing: extras.parsing || null,
    });
  }

  if (format === "compact-v2") {
    const requestedLimit = Number.parseInt(extras.limit, 10);
    const requestedCursor = Number.parseInt(extras.cursor, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 500)
      : 100;
    const cursor = Number.isFinite(requestedCursor)
      ? Math.min(Math.max(requestedCursor, 0), issues.length)
      : 0;
    const pageIssues = issues.slice(cursor, cursor + limit);
    const nextCursor = cursor + pageIssues.length;
    const ruleCatalog = {};
    const issuesByFile = {};
    for (const item of pageIssues) {
      ruleCatalog[item.rule] ||= [
        item.severity,
        item.suggestion || "",
        item.category || "",
      ];
      (issuesByFile[item.file] ||= []).push([
        item.line,
        item.rule,
        item.description,
      ]);
    }
    const coverage = extras.coverage || {};
    const recommendations = extras.recommendations || {};
    return JSON.stringify({
      schema: "wl-ui-scan.compact.v2",
      ...extras.execution,
      profile: extras.profile || null,
      summary: {
        files: summary.fileCount,
        total: summary.total,
        error: summary.bySeverity.error,
        warning: summary.bySeverity.warning,
        info: summary.bySeverity.info,
        suggestion: summary.bySeverity.suggestion || 0,
        review: summary.bySeverity.review || 0,
      },
      page: {
        cursor,
        limit,
        returned: pageIssues.length,
        nextCursor: nextCursor < issues.length ? String(nextCursor) : null,
      },
      ruleCatalog,
      issuesByFile,
      skills: coverage.recommendedSkills || [],
      next: recommendations.nextActions || [],
      changed: extras.changed || null,
      parsing: extras.parsing || null,
    });
  }

  if (format === "compact" || format === "compact-json") {
    const issuesByFile = {};
    for (const item of issues) {
      (issuesByFile[item.file] ||= []).push([
        item.line,
        item.rule,
        item.severity,
        item.description,
        item.suggestion || "",
      ]);
    }
    const coverage = extras.coverage || {};
    const recommendations = extras.recommendations || {};
    return JSON.stringify({
      schema: "wl-ui-scan.compact.v1",
      ...extras.execution,
      profile: extras.profile || null,
      summary: {
        files: summary.fileCount,
        total: summary.total,
        error: summary.bySeverity.error,
        warning: summary.bySeverity.warning,
        info: summary.bySeverity.info,
        suggestion: summary.bySeverity.suggestion || 0,
        review: summary.bySeverity.review || 0,
      },
      coverage: {
        element: coverage.element || [],
        vendors: coverage.vendors || [],
        layouts: coverage.layouts || [],
        scenarios: coverage.businessScenarios || [],
      },
      skills: coverage.recommendedSkills || [],
      issuesByFile,
      integration: (extras.integration || [])
        .filter((item) => !item.ok)
        .map((item) => [
          item.id,
          item.severity,
          item.description,
          item.suggestion || "",
        ]),
      next: {
        flows: recommendations.recommendedFlows || [],
        actions: recommendations.nextActions || [],
      },
      parsing: extras.parsing || null,
    });
  }
  if (format === "json") {
    return JSON.stringify(
      {
        summary: buildSummary(issues, fileCount),
        ...extras.execution,
        profile: extras.profile || null,
        integration: extras.integration || null,
        componentCoverage: extras.coverage || null,
        recommendedSkills: extras.coverage?.recommendedSkills || [],
        recommendations: extras.recommendations || null,
        parsing: extras.parsing || null,
        issues,
      },
      null,
      2,
    );
  }
  return buildMarkdown(issues, fileCount, extras);
}

function buildMarkdown(issues, fileCount, extras = {}) {
  const lines = [];
  const ts = new Date().toISOString().slice(0, 10);

  lines.push("# UI 风格对齐扫描报告");
  lines.push("");
  lines.push(`> 生成时间：${ts}`);
  lines.push("> 工具版本：@agile-team/wl-skills-ui");
  lines.push("");
  lines.push("---");
  lines.push("");

  const hasInt = !!(extras.integration && extras.integration.length);
  const hasExempt = !!(
    extras.exemptFileCount ||
    extras.exemptedIssueCount ||
    (extras.exemptPaths && extras.exemptPaths.length)
  );

  // 一、接入完整性
  if (hasInt) lines.push(...buildIntegrationSection(extras.integration));

  // 二、扫描总览
  const { lines: overviewLines, summary } = buildOverviewSection(
    issues,
    fileCount,
    extras,
  );
  lines.push(...overviewLines);

  // 三、豁免统计
  if (hasExempt) lines.push(...buildExemptSection(extras));

  // 四、按分类统计
  if (Object.keys(summary.byCategory).length > 0)
    lines.push(...buildCategorySection(summary));

  // 五、按规则统计
  lines.push(...buildRuleSection(summary));

  // 六、按目录 & 文件明细
  if (issues.length > 0) lines.push(...buildDirFileSection(issues));

  // 七、问题明细
  lines.push(...buildDetailSection(issues));

  // 八、组件覆盖与推荐
  lines.push(...buildCoverageSection(extras));

  // 九、快照说明 & 页脚
  lines.push(...buildFooter());

  return lines.join("\n");
}
