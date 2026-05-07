import { lineOf, issue, findTags } from "./_shared.mjs";

function hasAttr(tagText, attr) {
  return new RegExp(`\\s:?${attr}\\s*=`).test(tagText);
}

function hasClassLike(template, names) {
  return names.some((name) => new RegExp(`class=["'][^"']*${name}[^"']*["']`).test(template));
}

export const componentFamilyRules = [
  {
    id: "R031",
    category: "card",
    severity: "info",
    name: "详情/统计卡片建议使用统一场景 class",
    check(template, file, lineOffset) {
      const issues = [];
      if (hasClassLike(template, ["detail-card", "stat-card", "wk-card"])) return issues;
      for (const tag of findTags(template, "el-card")) {
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R031",
            "card",
            "info",
            "el-card 未标识业务场景 class，跨项目卡片密度和标题区可能不一致",
            "建议按场景添加 detail-card/stat-card/wk-card，或确认已加载 wk-skills-ui Element 样式覆盖",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R032",
    category: "tabs",
    severity: "info",
    name: "el-tabs 建议明确页面场景",
    check(template, file, lineOffset) {
      const issues = [];
      if (hasClassLike(template, ["detail-tabs", "config-tabs", "wk-tabs"])) return issues;
      for (const tag of findTags(template, "el-tabs")) {
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R032",
            "tabs",
            "info",
            "el-tabs 未标识 detail/config 等业务场景，复杂详情页 Tab 风格可能漂移",
            "建议添加 detail-tabs/config-tabs/wk-tabs，或通过 wk-skills-ui tabs 覆盖层统一视觉",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R033",
    category: "descriptions",
    severity: "info",
    name: "el-descriptions 建议使用 bordered 或统一容器",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-descriptions")) {
        if (hasAttr(tag.text, "border") || hasClassLike(template, ["detail-page", "detail-card"])) continue;
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R033",
            "descriptions",
            "info",
            "el-descriptions 未使用 border/bordered，也未处于统一详情容器，字段展示易出现视觉不齐",
            "建议添加 border 或放入 detail-page/detail-card，并加载 wk-skills-ui descriptions 覆盖层",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R034",
    category: "drawer",
    severity: "warning",
    name: "el-drawer 建议明确 size",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-drawer")) {
        if (hasAttr(tag.text, "size")) continue;
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R034",
            "drawer",
            "warning",
            "el-drawer 未明确 size，不同页面抽屉宽度可能不统一",
            "建议按场景设置 size，例如详情 480px、编辑 560px，或通过业务 preset 统一",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R035",
    category: "upload",
    severity: "warning",
    name: "el-upload 建议配置 tip/限制说明",
    check(template, file, lineOffset) {
      const issues = [];
      const hasTip = /el-upload__tip|#tip|<template\s+#tip\b/.test(template);
      for (const tag of findTags(template, "el-upload")) {
        if (hasTip || hasAttr(tag.text, "limit") || hasAttr(tag.text, "accept")) continue;
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R035",
            "upload",
            "warning",
            "el-upload 未提供上传限制或提示说明，附件场景交互不完整",
            "建议配置 accept/limit，并补充 el-upload__tip 或 #tip 说明",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R036",
    category: "steps",
    severity: "info",
    name: "el-steps 审批/流程建议明确状态来源",
    check(template, file, lineOffset) {
      const issues = [];
      for (const tag of findTags(template, "el-steps")) {
        if (hasAttr(tag.text, "active") || hasAttr(tag.text, "process-status") || hasAttr(tag.text, "finish-status")) continue;
        issues.push(
          issue(
            file,
            lineOf(template, tag.index, lineOffset),
            "R036",
            "steps",
            "info",
            "el-steps 未配置 active/process-status/finish-status，流程状态表达可能不稳定",
            "建议绑定 active 并明确 process-status/finish-status",
          ),
        );
      }
      return issues;
    },
  },
  {
    id: "R037",
    category: "feedback",
    severity: "info",
    name: "空/异常反馈建议统一操作入口",
    check(template, file, lineOffset) {
      const issues = [];
      const feedbackTags = ["el-empty", "el-result", "el-alert"];
      for (const tagName of feedbackTags) {
        for (const tag of findTags(template, tagName)) {
          if (/#default|#extra|<el-button\b/.test(template)) continue;
          issues.push(
            issue(
              file,
              lineOf(template, tag.index, lineOffset),
              "R037",
              "feedback",
              "info",
              `${tagName} 未提供统一操作入口，空/异常状态可恢复性不足`,
              "建议根据业务补充操作按钮或 extra/default slot，并加载 wk-skills-ui feedback 覆盖层",
            ),
          );
        }
      }
      return issues;
    },
  },
];
