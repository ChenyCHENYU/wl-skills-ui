import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function callMcp(message) {
  const result = spawnSync(process.execPath, [join(root, "mcp", "server.js")], {
    cwd: root,
    input: `${JSON.stringify(message)}\n`,
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

describe("stdio MCP", () => {
  it("公开低 token scan 参数", () => {
    const response = callMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.equal(response.result.tools.length, 13);
    const scan = response.result.tools.find((tool) => tool.name === "wl_ui_scan");
    assert.ok(scan);
    assert.match(scan.inputSchema.properties.output.description, /默认 compact/);
    assert.ok(scan.inputSchema.properties.changedOnly);
    assert.ok(scan.inputSchema.properties.base);
    assert.ok(scan.inputSchema.properties.parser);
    assert.ok(
      response.result.tools.some(
        (tool) => tool.name === "wl_ui_contract_extract",
      ),
    );
  });

  it("recommend-flow 可直接消费 compact scan schema", () => {
    const scanJson = JSON.stringify({
      schema: "wl-ui-scan.compact.v1",
      coverage: {
        element: ["el-table"],
        layouts: ["list-page"],
        scenarios: ["query-table"],
      },
      skills: ["element/el-table"],
      issuesByFile: {
        "views/List.vue": [
          [12, "R021", "error", "缺少 agGrid", '添加 render-type="agGrid"'],
        ],
      },
      next: { flows: ["legacy-skin-align"], actions: ["先 dry-run"] },
    });
    const response = callMcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "wl_ui_recommend_flow",
        arguments: { scanJson },
      },
    });
    const payload = JSON.parse(response.result.content[0].text);
    assert.equal(payload.kitBridge.needed, true);
    assert.deepEqual(payload.recommendedSkills, ["element/el-table"]);
    assert.ok(payload.nextActions.includes("先 dry-run"));
  });

  it("ui-contract MCP 提取结果不泄漏源码与业务文案，并可直接校验", () => {
    const extracted = callMcp({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "wl_ui_contract_extract",
        arguments: {
          path: "scanner/__tests__/fixtures/r005-pass.vue",
          domain: "test",
          parser: "fast",
          project: root,
          scenario: "actions",
        },
      },
    });
    const contractText = extracted.result.content[0].text;
    const contract = JSON.parse(contractText);
    assert.equal(contract.schema, "wl-ui-contract.v1");
    assert.doesNotMatch(contractText, /新增|搜索|重置/);

    const validated = callMcp({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "wl_ui_contract_validate",
        arguments: { contractJson: contractText },
      },
    });
    assert.equal(JSON.parse(validated.result.content[0].text).ok, true);
  });
});
