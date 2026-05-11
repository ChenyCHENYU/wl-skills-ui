/**
 * scanner/snapshot.mjs — 皮肤层快照与回退机制
 *
 * 核心思路：
 *   fix 前自动对即将修改的文件做内容快照，写入一个 JSON manifest 文件。
 *   回退时读取 manifest，一键还原所有文件内容。
 *   不在项目里留备份文件，不影响性能，不污染 git。
 *
 * 快照格式（.wl-snapshot/<timestamp>.json）：
 *   {
 *     "version": 1,
 *     "createdAt": "2025-05-02T17:30:00.000Z",
 *     "command": "fix",
 *     "targetDir": "/abs/path/src",
 *     "totalFiles": 12,
 *     "totalChanges": 38,
 *     "files": {
 *       "relative/path.vue": "<original content base64>"
 *     }
 *   }
 *
 * CLI：
 *   wl-scan snapshot list   [--project <path>]           列出所有快照
 *   wl-scan snapshot rollback [--id <timestamp>]          回退指定快照（默认最新）
 *   wl-scan snapshot clean   [--keep <N>]                 清理旧快照，保留最近 N 个
 *   wl-scan snapshot diff    [--id <timestamp>]           查看快照与当前文件差异
 *
 * 集成：fix.mjs 调用 createSnapshot() 即可，无需改业务逻辑。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const SNAPSHOT_DIR = ".wl-snapshot";
const SNAPSHOT_VERSION = 1;

/**
 * 创建快照 — 在 fix 之前调用
 * @param {object} opts
 * @param {string} opts.projectRoot  项目根目录
 * @param {string} opts.targetDir    扫描目标目录（绝对路径）
 * @param {string[]} opts.filePaths  即将被修改的文件绝对路径列表
 * @param {string} opts.command      触发命令（fix / apply 等）
 * @returns {{ id: string, path: string, fileCount: number }}
 */
export function createSnapshot({ projectRoot, targetDir, filePaths, command = "fix" }) {
  const dir = join(projectRoot, SNAPSHOT_DIR);
  mkdirSync(dir, { recursive: true });

  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const files = {};

  for (const absPath of filePaths) {
    if (!existsSync(absPath)) continue;
    const rel = relative(projectRoot, absPath).replace(/\\/g, "/");
    const content = readFileSync(absPath, "utf8");
    // base64 编码存储，避免 JSON 转义问题
    files[rel] = Buffer.from(content, "utf8").toString("base64");
  }

  const manifest = {
    version: SNAPSHOT_VERSION,
    createdAt: new Date().toISOString(),
    command,
    targetDir: relative(projectRoot, targetDir).replace(/\\/g, "/"),
    totalFiles: Object.keys(files).length,
    files,
  };

  const outPath = join(dir, `${id}.json`);
  writeFileSync(outPath, JSON.stringify(manifest, null, 2), "utf8");

  return { id, path: outPath, fileCount: manifest.totalFiles };
}

/**
 * 列出所有快照
 * @param {string} projectRoot
 * @returns {Array<{id, createdAt, command, targetDir, totalFiles, path}>}
 */
export function listSnapshots(projectRoot) {
  const dir = join(projectRoot, SNAPSHOT_DIR);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .sort()
    .reverse()
    .map(f => {
      try {
        const full = join(dir, f);
        const data = JSON.parse(readFileSync(full, "utf8"));
        return {
          id: f.replace(".json", ""),
          createdAt: data.createdAt,
          command: data.command,
          targetDir: data.targetDir,
          totalFiles: data.totalFiles,
          path: full,
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * 回退快照 — 还原所有文件到快照时的内容
 * @param {string} projectRoot
 * @param {string} [snapshotId]  快照 ID（不传则回退最新）
 * @param {boolean} [dryRun=false]
 * @returns {{ restoredFiles: string[], skippedFiles: string[] }}
 */
export function rollbackSnapshot(projectRoot, snapshotId, dryRun = false) {
  const snapshots = listSnapshots(projectRoot);
  if (snapshots.length === 0) {
    throw new Error("没有找到任何快照。请先执行 wl-scan fix 生成快照。");
  }

  let target;
  if (snapshotId) {
    target = snapshots.find(s => s.id === snapshotId);
    if (!target) throw new Error(`快照 "${snapshotId}" 不存在。`);
  } else {
    target = snapshots[0]; // 最新
  }

  const manifest = JSON.parse(readFileSync(target.path, "utf8"));
  const restoredFiles = [];
  const skippedFiles = [];

  for (const [relPath, b64Content] of Object.entries(manifest.files)) {
    const absPath = join(projectRoot, relPath);
    const original = Buffer.from(b64Content, "base64").toString("utf8");

    if (!existsSync(absPath)) {
      skippedFiles.push(relPath);
      continue;
    }

    if (!dryRun) {
      writeFileSync(absPath, original, "utf8");
    }
    restoredFiles.push(relPath);
  }

  return { snapshotId: target.id, restoredFiles, skippedFiles };
}

/**
 * 查看快照与当前文件的差异摘要
 * @param {string} projectRoot
 * @param {string} [snapshotId]
 * @returns {Array<{file, status}>}  status: 'changed' | 'unchanged' | 'missing'
 */
export function diffSnapshot(projectRoot, snapshotId) {
  const snapshots = listSnapshots(projectRoot);
  let target;
  if (snapshotId) {
    target = snapshots.find(s => s.id === snapshotId);
  } else {
    target = snapshots[0];
  }
  if (!target) throw new Error("快照不存在。");

  const manifest = JSON.parse(readFileSync(target.path, "utf8"));
  const results = [];

  for (const [relPath, b64Content] of Object.entries(manifest.files)) {
    const absPath = join(projectRoot, relPath);
    if (!existsSync(absPath)) {
      results.push({ file: relPath, status: "missing" });
      continue;
    }
    const current = readFileSync(absPath, "utf8");
    const original = Buffer.from(b64Content, "base64").toString("utf8");
    results.push({
      file: relPath,
      status: current === original ? "unchanged" : "changed",
    });
  }

  return results;
}

/**
 * 清理旧快照，保留最近 N 个
 * @param {string} projectRoot
 * @param {number} keep
 * @returns {number} 删除数量
 */
export function cleanSnapshots(projectRoot, keep = 5) {
  const snapshots = listSnapshots(projectRoot);
  let removed = 0;
  for (let i = keep; i < snapshots.length; i++) {
    unlinkSync(snapshots[i].path);
    removed++;
  }
  return removed;
}
