import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { collectChangedVueFiles } from "../changed.mjs";

const cleanup = [];

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", shell: false });
  assert.equal(result.status, 0, result.stderr);
}

afterEach(() => {
  while (cleanup.length > 0) rmSync(cleanup.pop(), { recursive: true, force: true });
});

describe("changed Vue scan scope", () => {
  it("只返回已修改和未跟踪的目标目录 Vue 文件", () => {
    const root = mkdtempSync(join(tmpdir(), "wl-ui-changed-"));
    cleanup.push(root);
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "Changed.vue"), "<template><div /></template>\n");
    writeFileSync(join(root, "src", "Clean.vue"), "<template><div /></template>\n");
    writeFileSync(join(root, "README.md"), "base\n");
    git(root, ["init"]);
    git(root, ["add", "."]);
    git(root, [
      "-c",
      "user.name=wl-ui-test",
      "-c",
      "user.email=wl-ui@example.invalid",
      "commit",
      "-m",
      "base",
    ]);

    writeFileSync(join(root, "src", "Changed.vue"), "<template><span /></template>\n");
    writeFileSync(join(root, "src", "New.vue"), "<template><main /></template>\n");
    writeFileSync(join(root, "src", "新建 页面.vue"), "<template><aside /></template>\n");
    writeFileSync(join(root, "README.md"), "changed\n");

    const result = collectChangedVueFiles({
      projectRoot: root,
      targetDir: join(root, "src"),
    });
    assert.equal(result.fallback, false);
    assert.deepEqual([...result.files].sort(), [
      join(root, "src", "Changed.vue"),
      join(root, "src", "New.vue"),
      join(root, "src", "新建 页面.vue"),
    ]);
  });

  it("base 无效时要求调用方回退全量扫描", () => {
    const root = mkdtempSync(join(tmpdir(), "wl-ui-changed-"));
    cleanup.push(root);
    mkdirSync(join(root, "src"), { recursive: true });
    const result = collectChangedVueFiles({
      projectRoot: root,
      targetDir: join(root, "src"),
      base: "missing-ref",
    });
    assert.equal(result.fallback, true);
    assert.equal(result.files, null);
  });
});
