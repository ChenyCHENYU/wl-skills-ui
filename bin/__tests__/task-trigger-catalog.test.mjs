import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {taskCatalog} from '../task-integration.mjs';
test('触发词清单与本包技能目录双向完整且不含空词',() => {
 const triggers = JSON.parse(fs.readFileSync(new URL('../task-triggers.json',import.meta.url),'utf8'));const catalog = taskCatalog();
 assert.deepEqual(Object.keys(triggers).sort(),catalog.map(s => s.id).sort());
 for(const skill of catalog){assert.ok(skill.triggers.length,skill.id);assert.ok(skill.triggers.every(p => typeof p === 'string' && p.trim()));assert.deepEqual(skill.triggers,Array.isArray(triggers[skill.id]) ? triggers[skill.id] : triggers[skill.id].triggers);assert.match(skill.name,/[\u4e00-\u9fff]/);assert.match(skill.description,/[\u4e00-\u9fff]/);assert.doesNotMatch(skill.name,/Skill:| SKILL$/);for(const pattern of skill.intentPatterns)assert.doesNotThrow(() => new RegExp(pattern,'gi'));for(const id of skill.refines)assert.ok(catalog.some(other => other.id === id),id);}
});
