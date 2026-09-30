import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENDOR_REGISTRY_PATH = resolve(
  __dirname,
  "..",
  "skills",
  "_meta",
  "_compat",
  "vendors.json",
);

// 启动时一次性 parse + 编译 RegExp，复用整个进程生命周期；不引入运行时性能开销
const VENDOR_REGISTRY = (() => {
  const raw = JSON.parse(readFileSync(VENDOR_REGISTRY_PATH, "utf8"));
  return raw.vendors
    .filter((v) => Array.isArray(v.patterns) && v.patterns.length > 0)
    .map((v) => ({
      id: v.id,
      label: v.label,
      vendor: v.label,
      skill: v.skill,
      baseline: v.baseline || [],
      pattern: new RegExp(v.patterns.join("|"), "g"),
    }));
})();

const VENDOR_PATTERNS = VENDOR_REGISTRY;

export const ELEMENT_SKILL_MAP = Object.freeze({
  "el-table": "element/el-table",
  "el-table-column": "element/el-table",
  "el-form": "element/el-form",
  "el-form-item": "element/el-form",
  "el-input": "element/el-form",
  "el-select": "element/el-form",
  "el-date-picker": "element/el-form",
  "el-button": "layouts/list-page",
  "el-dialog": "element/el-dialog",
  "el-message-box": "element/el-dialog",
  "el-tag": "element/el-tag",
  // el-pagination 特有问题场景是弹窗分页（R011：el-pagination 不得位于
  // #footer 插槽），故路由到 el-dialog skill 而非 el-table。
  "el-pagination": "element/el-dialog",
  "el-card": "element/component-family",
  "el-tabs": "element/component-family",
  "el-tab-pane": "element/component-family",
  "el-descriptions": "element/component-family",
  "el-descriptions-item": "element/component-family",
  "el-tree": "element/component-family",
  "el-drawer": "element/component-family",
  "el-upload": "element/component-family",
  "el-steps": "element/component-family",
  "el-step": "element/component-family",
  "el-popover": "element/component-family",
  "el-tooltip": "element/component-family",
  "el-dropdown": "element/component-family",
  "el-menu": "element/component-family",
  "el-menu-item": "element/component-family",
  "el-sub-menu": "element/component-family",
  "el-breadcrumb": "element/component-family",
  "el-empty": "element/component-family",
  "el-result": "element/component-family",
  "el-alert": "element/component-family",
  "el-badge": "element/component-family",
  "el-avatar": "element/component-family",
  "el-timeline": "element/component-family",
  "el-collapse": "element/component-family",
});

// VENDOR_PATTERNS 现由 vendors.json 单一事实源驱动（见文件顶部 VENDOR_REGISTRY）

const LAYOUT_PATTERNS = [
  {
    pattern: /class=["'][^"']*list-page[^"']*["']/g,
    layout: "list-page",
    skill: "layouts/list-page",
  },
  {
    pattern: /class=["'][^"']*(tree-list|drag-col-container)[^"']*["']/g,
    layout: "tree-list",
    skill: "layouts/tree-list",
  },
  {
    pattern: /<el-dialog[\s\S]*?<el-form\b/g,
    layout: "form-dialog",
    skill: "layouts/form-dialog",
  },
  {
    pattern: /<el-descriptions\b|class=["'][^"']*detail-page[^"']*["']/g,
    layout: "detail-page",
    skill: "layouts/detail-page",
  },
];

const BUSINESS_SCENARIO_PATTERNS = [
  {
    pattern: /<el-form[\s\S]*?<el-table\b|<BaseQuery\b|<base-query\b/g,
    scenario: "query-table",
    skill: "layouts/list-page",
  },
  {
    pattern:
      /<BaseToolbar\b|<base-toolbar\b|class=["'][^"']*(toolbar|operation-bar|table-tools)[^"']*["']/g,
    scenario: "toolbar-actions",
    skill: "layouts/list-page",
  },
  {
    pattern: /<el-tree[\s\S]*?(<el-table\b|<BaseTable\b|<base-table\b)/g,
    scenario: "tree-table",
    skill: "layouts/tree-list",
  },
  {
    pattern: /<el-dialog[\s\S]*?<el-form\b/g,
    scenario: "dialog-form",
    skill: "layouts/form-dialog",
  },
  {
    pattern: /<el-drawer[\s\S]*?(<el-form\b|<el-descriptions\b)/g,
    scenario: "drawer-detail",
    skill: "layouts/detail-page",
  },
  {
    pattern:
      /<el-descriptions\b[\s\S]*?<el-card\b|<el-card\b[\s\S]*?<el-descriptions\b/g,
    scenario: "detail-card",
    skill: "layouts/detail-page",
  },
  {
    pattern: /<el-tabs[\s\S]*?(<el-table\b|<el-descriptions\b|<el-form\b)/g,
    scenario: "tab-workbench",
    skill: "element/component-family",
  },
  {
    pattern: /<el-upload\b/g,
    scenario: "attachment-upload",
    skill: "element/component-family",
  },
  {
    pattern: /<el-steps\b|<el-timeline\b/g,
    scenario: "process-flow",
    skill: "element/component-family",
  },
  {
    pattern: /<el-empty\b|<el-result\b|<el-alert\b/g,
    scenario: "feedback-state",
    skill: "element/component-family",
  },
];

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function collectElementTags(template) {
  const tags = [];
  const re = /<\/?(el-[a-z0-9-]+)/g;
  let match;
  while ((match = re.exec(template)) !== null) tags.push(match[1]);
  return tags;
}

export function createCoverageCollector() {
  const files = {};
  const element = [];
  const vendors = [];
  const layouts = [];
  const businessScenarios = [];
  const skills = [];

  function addFile(file, template, content = template) {
    const fileElement = collectElementTags(template);
    const fileVendors = [];
    const fileLayouts = [];
    const fileBusinessScenarios = [];
    const fileSkills = [];

    for (const tag of fileElement) {
      element.push(tag);
      if (ELEMENT_SKILL_MAP[tag]) {
        skills.push(ELEMENT_SKILL_MAP[tag]);
        fileSkills.push(ELEMENT_SKILL_MAP[tag]);
      }
    }

    for (const item of VENDOR_PATTERNS) {
      item.pattern.lastIndex = 0;
      if (item.pattern.test(content)) {
        vendors.push(item.vendor);
        skills.push(item.skill);
        fileVendors.push(item.vendor);
        fileSkills.push(item.skill);
      }
    }

    for (const item of LAYOUT_PATTERNS) {
      item.pattern.lastIndex = 0;
      if (item.pattern.test(template)) {
        layouts.push(item.layout);
        skills.push(item.skill);
        fileLayouts.push(item.layout);
        fileSkills.push(item.skill);
      }
    }

    for (const item of BUSINESS_SCENARIO_PATTERNS) {
      item.pattern.lastIndex = 0;
      if (item.pattern.test(template)) {
        businessScenarios.push(item.scenario);
        skills.push(item.skill);
        fileBusinessScenarios.push(item.scenario);
        fileSkills.push(item.skill);
      }
    }

    files[file] = {
      element: uniqueSorted(fileElement),
      vendors: uniqueSorted(fileVendors),
      layouts: uniqueSorted(fileLayouts),
      businessScenarios: uniqueSorted(fileBusinessScenarios),
      recommendedSkills: uniqueSorted(fileSkills),
    };
  }

  function result() {
    return {
      element: uniqueSorted(element),
      vendors: uniqueSorted(vendors),
      layouts: uniqueSorted(layouts),
      businessScenarios: uniqueSorted(businessScenarios),
      recommendedSkills: uniqueSorted(skills),
      files,
    };
  }

  return { addFile, result };
}

export function filterCoverageForProfile(coverage, profile) {
  if (!profile) return coverage;
  const adapters = new Set(profile.adapters || []);
  const disallowedVendorSkills = new Set(
    VENDOR_REGISTRY.filter((vendor) => !adapters.has(vendor.id)).map(
      (vendor) => vendor.skill,
    ),
  );
  const filterSkills = (skills = []) =>
    skills.filter((skill) => !disallowedVendorSkills.has(skill));
  const files = Object.fromEntries(
    Object.entries(coverage.files || {}).map(([file, item]) => [
      file,
      { ...item, recommendedSkills: filterSkills(item.recommendedSkills) },
    ]),
  );
  return {
    ...coverage,
    recommendedSkills: filterSkills(coverage.recommendedSkills),
    unsupportedVendors: VENDOR_REGISTRY.filter(
      (vendor) =>
        !adapters.has(vendor.id) &&
        (coverage.vendors || []).includes(vendor.label),
    ).map((vendor) => vendor.label),
    files,
  };
}

export function recommendFlows({ issues = [], coverage = {}, profile } = {}) {
  const categories = new Set(issues.map((i) => i.category));
  const rules = new Set(issues.map((i) => i.rule));
  const flows = [];
  const nextActions = [];

  if (issues.length === 0) {
    flows.push("full-audit");
    nextActions.push(
      "保持 wl-skills-ui 样式入口，定期运行 wl_ui_scan 做只读审计",
    );
  } else {
    flows.push(profile?.mode === "skin" ? "legacy-skin-align" : "full-audit");
    nextActions.push(
      `先运行 wl_ui_scan --profile ${profile?.id || "native-element"} --output summary 确认问题范围`,
    );
    nextActions.push(
      "修复前运行 wl_ui_fix_dry_run 预览改动，不直接写入业务文件",
    );
  }

  if (
    categories.has("color") ||
    categories.has("token") ||
    categories.has("style")
  ) {
    flows.push("progressive-migrate");
    nextActions.push(
      "将硬编码颜色迁移到 runtime/design-tokens 或 Element Plus token",
    );
  }

  if (rules.has("R013") || rules.has("R021") || rules.has("R022")) {
    flows.push("progressive-migrate");
    nextActions.push(
      "表格列定义建议升级为 defineColumns + renderOps，并补齐 BaseTable render-type/cid",
    );
  }

  if (coverage.businessScenarios?.length > 0) {
    nextActions.push(
      `已识别 B 端业务场景：${coverage.businessScenarios.join(", ")}，建议按场景加载对应 layout/element Skill 做统一治理`,
    );
  }

  const shouldUseKit =
    rules.has("R013") ||
    rules.has("R021") ||
    rules.has("R022") ||
    coverage.layouts?.length > 0 ||
    (coverage.businessScenarios || []).some((item) =>
      ["query-table", "tree-table", "dialog-form"].includes(item),
    );
  return {
    recommendedFlows: uniqueSorted(flows),
    nextActions: uniqueSorted(nextActions),
    kitBridge: {
      needed: shouldUseKit,
      reason: shouldUseKit
        ? "扫描结果涉及页面结构、BaseTable 或操作列规范，建议在视觉统一后使用 wl-skills-kit 做规范化生成/修复。"
        : "当前更适合由 wl-skills-ui 先完成样式绝对管控，无需强制切换到 wl-skills-kit。",
      commands: shouldUseKit
        ? ["wl-skills validate-page <page>", "wl-skills doctor-ui <project>"]
        : [],
    },
  };
}
