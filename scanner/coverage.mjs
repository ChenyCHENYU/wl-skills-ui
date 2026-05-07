const ELEMENT_SKILL_MAP = {
  "el-table": "element/el-table",
  "el-table-column": "element/el-table",
  "el-form": "element/el-form",
  "el-form-item": "element/el-form",
  "el-input": "element/el-form",
  "el-select": "element/el-form",
  "el-date-picker": "element/el-form",
  "el-button": "element/el-button",
  "el-dialog": "element/el-dialog",
  "el-message-box": "element/el-dialog",
  "el-tag": "element/el-tag",
  "el-pagination": "element/el-pagination",
  "el-card": "element/el-card",
  "el-tabs": "element/el-tabs",
  "el-tab-pane": "element/el-tabs",
  "el-descriptions": "element/el-descriptions",
  "el-descriptions-item": "element/el-descriptions",
  "el-tree": "element/el-tree",
  "el-drawer": "element/el-drawer",
  "el-upload": "element/el-upload",
  "el-steps": "element/el-steps",
  "el-step": "element/el-steps",
  "el-popover": "element/el-overlay",
  "el-tooltip": "element/el-overlay",
  "el-dropdown": "element/el-overlay",
  "el-menu": "element/el-navigation",
  "el-menu-item": "element/el-navigation",
  "el-sub-menu": "element/el-navigation",
  "el-breadcrumb": "element/el-navigation",
  "el-empty": "element/el-feedback",
  "el-result": "element/el-feedback",
  "el-alert": "element/el-feedback",
  "el-badge": "element/el-feedback",
  "el-avatar": "element/el-feedback",
  "el-timeline": "element/el-feedback",
  "el-collapse": "element/el-feedback",
};

const VENDOR_PATTERNS = [
  {
    pattern: /<\/?Base[A-Z][\w-]*/g,
    vendor: "Base*",
    skill: "vendors/base-table",
  },
  {
    pattern: /<\/?base-[\w-]+/g,
    vendor: "base-*",
    skill: "vendors/base-table",
  },
  { pattern: /<\/?jh-[\w-]+/g, vendor: "jh-*", skill: "vendors/jh-components" },
  { pattern: /<\/?C_[\w-]+/g, vendor: "C_*", skill: "vendors/c-components" },
  { pattern: /<\/?c-[\w-]+/g, vendor: "c-*", skill: "vendors/c-components" },
  {
    pattern: /ag-grid|agGrid|\.ag-root-wrapper/g,
    vendor: "AG Grid",
    skill: "vendors/ag-grid",
  },
];

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

export function recommendFlows({ issues = [], coverage = {} } = {}) {
  const categories = new Set(issues.map((i) => i.category));
  const rules = new Set(issues.map((i) => i.rule));
  const flows = [];
  const nextActions = [];

  if (issues.length === 0) {
    flows.push("full-audit");
    nextActions.push(
      "保持 wk-skills-ui 样式入口，定期运行 wks_ui_scan 做只读审计",
    );
  } else {
    flows.push("legacy-skin-align");
    nextActions.push("先运行 wks_ui_scan --mode skin 确认 L0/L1/L2 样式偏差");
    nextActions.push(
      "修复前运行 wks_ui_fix_dry_run 预览改动，不直接写入业务文件",
    );
  }

  if (categories.has("color") || categories.has("token")) {
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
        : "当前更适合由 wk-skills-ui 先完成样式绝对管控，无需强制切换到 wl-skills-kit。",
      commands: shouldUseKit
        ? ["wl-skills validate-page <page>", "wl-skills doctor-ui <project>"]
        : [],
    },
  };
}
