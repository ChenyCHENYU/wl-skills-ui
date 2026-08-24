import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const PARSER_MODES = new Set(["fast", "auto", "sfc"]);
const compilerCache = new Map();

function lineOffsetAt(source, offset) {
  let lines = 0;
  for (let index = source.indexOf("\n"); index >= 0 && index < offset; index = source.indexOf("\n", index + 1)) {
    lines += 1;
  }
  return lines;
}

function parseAttributes(openingTag) {
  const lang = openingTag.match(/\blang\s*=\s*["']([^"']+)["']/i)?.[1] || null;
  return {
    lang,
    scoped: /\sscoped(?:\s|=|>|\/)/i.test(openingTag),
    setup: /\ssetup(?:\s|=|>|\/)/i.test(openingTag),
  };
}

function findBlockEnd(source, name, contentStart) {
  if (name !== "template") {
    const close = new RegExp(`</${name}\\s*>`, "gi");
    close.lastIndex = contentStart;
    const match = close.exec(source);
    return match ? { contentEnd: match.index, blockEnd: close.lastIndex } : null;
  }

  // Vue template 可以嵌套 <template #slot>。只找第一个 </template> 会截断整页，
  // 因此 fast 模式也使用深度匹配；复杂语法再交给 compiler-sfc 精确解析。
  const tags = /<\/?template\b[^>]*>/gi;
  tags.lastIndex = contentStart;
  let depth = 1;
  let match;
  while ((match = tags.exec(source)) !== null) {
    const closing = /^<\//.test(match[0]);
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (closing) depth -= 1;
    else if (!selfClosing) depth += 1;
    if (depth === 0) {
      return { contentEnd: match.index, blockEnd: tags.lastIndex };
    }
  }
  return null;
}

function parseFast(source) {
  const blocks = { template: null, styles: [], scripts: [] };
  const opening = /<(template|style|script)\b[^>]*>/gi;
  let match;
  while ((match = opening.exec(source)) !== null) {
    const name = match[1].toLowerCase();
    const end = findBlockEnd(source, name, opening.lastIndex);
    if (!end) continue;
    const attributes = parseAttributes(match[0]);
    const block = {
      text: source.slice(opening.lastIndex, end.contentEnd),
      lineOffset: lineOffsetAt(source, opening.lastIndex),
      ...attributes,
    };
    if (name === "template" && !blocks.template) blocks.template = block;
    if (name === "style") blocks.styles.push(block);
    if (name === "script") blocks.scripts.push(block);
    opening.lastIndex = end.blockEnd;
  }

  if (!blocks.template) {
    blocks.template = {
      text: source,
      lineOffset: 0,
      lang: null,
      scoped: false,
      setup: false,
    };
  }
  return blocks;
}

function resolveCompiler(projectRoot) {
  const roots = [...new Set([resolve(projectRoot || process.cwd()), PACKAGE_ROOT])];
  for (const root of roots) {
    if (compilerCache.has(root)) {
      const cached = compilerCache.get(root);
      if (cached) return cached;
      continue;
    }
    const localRequire = createRequire(join(root, "package.json"));
    for (const moduleId of ["vue/compiler-sfc", "@vue/compiler-sfc"]) {
      try {
        const compilerPath = localRequire.resolve(moduleId);
        const compiler = localRequire(compilerPath);
        const result = { compiler, compilerPath, moduleId, root };
        compilerCache.set(root, result);
        return result;
      } catch {
        // 继续尝试同一项目的另一种 Vue compiler 暴露方式。
      }
    }
    compilerCache.set(root, null);
  }
  return null;
}

function fromCompilerBlock(source, block) {
  if (!block) return null;
  const offset = block.loc?.start?.offset ?? source.indexOf(block.content);
  return {
    text: block.content,
    lineOffset: lineOffsetAt(source, Math.max(0, offset)),
    lang: block.lang || null,
    scoped: Boolean(block.scoped),
    setup: Boolean(block.setup),
  };
}

function parseWithCompiler(source, filename, resolvedCompiler) {
  const { descriptor, errors = [] } = resolvedCompiler.compiler.parse(source, {
    filename,
    sourceMap: false,
  });
  const warnings = errors.map((error) =>
    typeof error === "string" ? error : error.message || String(error),
  );
  return {
    parser: "sfc",
    compilerPath: resolvedCompiler.compilerPath,
    template:
      fromCompilerBlock(source, descriptor.template) || {
        text: source,
        lineOffset: 0,
        lang: null,
        scoped: false,
        setup: false,
      },
    styles: descriptor.styles.map((block) => fromCompilerBlock(source, block)),
    scripts: [descriptor.script, descriptor.scriptSetup]
      .filter(Boolean)
      .map((block) => fromCompilerBlock(source, block)),
    warnings,
  };
}

/**
 * 解析 Vue SFC：
 * - fast：零依赖、嵌套 template 安全、多 style/script；
 * - auto：优先目标项目自己的 compiler-sfc，缺失时回退 fast；
 * - sfc：强制 compiler-sfc，缺失或语法错误时明确失败。
 */
export function parseVueSfc(
  source,
  { filename = "anonymous.vue", mode = "auto", projectRoot = process.cwd() } = {},
) {
  if (!PARSER_MODES.has(mode)) {
    throw new Error(`未知 SFC parser 模式：${mode}（可选 fast / auto / sfc）`);
  }
  if (mode !== "fast") {
    const resolvedCompiler = resolveCompiler(projectRoot);
    if (resolvedCompiler) {
      const parsed = parseWithCompiler(source, filename, resolvedCompiler);
      if (mode === "sfc" && parsed.warnings.length > 0) {
        throw new Error(`${filename} SFC 解析失败：${parsed.warnings.join("；")}`);
      }
      return parsed;
    }
    if (mode === "sfc") {
      throw new Error(
        "--parser sfc 需要目标项目安装 @vue/compiler-sfc；请安装与 Vue 相同版本后重试",
      );
    }
  }

  return {
    parser: "fast",
    compilerPath: null,
    ...parseFast(source),
    warnings:
      mode === "auto"
        ? ["未找到 @vue/compiler-sfc，已安全回退 fast parser"]
        : [],
  };
}

export const SFC_PARSER_MODES = Object.freeze([...PARSER_MODES]);
