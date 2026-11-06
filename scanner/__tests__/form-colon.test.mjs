import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { analyzeFormColon, fixFormColon } from "../rules/formColon.mjs";
import { scanProject } from "../engine.mjs";
import { runFix } from "../fix.mjs";
import { rollbackSnapshot } from "../snapshot.mjs";
import { getRuleById } from "../rules/index.mjs";
const profile = "legacy-jh-element";
const typed = value => `const fields: BaseFormItemDesc[] = [${value}];`;
const item = value => `{name: 'id', label: '编号', ${value}}`;
function fixture(t, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wl-colon-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (file, body) => { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), body); };
  put("package.json", JSON.stringify({ dependencies: { "@jhlc/common-core": "3.1.0-prod.14" } }));
  for (const [file, body] of Object.entries(files)) put(file, body);
  return { root, put, scan: options => scanProject({ projectRoot: root, target: "src", profile, only: "R045", ...options }) };
}
test("R045 recognizes typed shared factories without mistaking strings, comments or table descriptors", () => {
  const source = `
import type { BaseQueryItemDesc as QueryItem } from '@/types/page';
const ignored = "const fields: BaseFormItemDesc[] = [{label:'x'}]";
// const alsoIgnored: BaseFormItemDesc[] = [{label:'x'}];
const toQueryItems=(fields:Field[]):QueryItem[]=>fields.filter(x=>x.query).map(item=>({name:item.name,label:item.label}));
function toFormItems(fields: Field[]): BaseFormItemDesc[] { return fields.map(item=>({name:item.name,label:item.label,showColon:true})); }
const columns: TableColumnDesc[]=[{name:'a',label:'name'}];
const random = {label:'unrelated', showColon: true};
`;
  const found = analyzeFormColon(source);
  assert.equal(found.issues.length, 2); assert.ok(found.issues.every(value => value.fixable));
  const fixed = fixFormColon(source); assert.equal(fixed.changes, 2); assert.equal(analyzeFormColon(fixed.content).issues.length, 0);
  assert.ok(fixed.content.includes('const fields: BaseFormItemDesc[] = [{label:'));
  assert.ok(fixed.content.includes("const random = {label:'unrelated', showColon: true}"));
});
test("R045 handles aliases, satisfies, refs and nested object members with actual item type contracts", () => {
  const source = `type FieldItem=BaseFormItemDesc; const first:FieldItem[]=[{label:'名称'}]; const second=[{label:'日期'}] satisfies BaseQueryItemDesc[]; const third=computed<BaseFormItemDesc[]>(()=>[{label:'部门'}]); const data={fields:[{label:'条目'}] as BaseQueryItemDesc[]};`;
  const fixed = fixFormColon(source); assert.equal(analyzeFormColon(source).issues.length, 4); assert.equal(analyzeFormColon(fixed.content).issues.length, 0);
});
test("R045 treats unknown spread and dynamic showColon as review and never rewrites them", () => {
  for (const value of ["showColon: enabled", "showColon: false, ...unknown", "showColon: true, ...unknown", "...unknown", "[key]: value"]) {
    const source = typed(item(value)); const found = analyzeFormColon(source);
    assert.equal(found.issues.length, 1, value); assert.equal(found.issues[0].manualReview, true, value); assert.equal(fixFormColon(source).content, source, value);
  }
  assert.equal(analyzeFormColon(typed("{...unknown,label:'编号',showColon:false}")).issues.length, 0);
  assert.equal(analyzeFormColon(fixFormColon(typed("{...unknown,label:'编号',showColon:true}")).content).issues.length, 0);
});
test("known spread helpers cannot hide a late showColon override", () => {
  const safe = `const fieldLogic=item=>({logicType:item.type});const fieldProps=item=>item.flag?{component:()=>({tag:'jh-number'})}:{};` + typed(item("...fieldProps(item), ...fieldLogic(item)"));
  assert.equal(analyzeFormColon(safe).issues[0].fixable, true); assert.equal(analyzeFormColon(fixFormColon(safe).content).issues.length, 0);
  const override = `const props={showColon:true};` + typed(item("showColon:false,...props"));
  assert.equal(analyzeFormColon(override).issues[0].manualReview, true); assert.equal(fixFormColon(override).content, override);
});
test("a later label spread cannot be repaired into a false clean result or mutate a shared descriptor", () => {
  const source = `const common={label:'姓名：'}; const items:BaseFormItemDesc[]=[{label:'姓名:',...common}];`;
  const found = analyzeFormColon(source); assert.equal(found.issues.length, 1); assert.equal(found.issues[0].manualReview, true); assert.equal(fixFormColon(source).content, source);
  const withFalse = `const common={label:'姓名：'}; const items:BaseFormItemDesc[]=[{label:'姓名',showColon:false,...common}];`;
  assert.equal(analyzeFormColon(withFalse).issues[0].manualReview, true); assert.equal(fixFormColon(withFalse).content, withFalse);
  const localFinal = `const common={label:'姓名：'}; const items:BaseFormItemDesc[]=[{...common,label:'姓名',showColon:false}];`;
  assert.equal(analyzeFormColon(localFinal).issues.length, 0);
  const duplicate = `const items:BaseFormItemDesc[]=[{label:'旧标签：',label:'姓名',showColon:false}];`;
  assert.equal(analyzeFormColon(duplicate).issues.length, 0);
});
test("mutable shared spread state and reassigned helpers are reviewed instead of trusting their initializer", () => {
  for (const source of [
    `const props={};props.showColon=true;const items:BaseFormItemDesc[]=[{label:'姓名',showColon:false,...props}];`,
    `let props=()=>({component:'input'});props=()=>({showColon:true});const items:BaseFormItemDesc[]=[{label:'姓名',showColon:false,...props()}];`,
  ]) { assert.equal(analyzeFormColon(source).issues[0].manualReview,true);assert.equal(fixFormColon(source).content,source); }
});
test("only static terminal colon text is fixed; unrelated punctuation and dynamic concatenation remain unchanged", () => {
  const source = `const items:BaseFormItemDesc[]=[{label:'姓名：',showColon:false},{label:'值: ',showColon:false},{label:'时间 HH:mm',showColon:false}];`;
  const fixed = fixFormColon(source); assert.equal(fixed.changes, 2); assert.equal(analyzeFormColon(fixed.content).issues.length, 0); assert.match(fixed.content, /HH:mm/);
  for (const label of ["name + '：'", "`${name}：`"]) { const s = typed(`{label:${label},showColon:false}`); assert.equal(analyzeFormColon(s).issues[0].manualReview, true); assert.equal(fixFormColon(s).content, s); }
});
test("Vue inline and bound platform items use correct offsets and preserve template/script strings", () => {
  const source = `<template>\n<BaseForm :items="[{name:'a',label:'名称：'}]" />\n<BaseQuery :items="queries" />\n</template>\n<script setup lang="ts">\nconst queries=[{name:'b',label:'查询'}];\nconst ignored="showColon: true";\n</script>`;
  const found = analyzeFormColon(source, { filename: "Form.vue" }); assert.equal(found.issues.length, 2); assert.deepEqual(found.issues.map(value => value.line).sort((a,b) => a - b), [2,6]);
  const fixed = fixFormColon(source, { filename: "Form.vue" }); assert.equal(analyzeFormColon(fixed.content, { filename: "Form.vue" }).issues.length, 0); assert.match(fixed.content, /const ignored="showColon: true"/);
  const noScript = `<template><BaseForm :items="[{label:'名称'}]" /></template>`; assert.equal(analyzeFormColon(noScript, { filename: "Form.vue" }).issues.length, 1);
});
test("native profiles and old rule selectors retain Vue-only scope; R045 adds script scope only when selected", t => {
  const f = fixture(t, {"src/page.vue":"<template><el-input/></template>","src/runtime.ts":typed(item("")),"src/unrelated.js":"const html='<el-input/>';","src/types.d.ts":"declare const x: BaseFormItemDesc[];"});
  const modern = f.scan(); assert.equal(modern.fileCount, 3); assert.equal(modern.issues.length, 1); assert.equal(modern.issues[0].file, "src/runtime.ts"); assert.equal(modern.parsing.used.script, 2);
  const old = f.scan({ only:"R006" }); assert.deepEqual(old.checkedFiles,["src/page.vue"]);
  assert.equal(f.scan({ profile:"native-element" }).fileCount,1); assert.equal(getRuleById("R045", {profile:"native-element"}),undefined);
  const reviewed = fixture(t,{"src/runtime.ts":typed(item("showColon:flag"))}).scan();assert.equal(reviewed.issues[0].severity,"review");
});
test("script changed-only scans, single-file targets and exemptions preserve the requested scope", t => {
  const f = fixture(t,{"src/changed.ts":typed(item("showColon:false")),"src/clean.ts":typed(item(""))});
  const git = (...args) => execFileSync("git",args,{cwd:f.root,stdio:"pipe"});git("init","-q");git("add",".");git("-c","user.name=fixture","-c","user.email=fixture@example.invalid","commit","-qm","fixture");
  f.put("src/changed.ts",typed(item("")));const scan = f.scan({changedOnly:true});assert.deepEqual(scan.checkedFiles,["src/changed.ts"]);assert.equal(scan.issues.length,1);
  assert.equal(f.scan({target:"src/changed.ts"}).issues.length,1);f.put(".wl-exempt.json",JSON.stringify({exemptPaths:["src/changed.ts"],exemptRules:[]}));assert.equal(f.scan({target:"src/changed.ts"}).issues.length,0);
  const fixed = runFix({target:path.join(f.root,"src/changed.ts"),projectRoot:f.root,profile,only:new Set(["R045"])});assert.equal(fixed.changedFiles.length,0);
});
test("R045 dry-run, real fix, re-scan, rollback and stale-plan rejection reuse the existing transaction", t => {
  const original = typed(item("")), f = fixture(t,{"src/runtime.ts":original,"src/review.ts":typed(item("showColon:flag")),"src/unrelated.js":"const html='<el-input/>';"});
  const input = {target:path.join(f.root,"src"),projectRoot:f.root,profile,only:new Set(["R045"])};
  const preview = runFix({...input,dryRun:true});assert.equal(preview.changedFiles.length,1);assert.equal(fs.readFileSync(path.join(f.root,"src/runtime.ts"),"utf8"),original);
  const applied = runFix({...input,expectedPlanHash:preview.planHash});assert.ok(applied.snapshotId);assert.equal(f.scan().issues.length,1);assert.equal(f.scan().issues[0].severity,"review");assert.equal(runFix({...input,dryRun:true}).totalChanges,0);
  rollbackSnapshot(f.root,applied.snapshotId);assert.equal(fs.readFileSync(path.join(f.root,"src/runtime.ts"),"utf8"),original);
  f.put("src/runtime.ts",original + "\n// updated after preview");assert.throws(() => runFix({...input,expectedPlanHash:preview.planHash}),/计划已变化/);
});
test("invalid script parsing aborts scan/fix before any write and never claims a verified result", t => {
  const good = typed(item("")),f = fixture(t,{"src/a.ts":good,"src/z.ts":"const x:BaseFormItemDesc[] = [{label:"});
  assert.throws(() => f.scan(),/R045 未验证/);assert.throws(() => runFix({target:path.join(f.root,"src"),projectRoot:f.root,profile,only:new Set(["R045"])}),/R045 未验证/);assert.equal(fs.readFileSync(path.join(f.root,"src/a.ts"),"utf8"),good);
});
test("JS/TS symlink targets stay inside the project boundary", t => {
  const f = fixture(t,{"src/runtime.ts":typed(item(""))}),external = fs.mkdtempSync(path.join(os.tmpdir(),"wl-colon-external-"));t.after(() => fs.rmSync(external,{recursive:true,force:true}));fs.writeFileSync(path.join(external,"source.ts"),typed(item("")));fs.symlinkSync(path.join(external,"source.ts"),path.join(f.root,"src/escape.ts"));assert.throws(() => f.scan(),/必须位于项目根目录内/);
});
test("public CLI records actual TS files and exposes the same rule/fix plan", t => {
  const f = fixture(t,{"src/runtime.ts":typed(item(""))}),bin = new URL("../../bin/wl-ui.js",import.meta.url);
  const run = (...args) => spawnSync(process.execPath,[bin.pathname,...args,"--project",f.root,"--target","src","--profile",profile,"--only","R045","--output","json"],{cwd:f.root,encoding:"utf8"});
  const result = run("scan","--fail-on-error");assert.equal(result.status,1,result.stderr);const data = JSON.parse(result.stdout);assert.equal(data.issues[0].rule,"R045");assert.match(JSON.stringify(data),/src\/runtime.ts/);
  const preview = run("fix","--dry-run");assert.equal(preview.status,0,preview.stderr);const plan = JSON.parse(preview.stdout);assert.equal(plan.changedFiles.length,1);assert.equal(plan.changesByRule.R045,1);
});
test("public task→status→execute binds the colon standard, declared rule and actual TS findings", t => {
  const f = fixture(t, {"src/runtime.ts":typed(item(""))});
  const repo = path.resolve(import.meta.dirname,"../.."), pkg = JSON.parse(fs.readFileSync(path.join(repo,"package.json")));
  fs.writeFileSync(path.join(f.root,"package.json"),JSON.stringify({private:true,dependencies:{[pkg.name]:pkg.version,"@jhlc/common-core":"3.1.0-prod.14"}}));
  fs.mkdirSync(path.join(f.root,"node_modules/@agile-team"),{recursive:true});fs.symlinkSync(repo,path.join(f.root,"node_modules",pkg.name),"dir");
  const cli = path.join(repo,"bin/wl-ui.js");
  const request = input => { const file = path.join(f.root,"request.json");fs.writeFileSync(file,JSON.stringify({protocolVersion:1,projectRoot:f.root,...input}));const called = spawnSync(process.execPath,[cli,"protocol","request","--input-file",file,"--json"],{cwd:f.root,encoding:"utf8"});assert.equal(called.status,0,called.stderr || called.stdout);return JSON.parse(called.stdout); };
  const planned = request({operation:"task",task:"检查表单 label 冒号和 showColon 配置",targets:["src/runtime.ts"],runId:"colon-public"});
  assert.equal(planned.ok,true);assert.deepEqual(planned.result.integration.selectedSkills,["element/el-form"]);assert.ok(planned.result.integration.ruleRefs.some(rule => rule.legacyId === "R045" && rule.source.endsWith("standards/ui/03-form.md")));assert.ok(planned.result.requiredFiles.some(file => file.endsWith("standards/ui/03-form.md")));assert.ok(planned.result.integration.allowedExecutors.includes("scan"));
  const status = request({operation:"status",runId:"colon-public"});assert.equal(status.result.integration.planStale,false);
  const result = request({operation:"execute",runId:"colon-public",executorId:"scan",parameters:{targets:["src/runtime.ts"],rules:["R045"]}});
  assert.equal(result.result.execution.exitCode,1);assert.equal(result.result.integration.validationStatus,"failed");assert.ok(result.result.tools.some(tool => tool.checkedFiles.some(file => file.path === "src/runtime.ts")));assert.match(result.result.execution.stdout,/R045/);
});
