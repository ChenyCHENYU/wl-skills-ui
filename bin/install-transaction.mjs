import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, rmdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { safeFile } from "./install-lifecycle.mjs";

/** Restore every planned file byte-for-byte if any installation write fails. */
export function beginInstallTransaction(root, paths) {
  const snapshots = new Map();
  const absentDirectories = new Set();
  for (const rel of new Set(paths)) {
    const full = safeFile(root, rel);
    snapshots.set(full, existsSync(full) ? readFileSync(full) : null);
    let parent = dirname(full);
    while (relative(root, parent) && !existsSync(parent)) {
      absentDirectories.add(parent);
      parent = dirname(parent);
    }
  }
  let closed = false;
  return {
    commit() { closed = true; },
    rollback() {
      if (closed) return;
      const failures = [];
      for (const [full, content] of snapshots) {
        try {
          if (content === null) { if (existsSync(full)) unlinkSync(full); }
          else { mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, content); }
        } catch (error) { failures.push(`${full}: ${error.message}`); }
      }
      for (const directory of [...absentDirectories].sort((a, b) => b.length - a.length)) {
        try { rmdirSync(directory); } catch { /* Keep nonempty or foreign directories. */ }
      }
      closed = true;
      if (failures.length) throw new Error(`Installation rollback incomplete: ${failures.join("; ")}`);
    },
  };
}
