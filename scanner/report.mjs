/**
 * 报告生成器 — 支持 markdown / json 两种输出格式
 *
 * v2 新增：
 *   - integration 接入完整性仪表盘（顶部）
 *   - 按规则覆盖率统计
 */

const SEVERITY_LABEL = { error: '🔴 高危', warning: '🟡 中危', info: '🔵 低危' };

const RULE_NAME = {
  R001: 'el-table-column 缺少 align="center"',
  R002: "el-table 缺少 empty-text",
  R003: "BaseTable 缺少 empty-text",
  R004: "操作列使用文字 el-button",
  R005: "工具栏 el-button 缺少 icon",
  R006: 'el-input/el-select 缺少 size="small"',
  R007: "el-date-picker 缺少 width:100%",
  R008: "el-form labelWidth 偏小",
  R009: "状态字段纯文本渲染（应使用 renderTagNode/ElTag）",
  R010: '分类字段 ElTag 未使用 effect="plain"',
  R011: "pagination 在 #footer 内（位置错误）",
  R012: "弹窗内 el-table 缺少 empty-text",
  R013: "columnsDef 旧格式 operations: []",
  R014: "selection 列缺少 header-align",
  R015: "弹窗嵌套表格用 el-button link",
  R016: "<style> 块硬编码 hex 颜色",
  R017: "<template> 内硬编码 hex 颜色",
  R018: "<script> 块硬编码 hex 颜色",
};

export function generateReport(issues, fileCount, format = 'markdown', extras = {}) {
  if (format === 'json') {
    return JSON.stringify({
      summary: buildSummary(issues, fileCount),
      integration: extras.integration || null,
      issues
    }, null, 2);
  }
  return buildMarkdown(issues, fileCount, extras);
}

function buildSummary(issues, fileCount) {
  const byRule = {};
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const i of issues) {
    byRule[i.rule] = (byRule[i.rule] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  }
  return { fileCount, total: issues.length, bySeverity, byRule };
}

function buildIntegrationSection(integration) {
  if (!integration || integration.length === 0) return [];
  const lines = ['## 一、接入完整性仪表盘', ''];
  const okCount = integration.filter(c => c.ok).length;
  lines.push(`**通过：${okCount} / ${integration.length}**`);
  lines.push('');
  for (const c of integration) {
    const icon = c.ok ? '✅' : c.severity === 'error' ? '❌' : '⚠️';
    lines.push(`- ${icon} **${c.id}** — ${c.description}`);
    if (!c.ok && c.suggestion) lines.push(`  - 建议：${c.suggestion}`);
  }
  lines.push('');
  return lines;
}

function buildMarkdown(issues, fileCount, extras = {}) {
  const summary = buildSummary(issues, fileCount);
  const lines = [];
  const hasInt = !!(extras.integration && extras.integration.length);

  lines.push('# UI 风格对齐扫描报告');
  lines.push('');

  if (hasInt) lines.push(...buildIntegrationSection(extras.integration));

  lines.push(`## ${hasInt ? '二、' : ''}风格扫描摘要`);
  lines.push(`- 扫描文件数：**${fileCount}**`);
  lines.push(`- 发现问题数：**${summary.total}**（高危 ${summary.bySeverity.error} / 中危 ${summary.bySeverity.warning} / 低危 ${summary.bySeverity.info}）`);
  lines.push('');

  if (Object.keys(summary.byRule).length > 0) {
    lines.push(`## ${hasInt ? '三、' : ''}按规则统计`);
    lines.push('');
    lines.push('| 规则 | 名称 | 数量 |');
    lines.push('|---|---|---|');
    const sortedRules = Object.entries(summary.byRule).sort((a, b) => b[1] - a[1]);
    for (const [rule, count] of sortedRules) {
      lines.push(`| ${rule} | ${RULE_NAME[rule] || ''} | ${count} |`);
    }
    lines.push('');
  }

  if (issues.length === 0) {
    lines.push('✅ **所有风格检查项均已通过，无需修复。**');
    return lines.join('\n');
  }

  lines.push(`## ${hasInt ? '四、' : ''}问题明细`);
  lines.push('');
  for (const sev of ['error', 'warning', 'info']) {
    const group = issues.filter(i => i.severity === sev);
    if (group.length === 0) continue;
    lines.push(`### ${SEVERITY_LABEL[sev]}（${group.length} 项）`);
    lines.push('');
    lines.push('| 规则 | 文件 | 行号 | 问题描述 | 修复建议 |');
    lines.push('|---|---|---|---|---|');
    for (const i of group) {
      lines.push(`| ${i.rule} | \`${i.file}\` | ${i.line} | ${i.description} | ${i.suggestion} |`);
    }
    lines.push('');
  }

  lines.push(`## ${hasInt ? '五、' : ''}按文件汇总`);
  lines.push('');
  const byFile = {};
  for (const i of issues) {
    if (!byFile[i.file]) byFile[i.file] = [];
    byFile[i.file].push(i);
  }
  for (const [file, fileIssues] of Object.entries(byFile).sort()) {
    const counts = fileIssues.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1; return acc;
    }, {});
    const tag = counts.error ? '🔴' : counts.warning ? '🟡' : '🔵';
    lines.push(`${tag} \`${file}\` — ${fileIssues.length} 项问题`);
  }

  lines.push('');
  lines.push('---');
  lines.push('> 由 wk-skills-ui scanner 生成。修复前请经用户确认（参见 SKILL.md Phase 3）。');
  return lines.join('\n');
}
