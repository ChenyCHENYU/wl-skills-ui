import { afterEach, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "vite";
import { wlSkillsCheck } from "../vite/check.mjs";
import { runTaskAction } from "../../bin/task-integration.mjs";

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
for (const command of ["serve", "build"]) {
  it(`Vite ${command} invokes the dependency plugin and records its limited real scope`, async () => {
    const root = mkdtempSync(join(tmpdir(), "ui-vite-check-"));
    roots.push(root);
    writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", dependencies: { "@jhlc/jh-ui": "3.1.0", "element-plus": "2.2.6-prod.3" } }));
    const messages = [];
    const logger = { info: (text) => messages.push(text), warn: (text) => messages.push(text), warnOnce: (text) => messages.push(text), error: (text) => messages.push(text), clearScreen() {}, hasErrorLogged: () => false, hasWarned: false };
    const config = await resolveConfig({ configFile: false, root, customLogger: logger, plugins: [wlSkillsCheck({ runId: `vite-${command}` })] }, command);
    assert.ok(config.plugins.some((plugin) => plugin.name === "wl-skills-ui:check"));
    assert.ok(messages.some((message) => message.includes("源码UI规则尚未验证")));
    const status = runTaskAction("status", { projectRoot: root, runId: `vite-${command}` });
    assert.equal(status.tools[0].executionStatus, "completed");
    assert.notEqual(status.tools[0].validationStatus, "passed");
    assert.equal(status.tools[0].checks.find((check) => check.id === "scan").status, "skipped");
    assert.deepEqual(status.tools[0].checkedFiles.map((file) => file.path), ["package.json"]);
  });
}
