/** Package-owned platform item contract. Scan and fix share these exact AST findings. */
import { createRequire } from "node:module";
import { extname } from "node:path";
import { parseVueSfc } from "../sfc-parser.mjs";
import { findTags, issue, lineOf } from "./_shared.mjs";

const ITEM_TYPES = new Set(["BaseFormItemDesc", "BaseQueryItemDesc"]);
const require = createRequire(import.meta.url);
let parser;
const scriptParser = () => parser ??= require("@babel/parser");
const unwrap = node => ["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "ParenthesizedExpression"].includes(node?.type) ? unwrap(node.expression) : node;
const keyName = node => node?.type === "Identifier" ? node.name : node?.type === "StringLiteral" ? node.value : null;
function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "comments", "tokens", "errors"].includes(key)) continue;
    if (Array.isArray(child)) { for (const item of child) if (item?.type) walk(item, visit); }
    else if (child?.type) walk(child, visit);
  }
}
function options(filename, lang) {
  return { sourceType: "unambiguous", plugins: [...(/tsx?|mts|cts/.test(lang || extname(filename).slice(1)) ? ["typescript"] : []), ...(/jsx|tsx/.test(lang || filename) ? ["jsx"] : [])] };
}
function returns(fn) {
  if (fn.body?.type !== "BlockStatement") return fn.body ? [fn.body] : [];
  const result = [];
  const visit = node => {
    if (!node || typeof node !== "object") return;
    if (node.type === "ReturnStatement") { if (node.argument) result.push(node.argument); return; }
    if (/Function|Method/.test(node.type || "") || node.type === "ClassDeclaration") return;
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child?.type) visit(child);
    }
  };
  visit(fn.body); return result;
}

export function analyzeFormColon(source, { filename = "source.ts", parsed } = {}) {
  const vue = filename.toLowerCase().endsWith(".vue");
  const blocks = vue ? [...(parsed || parseVueSfc(source, { filename, mode: "fast" })).scripts] : [{ text: source, offset: 0, lang: extname(filename).slice(1) }];
  if (vue && !blocks.length) blocks.push({ text: "", offset: 0, lang: "js" });
  const issues = [], edits = [], seen = new Set();
  const units = blocks.map(block => {
    try { return { ...block, ast: scriptParser().parse(block.text, options(filename, block.lang)) }; }
    catch (error) { throw new Error(`${filename}:${lineOf(source, block.offset || 0) + (error.loc?.line || 1) - 1} 无法解析表单字段源码，R045 未验证：${error.message}`, { cause: error }); }
  });
  for (const unit of units) {
    const bindings = new Map(), aliases = new Map(), types = new Set(ITEM_TYPES), reassigned = new Set();
    const bind = (name, value) => bindings.set(name, bindings.has(name) ? null : value);
    walk(unit.ast, node => {
      if (node.type === "ImportSpecifier" && ITEM_TYPES.has(keyName(node.imported))) types.add(node.local.name);
      if (node.type === "AssignmentExpression" && node.left.type === "Identifier") reassigned.add(node.left.name);
      if (node.type === "TSTypeAliasDeclaration") aliases.set(node.id.name, node.typeAnnotation);
      if (node.type === "VariableDeclarator" && node.id.type === "Identifier") bind(node.id.name, node.init);
      if (node.type === "FunctionDeclaration" && node.id) bind(node.id.name, node);
    });
    function itemType(node, depth = 0) {
      if (!node || depth > 6) return false;
      if (["TSTypeAnnotation", "TSArrayType", "TSParenthesizedType"].includes(node.type)) return itemType(node.typeAnnotation || node.elementType, depth + 1);
      if (node.type === "TSTypeReference") {
        const name = keyName(node.typeName);
        return types.has(name) || itemType(aliases.get(name), depth + 1) || ["Array", "ReadonlyArray", "Ref", "ComputedRef"].includes(name) && (node.typeParameters?.params || []).some(value => itemType(value, depth + 1));
      }
      return false;
    }
    function objects(node, depth = 0) {
      node = unwrap(node);
      if (!node || depth > 8) return [];
      if (node.type === "ObjectExpression") return [node];
      if (node.type === "ArrayExpression") return node.elements.flatMap(value => objects(value?.type === "SpreadElement" ? value.argument : value, depth + 1));
      if (node.type === "Identifier") return objects(bindings.get(node.name), depth + 1);
      if (node.type === "ConditionalExpression") return [...objects(node.consequent, depth + 1), ...objects(node.alternate, depth + 1)];
      if (/Function|Method/.test(node.type)) return returns(node).flatMap(value => objects(value, depth + 1));
      if (node.type === "CallExpression") {
        const callee = unwrap(node.callee);
        if (callee?.type === "MemberExpression" && keyName(callee.property) === "map") return objects(node.arguments[0], depth + 1);
        if (callee?.type === "Identifier" && ["ref", "reactive", "computed"].includes(callee.name)) return objects(node.arguments[0], depth + 1);
      }
      return [];
    }
    function spreadSafe(node, property = "showColon", depth = 0) {
      node = unwrap(node);
      if (!node || depth > 6) return false;
      // A shared object can be mutated elsewhere; do not infer its effective keys.
      if (node.type === "Identifier") return false;
      if (node.type === "ConditionalExpression") return spreadSafe(node.consequent, property, depth + 1) && spreadSafe(node.alternate, property, depth + 1);
      if (node.type === "CallExpression" && node.callee.type === "Identifier") {
        const fn = bindings.get(node.callee.name);
        const values = fn && !reassigned.has(node.callee.name) && /Function/.test(fn.type) ? returns(fn) : [];
        return values.length > 0 && values.every(value => spreadSafe(value, property, depth + 1));
      }
      return node.type === "ObjectExpression" && node.properties.every(prop => prop.type === "SpreadElement" ? spreadSafe(prop.argument, property, depth + 1) : (!prop.computed || prop.key.type === "StringLiteral") && keyName(prop.key) !== null && keyName(prop.key) !== property);
    }
    function inspect(object, code = unit.text, offset = unit.offset || 0, canEdit = true) {
      const id = offset + object.start;
      if (seen.has(id)) return; seen.add(id);
      const label = object.properties.filter(prop => prop.type === "ObjectProperty" && (!prop.computed || prop.key.type === "StringLiteral") && keyName(prop.key) === "label").at(-1);
      if (!label) return;
      let colon, uncertainAfter = false, uncertainLabelAfter = false;
      for (const prop of object.properties) {
        if (prop === label) uncertainLabelAfter = false;
        else if (prop.type === "SpreadElement" ? !spreadSafe(prop.argument, "label") : prop.computed && prop.key.type !== "StringLiteral") uncertainLabelAfter = true;
        if ((!prop.computed || prop.key?.type === "StringLiteral") && keyName(prop.key) === "showColon") { colon = prop; uncertainAfter = false; }
        else if (prop.type === "SpreadElement" ? !spreadSafe(prop.argument) : prop.computed && prop.key.type !== "StringLiteral") uncertainAfter = true;
      }
      const value = unwrap(colon?.value);
      const disabled = value?.type === "BooleanLiteral" && value.value === false && !uncertainAfter;
      const literal = unwrap(label.value);
      const suffix = literal?.type === "StringLiteral" && /[:：]\s*$/.test(literal.value);
      const dynamicSuffix = literal?.type === "BinaryExpression" && literal.operator === "+" && literal.right.type === "StringLiteral" && /[:：]\s*$/.test(literal.right.value) || literal?.type === "TemplateLiteral" && literal.expressions.length > 0 && /[:：]\s*$/.test(literal.quasis.at(-1)?.value.cooked || "");
      if (disabled && !suffix && !dynamicSuffix && !uncertainLabelAfter) return;
      const safeColon = !disabled && !uncertainAfter && (!colon || value?.type === "BooleanLiteral" && value.value === true);
      const manualReview = (!disabled && !safeColon) || Boolean(dynamicSuffix) || uncertainLabelAfter || !canEdit;
      const reasons = [...(uncertainLabelAfter ? ["后续展开可能覆盖 label 文本，需核对最终标签，不能仅凭 showColon:false 判定无冒号"] : []), ...(!disabled ? [uncertainAfter ? "后续动态展开可能覆盖 showColon，需核对最终字段值" : colon && value?.type !== "BooleanLiteral" ? "showColon 为动态值，无法确定为 false" : "平台字段未明确关闭 showColon，原生控件可能直接拼接冒号"] : []), ...(suffix || dynamicSuffix ? ["字段 label 文本末尾自带冒号，CSS 无法消除文本后缀"] : [])];
      issues.push({ ...issue(filename, lineOf(source, id), "R045", "vendor-base", manualReview ? "review" : "error", reasons.join("；"), manualReview ? "核对平台字段构造器及展开来源，人工确保最终 showColon:false，并去掉 label 拼接后缀；不自动覆盖动态语义" : "在当前平台字段对象显式设置 showColon:false，去掉静态 label 末尾冒号；先 dry-run 再按计划修复并复扫"), manualReview, fixable: !manualReview });
      if (manualReview) return;
      if (safeColon && colon) edits.push({ start: offset + colon.value.start, end: offset + colon.value.end, text: "false" });
      else if (safeColon) {
        const leading = code.slice(object.start + 1, object.properties[0].start);
        const spacing = leading.match(/\r?\n([\t ]*)/);
        edits.push({ start: offset + object.start + 1, end: offset + object.start + 1, text: spacing ? `${leading.includes("\r\n") ? "\r\n" : "\n"}${spacing[1]}showColon: false,` : " showColon: false," });
      }
      if (suffix) edits.push({ start: offset + literal.start, end: offset + literal.end, text: JSON.stringify(literal.value.replace(/[:：](\s*)$/, "$1")) });
    }
    walk(unit.ast, node => {
      let candidates = [];
      if (node.type === "VariableDeclarator" && itemType(node.id.typeAnnotation)) candidates = objects(node.init);
      else if (/Function|Method/.test(node.type) && itemType(node.returnType)) candidates = objects(node);
      else if (["TSAsExpression", "TSSatisfiesExpression"].includes(node.type) && itemType(node.typeAnnotation)) candidates = objects(node.expression);
      else if (node.type === "CallExpression" && (node.typeParameters?.params || []).some(value => itemType(value))) candidates = objects(node);
      candidates.forEach(value => inspect(value));
    });
    if (!vue) continue;
    const sfc = parsed || parseVueSfc(source, { filename, mode: "fast" });
    for (const tagName of ["BaseForm", "base-form", "BaseQuery", "base-query"]) for (const tag of findTags(sfc.template.text, tagName)) {
      const attr = /\s(?:v-bind:|:)items\s*=\s*(["'])([\s\S]*?)\1/.exec(tag.text);
      if (!attr) continue;
      const expression = attr[2];
      const offset = (sfc.template.offset || 0) + tag.index + attr.index + attr[0].length - 1 - expression.length;
      let node;
      try { node = scriptParser().parseExpression(expression.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"), options(filename, "ts")); }
      catch { continue; } // Vue parser reports invalid expressions separately; never rewrite them.
      if (node.type === "Identifier") objects(node).forEach(value => inspect(value));
      else objects(node).forEach(value => inspect(value, expression, offset, !/&(?:quot|apos|amp);/.test(expression)));
    }
  }
  return { issues, edits };
}

export function fixFormColon(source, options) {
  const { edits } = analyzeFormColon(source, options);
  let content = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) content = content.slice(0, edit.start) + edit.text + content.slice(edit.end);
  return { content, changes: edits.length };
}

export const formColonRule = { id: "R045", checkSource: (source, filename, _offset, context) => analyzeFormColon(source, { filename, parsed: context?.parsed }).issues };
