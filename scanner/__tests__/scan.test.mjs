/**
 * scanner/__tests__/scan.test.mjs — scanner 规则 fixture 测试
 *
 * 用法：node --test scanner/__tests__/scan.test.mjs
 *
 * 约定：fixtures/<ruleId>-pass.vue → 0 violations of that rule
 *       fixtures/<ruleId>-fail.vue → ≥1 violations of that rule
 *
 * 每条测试只断言对应 rule 的命中数，不受其他规则干扰。
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getRules } from "../rules/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures");
const rules = getRules();

/**
 * 简易单文件扫描：跑所有规则，返回 issues 数组
 */
function scanFixture(filename) {
  const content = readFileSync(join(FIXTURES, filename), "utf8");
  const issues = [];

  // extract template
  const tmplMatch = content.match(/(<template[^>]*>)([\s\S]*?)(<\/template>)/);
  const template = tmplMatch ? tmplMatch[0] : content;
  const tmplOffset = tmplMatch
    ? content.slice(0, content.indexOf(tmplMatch[0])).split("\n").length - 1
    : 0;

  // extract style
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const styleBlock = styleMatch ? styleMatch[1] : null;
  const styleOffset = styleMatch
    ? content.slice(0, content.indexOf(styleMatch[0])).split("\n").length
    : 0;

  // extract script
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const scriptBlock = scriptMatch ? scriptMatch[1] : null;
  const scriptOffset = scriptMatch
    ? content.slice(0, content.indexOf(scriptMatch[0])).split("\n").length
    : 0;

  for (const rule of rules) {
    if (typeof rule.check === "function") {
      issues.push(...rule.check(template, filename, tmplOffset));
    }
    if (styleBlock && typeof rule.checkStyle === "function") {
      issues.push(...rule.checkStyle(styleBlock, filename, styleOffset));
    }
    if (scriptBlock && typeof rule.checkScript === "function") {
      issues.push(...rule.checkScript(scriptBlock, filename, scriptOffset));
    }
  }
  return issues;
}

// ── 自动发现 fixtures 并生成测试 ────────────────────────────────────────────
const fixtureFiles = readdirSync(FIXTURES).filter((f) => f.endsWith(".vue"));
const grouped = new Map(); // ruleId → { pass: [], fail: [] }

for (const f of fixtureFiles) {
  const m = f.match(/^(r\d+)-(pass|fail)\.vue$/i);
  if (!m) continue;
  const ruleId = m[1].toUpperCase();
  const kind = m[2]; // pass | fail
  if (!grouped.has(ruleId)) grouped.set(ruleId, { pass: [], fail: [] });
  grouped.get(ruleId)[kind].push(f);
}

for (const [ruleId, { pass, fail }] of grouped) {
  describe(ruleId, () => {
    for (const f of pass) {
      it(`${f} → 0 violations`, () => {
        const issues = scanFixture(f).filter((i) => i.rule === ruleId);
        assert.equal(
          issues.length,
          0,
          `Expected 0 ${ruleId} issues but got ${issues.length}: ${JSON.stringify(issues, null, 2)}`,
        );
      });
    }
    for (const f of fail) {
      it(`${f} → ≥1 violations`, () => {
        const issues = scanFixture(f).filter((i) => i.rule === ruleId);
        assert.ok(issues.length > 0, `Expected ≥1 ${ruleId} issues but got 0`);
      });
    }
  });
}

// ── drift 模块测试 ──────────────────────────────────────────────────────────
const { drift } = await import("../drift.mjs");

describe("drift", () => {
  it("identical → 0 gained, 0 fixed", () => {
    const data = { issues: [{ file: "a.vue", rule: "R001" }] };
    const r = drift(data, data);
    assert.equal(r.gained.count, 0);
    assert.equal(r.fixed.count, 0);
    assert.equal(r.netDelta, 0);
  });

  it("new issues → gained > 0", () => {
    const base = { issues: [] };
    const cur = { issues: [{ file: "a.vue", rule: "R001" }] };
    const r = drift(base, cur);
    assert.equal(r.gained.count, 1);
    assert.equal(r.fixed.count, 0);
  });

  it("removed issues → fixed > 0", () => {
    const base = { issues: [{ file: "a.vue", rule: "R001" }] };
    const cur = { issues: [] };
    const r = drift(base, cur);
    assert.equal(r.gained.count, 0);
    assert.equal(r.fixed.count, 1);
  });

  it("mixed → both gained and fixed", () => {
    const base = {
      issues: [
        { file: "a.vue", rule: "R001" },
        { file: "a.vue", rule: "R001" },
        { file: "b.vue", rule: "R016" },
      ],
    };
    const cur = {
      issues: [
        { file: "a.vue", rule: "R001" },
        { file: "c.vue", rule: "R017" },
        { file: "c.vue", rule: "R017" },
      ],
    };
    const r = drift(base, cur);
    assert.equal(r.gained.count, 2); // c.vue R017 ×2
    assert.equal(r.fixed.count, 2); // a.vue R001 ×1 + b.vue R016 ×1
  });
});
