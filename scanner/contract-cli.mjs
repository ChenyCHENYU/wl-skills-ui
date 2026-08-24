#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  extractUiContractFromFile,
  loadUiContractLibrary,
  matchUiContracts,
  validateUiContract,
} from "./ui-contract.mjs";

const args = process.argv.slice(2);
const action = args.shift() || "help";
const { values } = parseArgs({
  args,
  options: {
    confirm: { type: "boolean", default: false },
    domain: { type: "string", default: "" },
    help: { type: "boolean", default: false },
    id: { type: "string", default: "" },
    input: { type: "string", default: "" },
    json: { type: "boolean", default: false },
    library: { type: "string", default: "" },
    limit: { type: "string", default: "5" },
    mode: { type: "string", default: "native" },
    "output-file": { type: "string", default: "" },
    parser: { type: "string", default: "auto" },
    path: { type: "string", default: "" },
    project: { type: "string", default: "." },
    scenario: { type: "string", default: "" },
  },
  strict: true,
});

function printHelp() {
  console.log(`wl-ui contract — 脱敏 UI 语义契约

用法：
  wl-ui contract extract --path <page.vue> --domain <domain> [--scenario <name>]
  wl-ui contract validate --input <ui-contract.json>
  wl-ui contract match --input <ui-contract.json> --library <directory> [--limit 5]

extract 默认只输出 JSON 预览。写文件必须同时传 --output-file 与 --confirm。
契约禁止保存源码、真实 API、业务字段、字段值和按钮原始文案。`);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

try {
  if (action === "help" || values.help) {
    printHelp();
    process.exit(0);
  }

  if (action === "extract") {
    if (!values.path || !values.domain) {
      throw new Error("extract 需要 --path <page.vue> 和 --domain <domain>");
    }
    const contract = extractUiContractFromFile(values.path, {
      domain: values.domain,
      id: values.id || undefined,
      mode: values.mode,
      parser: values.parser,
      projectRoot: resolve(values.project),
      scenario: values.scenario || undefined,
    });
    const validation = validateUiContract(contract);
    if (!validation.ok) {
      throw new Error(`生成的 ui-contract 未通过校验：${validation.errors.join("；")}`);
    }
    const output = `${JSON.stringify(contract, null, 2)}\n`;
    if (values["output-file"]) {
      if (!values.confirm) {
        throw new Error("写入 ui-contract 必须显式传 --confirm");
      }
      const outputPath = resolve(values["output-file"]);
      writeFileSync(outputPath, output, "utf8");
      console.error(`[wl-ui contract] 已写入 ${outputPath}`);
    }
    process.stdout.write(output);
    process.exit(0);
  }

  if (action === "validate") {
    if (!values.input) throw new Error("validate 需要 --input <ui-contract.json>");
    const validation = validateUiContract(readJson(values.input));
    console.log(JSON.stringify(validation, null, 2));
    process.exit(validation.ok ? 0 : 1);
  }

  if (action === "match") {
    if (!values.input || !values.library) {
      throw new Error("match 需要 --input <ui-contract.json> 和 --library <directory>");
    }
    const query = readJson(values.input);
    const validation = validateUiContract(query);
    if (!validation.ok) {
      throw new Error(`查询契约无效：${validation.errors.join("；")}`);
    }
    const candidates = loadUiContractLibrary(values.library);
    const matches = matchUiContracts(query, candidates, {
      limit: Number.parseInt(values.limit, 10),
    });
    console.log(
      JSON.stringify(
        {
          schema: "wl-ui-contract-match.v1",
          query: query.id,
          candidates: candidates.length,
          matches,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  throw new Error(`未知 contract 命令：${action}`);
} catch (error) {
  console.error(`[wl-ui contract] ${error.message}`);
  process.exit(1);
}
