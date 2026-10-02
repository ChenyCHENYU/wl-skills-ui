import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { findUnknownCompositeRoots } from "../rules/componentStructure.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const registry = JSON.parse(
  readFileSync(join(root, "standards", "component-structures.json"), "utf8"),
);

function openFixture(relativePath) {
  const window = new Window();
  window.document.body.innerHTML = readFileSync(join(root, relativePath), "utf8");
  return window;
}

describe("复合控件结构清单", () => {
  it("自定义 inline stepper 作为未知复合控件进入人工结构审查", () => {
    const findings = findUnknownCompositeRoots(`
      <div class="heat-inline-stepper">
        <el-input />
        <button>上</button><button>下</button>
      </div>
    `);
    assert.equal(findings.length, 1);
    assert.equal(
      findUnknownCompositeRoots('<div class="wizard-stepper"><el-input /></div>').length,
      0,
      "普通步骤容器没有双按钮时不应被误报",
    );
  });
  it("ID 唯一且每项都声明结构所有者、高度策略、状态和 fixture", () => {
    const ids = new Set();
    for (const contract of registry.contracts) {
      assert.ok(!ids.has(contract.id), `重复结构契约：${contract.id}`);
      ids.add(contract.id);
      assert.ok(contract.vendor, `${contract.id} 缺少 vendor`);
      assert.ok(contract.family, `${contract.id} 缺少 family`);
      assert.ok(contract.rootSelector, `${contract.id} 缺少 rootSelector`);
      assert.ok(contract.ownerSelector, `${contract.id} 缺少 ownerSelector`);
      assert.ok(contract.fixture, `${contract.id} 缺少 fixture`);
      assert.ok(contract.source, `${contract.id} 缺少 source`);
      assert.ok(contract.risk, `${contract.id} 缺少 risk`);
      assert.ok(
        registry.heightPolicies.includes(contract.heightPolicy),
        `${contract.id} 使用了未知高度策略 ${contract.heightPolicy}`,
      );
      assert.ok(contract.states.length >= 3, `${contract.id} 状态覆盖不足`);
      assert.ok(contract.knownRootClasses.length > 0, `${contract.id} 缺少稳定根 class`);
    }
  });

  for (const contract of registry.contracts) {
    it(`${contract.id} 的 fixture 与声明结构一致`, () => {
      const window = openFixture(contract.fixture);
      const { document } = window;
      const roots = document.querySelectorAll(contract.rootSelector);
      const owners = document.querySelectorAll(contract.ownerSelector);

      assert.equal(roots.length, 1, `${contract.id} root 必须唯一`);
      assert.equal(owners.length, 1, `${contract.id} owner 必须唯一`);

      for (const selector of contract.innerBorderlessSelectors || []) {
        assert.ok(
          document.querySelector(selector),
          `${contract.id} 缺少内部无描边层：${selector}`,
        );
      }
      for (const selector of contract.portalSelectors || []) {
        assert.ok(
          document.querySelector(selector),
          `${contract.id} 缺少 Teleport 出口：${selector}`,
        );
      }

      const targets = {
        root: document.querySelector('[data-contract-role="root"]'),
        owner:
          document.querySelector('[data-contract-role="owner"]') || roots[0],
        inner: document.querySelector('[data-contract-role="inner"]'),
      };
      for (const assertion of contract.assertions || []) {
        const target = targets[assertion.target];
        assert.ok(target, `${contract.id} fixture 缺少 ${assertion.target} target`);
        assert.equal(
          target.matches(assertion.selector),
          assertion.matches,
          `${contract.id} ${assertion.target} 对 ${assertion.selector} 分类错误`,
        );
      }

      window.close();
    });
  }
});
