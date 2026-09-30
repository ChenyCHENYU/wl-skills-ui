import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { getRules, normalizeIssue } from "./rules/index.mjs";
import {
  createCoverageCollector,
  filterCoverageForProfile,
  recommendFlows,
} from "./coverage.mjs";
import { loadExemptConfig } from "./exempt.mjs";
import { collectChangedVueFiles } from "./changed.mjs";
import { parseVueSfc, SFC_PARSER_MODES } from "./sfc-parser.mjs";
import { resolveProjectProfile } from "../standards/profiles-loader.mjs";

export function expandRuleRange(input = "") {
  const set = new Set();
  for (const part of input.split(",").map((value) => value.trim()).filter(Boolean)) {
    const match = part.match(/^(R)(\d+)-(R)?(\d+)$/i);
    if (!match) {
      set.add(part.toUpperCase());
      continue;
    }
    const start = Number.parseInt(match[2], 10);
    const end = Number.parseInt(match[4], 10);
    for (let id = Math.min(start, end); id <= Math.max(start, end); id++) {
      set.add(`R${String(id).padStart(3, "0")}`);
    }
  }
  return set;
}

/**
 * 递归收集 .vue 文件（目录名排序稳定遍历；target 为单个 .vue 文件时直接返回）。
 * 扫描与修复共用，保证两边看到同一文件集合。
 */
export function* walkVue(target, excludes) {
  if (!existsSync(target)) throw new Error(`扫描目标不存在：${target}`);
  if (statSync(target).isFile()) {
    if (target.endsWith(".vue")) yield target;
    return;
  }
  const entries = readdirSync(target, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    const full = join(target, entry.name);
    if (entry.isDirectory()) {
      if (!excludes.includes(entry.name)) yield* walkVue(full, excludes);
    } else if (entry.name.endsWith(".vue")) {
      yield full;
    }
  }
}

export function scanFiles({
  targetDir,
  excludeDirs = ["node_modules", "dist", ".git"],
  exemptConfig,
  fileFilter = null,
  parser = "auto",
  projectRoot = ".",
  rules,
  profile,
}) {
  if (!SFC_PARSER_MODES.includes(parser)) {
    throw new Error(`--parser 仅支持 ${SFC_PARSER_MODES.join(" / ")}，当前为 ${parser}`);
  }
  const allIssues = [];
  const exemptedIssues = [];
  let fileCount = 0;
  let exemptFileCount = 0;
  const exempt = exemptConfig || { isExempt: () => false, exemptPaths: [] };
  const coverage = createCoverageCollector();
  const parserCounts = { fast: 0, sfc: 0 };
  const parserWarnings = new Set();

  for (const filePath of walkVue(targetDir, excludeDirs)) {
    if (fileFilter && !fileFilter.has(resolve(filePath))) continue;
    fileCount++;
    const content = readFileSync(filePath, "utf8");
    // 报告、豁免和 changed-only 必须共享“项目根相对路径”。以 target 为基准时，
    // `--target src` 无法命中 `src/**` 豁免，扫描单文件还会得到空文件名。
    const relPath = relative(resolve(projectRoot), filePath).replace(/\\/g, "/");
    const parsed = parseVueSfc(content, {
      filename: relPath,
      mode: parser,
      projectRoot,
    });
    parserCounts[parsed.parser] += 1;
    for (const warning of parsed.warnings) parserWarnings.add(warning);
    const { text: template, lineOffset } = parsed.template;
    coverage.addFile(relPath, template, content);

    if (exempt.isExempt(relPath)) {
      exemptFileCount++;
      continue;
    }

    const fileIssues = [];
    for (const rule of rules) {
      if (typeof rule.check === "function") {
        fileIssues.push(
          ...rule.check(template, relPath, lineOffset).map(normalizeIssue),
        );
      }
    }
    for (const styleBlock of parsed.styles) {
      for (const rule of rules) {
        if (typeof rule.checkStyle === "function") {
          fileIssues.push(
            ...rule
              .checkStyle(styleBlock.text, relPath, styleBlock.lineOffset)
              .map(normalizeIssue),
          );
        }
      }
    }
    for (const scriptBlock of parsed.scripts) {
      for (const rule of rules) {
        if (typeof rule.checkScript === "function") {
          fileIssues.push(
            ...rule
              .checkScript(scriptBlock.text, relPath, scriptBlock.lineOffset)
              .map(normalizeIssue),
          );
        }
      }
    }
    for (const issue of fileIssues) {
      if (exempt.isExempt(relPath, issue.rule)) {
        exemptedIssues.push({ ...issue, exempted: true });
      } else {
        allIssues.push(issue);
      }
    }
  }

  return {
    allIssues,
    exemptedIssues,
    fileCount,
    exemptFileCount,
    coverage: filterCoverageForProfile(coverage.result(), profile),
    parsing: {
      requested: parser,
      used: parserCounts,
      warnings: [...parserWarnings],
    },
  };
}

export function filterIssues(issues, { layer, vendor, mode, only, skip } = {}) {
  let output = issues;
  if (layer) {
    const allowed = new Set(layer.split(",").map((value) => value.trim()));
    output = output.filter((issue) => allowed.has(issue.layer));
  }
  if (vendor) {
    const allowed = new Set(vendor.split(",").map((value) => value.trim()));
    output = output.filter(
      (issue) => issue.vendor && allowed.has(issue.vendor),
    );
  }
  if (mode === "skin") {
    output = output.filter((issue) => ["L0", "L1", "L2"].includes(issue.layer));
  }
  if (only) {
    const allowed = expandRuleRange(only);
    output = output.filter((issue) => allowed.has(issue.rule));
  }
  if (skip) {
    const denied = expandRuleRange(skip);
    output = output.filter((issue) => !denied.has(issue.rule));
  }
  return output;
}

export function scanProject(options = {}) {
  const projectRoot = resolve(options.projectRoot || options.project || ".");
  const targetDir = resolve(projectRoot, options.target || "src");
  const changedFallback = options.changedFallback || "error";
  if (!["error", "full"].includes(changedFallback)) {
    throw new Error(`changedFallback 仅支持 error / full，当前为 ${changedFallback}`);
  }
  const profileResolution = resolveProjectProfile({
    projectRoot,
    profile: options.profile,
    mode: options.mode,
  });
  const profile = profileResolution.profile;
  const rules = getRules({ profile: profile.id });
  let fileFilter = null;
  let changed = { requested: false, fallback: false };
  if (options.changedOnly || options.changed) {
    const result = collectChangedVueFiles({
      projectRoot,
      targetDir,
      base: options.base || "HEAD",
    });
    if (result.fallback) {
      changed = { requested: true, fallback: true, reason: result.reason };
      if (changedFallback === "error") {
        throw new Error(`增量范围解析失败：${result.reason}`);
      }
    } else {
      fileFilter = result.files;
      changed = {
        requested: true,
        fallback: false,
        files: result.files.size,
        base: options.base || "HEAD",
      };
    }
  }
  const scanned = scanFiles({
    targetDir,
    excludeDirs: options.excludeDirs || ["node_modules", "dist", ".git"],
    exemptConfig: loadExemptConfig(projectRoot, options.exempt),
    fileFilter,
    parser: options.parser || "auto",
    projectRoot,
    rules,
    profile,
  });
  const issues = filterIssues(scanned.allIssues, options);
  return {
    ...scanned,
    issues,
    targetDir,
    projectRoot,
    profile,
    profileSource: profileResolution.source,
    changed,
    recommendations: recommendFlows({
      issues,
      coverage: scanned.coverage,
      profile,
    }),
  };
}
