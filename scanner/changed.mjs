import { spawnSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";

function gitPaths(projectRoot, args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    return { ok: false, reason: (result.stderr || result.stdout || "git 执行失败").trim() };
  }
  return {
    ok: true,
    // Git 默认会转义非 ASCII 路径；使用 -z 后按原始 NUL 分隔读取，中文、空格
    // 和特殊字符文件名都不会因引号/反斜杠转义而被漏扫。
    paths: result.stdout.split("\0").filter(Boolean),
  };
}

/**
 * 收集相对指定 base、新工作区和未跟踪文件中的 Vue 变更。
 * Git 不可用或 base 无效时返回 fallback=true，调用方必须退回全量扫描，避免漏检。
 */
export function collectChangedVueFiles({ projectRoot, targetDir, base = "HEAD" }) {
  const commands = [];
  if (base && base !== "HEAD") {
    commands.push([
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      "-z",
      `${base}...HEAD`,
    ]);
  }
  commands.push(["diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD"]);
  commands.push(["ls-files", "--others", "--exclude-standard", "-z"]);

  const relativePaths = new Set();
  for (const args of commands) {
    const result = gitPaths(projectRoot, args);
    if (!result.ok) return { files: null, fallback: true, reason: result.reason };
    for (const file of result.paths) relativePaths.add(file);
  }

  const targetRoot = resolve(targetDir);
  const files = new Set();
  for (const file of relativePaths) {
    if (!file.toLowerCase().endsWith(".vue")) continue;
    const absolute = resolve(projectRoot, file);
    const rel = relative(targetRoot, absolute);
    if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) files.add(absolute);
  }
  return { files, fallback: false, reason: "" };
}
