#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const PKG = require('../package.json');

const TOOLS = [
  {
    name: 'wks_ui_check',
    description: '检查当前项目是否已正确接入 @agile-team/wk-skills-ui 的 tokens/styles/runtime。',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: '项目根目录，默认 WL_PROJECT_ROOT 或当前目录' },
      },
      required: [],
    },
  },
  {
    name: 'wks_ui_scan',
    description: '扫描 Vue 项目的 UI 风格偏差，支持 skin/native、layer、vendor、exempt 过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: '扫描目录，默认 src' },
        project: { type: 'string', description: '项目根目录，默认 WL_PROJECT_ROOT 或当前目录' },
        mode: { type: 'string', description: 'skin 或 native' },
        layer: { type: 'string', description: 'L0,L1,L2,L3,L4 逗号分隔' },
        vendor: { type: 'string', description: 'vendor 过滤，逗号分隔' },
        output: { type: 'string', description: 'markdown 或 json，默认 markdown' },
        exempt: { type: 'string', description: '豁免配置文件路径' },
      },
      required: [],
    },
  },
  {
    name: 'wks_ui_fix_dry_run',
    description: '预览 wk-skills-ui 自动修复会修改哪些文件，不实际写入。',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: '扫描目录，默认 src' },
        project: { type: 'string', description: '项目根目录，默认 WL_PROJECT_ROOT 或当前目录' },
      },
      required: [],
    },
  },
  {
    name: 'wks_ui_skill_prompt',
    description: '输出 wk-skills-ui 推荐触发语和下一步操作，引导 AI 加载正确 Skill/Flow。',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function projectRoot(args = {}) {
  return resolve(args.project || process.env.WL_PROJECT_ROOT || process.cwd());
}

function runScanner(command, args = {}) {
  const root = projectRoot(args);
  const scanner = join(PKG_ROOT, 'scanner', 'index.mjs');
  const cliArgs = [scanner, command];
  if (command === 'check') {
    cliArgs.push('--project', root);
  } else {
    cliArgs.push('--project', root);
    cliArgs.push('--target', resolve(root, args.target || 'src'));
    if (args.mode) cliArgs.push('--mode', String(args.mode));
    if (args.layer) cliArgs.push('--layer', String(args.layer));
    if (args.vendor) cliArgs.push('--vendor', String(args.vendor));
    if (args.output) cliArgs.push('--output', String(args.output));
    if (args.exempt) cliArgs.push('--exempt', String(args.exempt));
    if (command === 'fix') cliArgs.push('--dry-run');
  }
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, cliArgs, { cwd: root, shell: false });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => {
      const text = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      resolvePromise({ code, text: text || '(无输出)' });
    });
  });
}

function skillPrompt() {
  return '# wk-skills-ui Skill 触发提示\n\n推荐触发语：\n\n- 新项目：用 wk-ui 的 new-project-init 流程接入统一 UI 风格\n- 老项目：用 wk-ui 的 legacy-skin-align 流程做老项目化妆对齐\n- 只审计：用 wk-ui 的 full-audit 流程扫描当前项目，不修改代码\n- 渐进迁移：用 wk-ui 的 progressive-migrate 流程从 skin 迁移到 runtime\n- 单点修复：用 wk-ui 的 vendors/base-table 或 element/el-table skill 检查当前文件\n\n执行约束：\n\n- 扫描只读，修复前必须先给用户摘要并等待确认\n- 老项目 skin 模式只处理 L0/L1/L2，不改业务布局和 runtime\n- 若项目同时安装 wl-skills-kit，两者分工独立：kit 管编码规范/页面生成/菜单字典权限，wk-skills-ui 管视觉一致性/化妆层/Runtime 渲染。';
}

async function dispatchTool(id, name, args) {
  try {
    if (name === 'wks_ui_check') {
      const result = await runScanner('check', args);
      sendResult(id, { content: [{ type: 'text', text: result.text }], isError: result.code !== 0 });
      return;
    }
    if (name === 'wks_ui_scan') {
      const result = await runScanner('scan', args);
      sendResult(id, { content: [{ type: 'text', text: result.text }], isError: result.code !== 0 });
      return;
    }
    if (name === 'wks_ui_fix_dry_run') {
      const result = await runScanner('fix', args);
      sendResult(id, { content: [{ type: 'text', text: result.text }], isError: result.code !== 0 });
      return;
    }
    if (name === 'wks_ui_skill_prompt') {
      sendResult(id, { content: [{ type: 'text', text: skillPrompt() }] });
      return;
    }
    sendError(id, -32601, `未知工具: ${name}`);
  } catch (e) {
    sendResult(id, { content: [{ type: 'text', text: `❌ 工具执行异常: ${e.message}` }], isError: true });
  }
}

process.stdin.setEncoding('utf8');
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let index;
  while ((index = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    const { id, method, params = {} } = msg;
    if (id === undefined || id === null) continue;
    if (method === 'initialize') {
      sendResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'wk-skills-ui', version: PKG.version },
      });
    } else if (method === 'tools/list') {
      sendResult(id, { tools: TOOLS });
    } else if (method === 'tools/call') {
      dispatchTool(id, params.name, params.arguments || {});
    } else if (method === 'ping') {
      sendResult(id, {});
    } else {
      sendError(id, -32601, `Method not found: ${method}`);
    }
  }
});
