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
    // MCP server 冷启动需加载完整 scanner 引擎；全量套件并发 + 覆盖率
    // 插桩下首次冷启可能超过 5s（Windows 本机实测），给足负载余量防 flaky。
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

describe("stdio MCP", () => {
  it("公开低 token scan 参数", () => {
    const response = callMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    assert.equal(response.result.tools.length, 18);
    const scan = response.result.tools.find((tool) => tool.name === "wl_ui_scan");
    assert.ok(scan);
    assert.ok(scan.outputSchema.properties.receiptPath);
    assert.ok(response.result.tools.find((tool) => tool.name === "wl_ui_status").outputSchema.properties.notice);
    assert.match(scan.inputSchema.properties.output.description, /默认 summary/);
    assert.ok(scan.inputSchema.properties.changedOnly);
    assert.match(scan.inputSchema.properties.changedOnly.description, /当前所选规则支持的源码文件/);
    assert.doesNotMatch(scan.inputSchema.properties.changedOnly.description, /变更 Vue 文件/);
    assert.match(scan.inputSchema.properties.only.description, /当前规则目录.*ID 或范围/);
    assert.doesNotMatch(scan.inputSchema.properties.only.description, /R\d+-R\d+/);
    assert.ok(scan.inputSchema.properties.base);
    assert.ok(scan.inputSchema.properties.parser);
    assert.ok(scan.inputSchema.properties.profile);
    assert.ok(scan.inputSchema.properties.limit);
    assert.ok(scan.inputSchema.properties.changedFallback);
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
    const payload = response.result.structuredContent;
    assert.equal(payload.kitBridge.needed, true);
    assert.deepEqual(payload.recommendedSkills, ["element/el-table"]);
    assert.ok(payload.nextActions.includes("先 dry-run"));
  });

  it("scan 默认直接返回 summary 并报告 profile", () => {
    const response = callMcp({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "wl_ui_scan",
        arguments: {
          project: root,
          target: "scanner/__tests__/fixtures",
          profile: "native-element",
        },
      },
    });
    assert.equal(response.result.isError, false);
    const result = response.result.structuredContent;
    assert.equal(result.schema, "wl-ui-scan.summary.v1");
    assert.equal(result.profile.id, "native-element");
    assert.ok(!result.skills.includes("vendors/ag-grid"));
  });

  it("scan 拒绝越过 MCP 项目边界", () => {
    const response = callMcp({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: {
        name: "wl_ui_scan",
        arguments: { target: "..", profile: "native-element" },
      },
    });
    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /target 必须位于项目根目录内/);
  });

  it("scan 的 Markdown 保持原文本块，同时提供同次结构化回执", () => {
    const response = callMcp({ jsonrpc: "2.0", id: 13, method: "tools/call", params: {
      name: "wl_ui_scan", arguments: { target: "scanner/__tests__/fixtures", profile: "native-element", output: "markdown" },
    } });
    assert.equal(response.result.isError, false);
    assert.equal(response.result.content.length, 1);
    assert.match(response.result.content[0].text, /# UI 风格对齐扫描报告/);
    assert.deepEqual(response.result.structuredContent, response.result._meta.wlExecution);
  });

  it("recommend-flow 可消费 compact-v2 去重目录", () => {
    const response = callMcp({
      jsonrpc: "2.0",
      id: 22,
      method: "tools/call",
      params: {
        name: "wl_ui_recommend_flow",
        arguments: {
          scanJson: JSON.stringify({
            schema: "wl-ui-scan.compact.v2",
            summary: { total: 1 },
            ruleCatalog: { R021: ["error", "use agGrid", "base"] },
            issuesByFile: { "A.vue": [[2, "R021", "missing adapter"]] },
            skills: ["vendors/ag-grid"],
            next: ["preview"],
          }),
        },
      },
    });
    const result = response.result.structuredContent;
    assert.equal(result.kitBridge.needed, true);
    assert.deepEqual(result.recommendedSkills, ["vendors/ag-grid"]);
    assert.ok(result.nextActions.includes("preview"));
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
    const contractText = extracted.result.content[1].text;
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
    assert.equal(validated.result.structuredContent.ok, true);
  });
});
