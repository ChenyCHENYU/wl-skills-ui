import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

// Commitizen and cz-customizable still use external-editor 3.x. Verify the
// patched tmp dependency against their real sync, callback and cleanup APIs.
const require = createRequire(import.meta.url)
const commitizenRequire = createRequire(require.resolve('commitizen'))
const inquirerRequire = createRequire(commitizenRequire.resolve('inquirer'))
const editorEntry = inquirerRequire.resolve('external-editor')
const editorRequire = createRequire(editorEntry)
const { ExternalEditor, editAsync } = editorRequire(editorEntry)
const tmp = editorRequire('tmp')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'wl-ui-editor-api-'))
  const editor = join(root, 'editor.cjs')
  writeFileSync(editor, "require('node:fs').writeFileSync(process.argv[2], 'edited value', 'utf8')\n")
  return { root, editor, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

test('patched tmp keeps external-editor sync creation, editing and cleanup', () => {
  const f = fixture()
  try {
    assert.equal(editorRequire('tmp/package.json').version, '0.2.7')
    const editor = new ExternalEditor('initial value', { dir: f.root, prefix: 'input-' })
    editor.editor = { bin: process.execPath, args: [f.editor] }
    assert.equal(existsSync(editor.tempFile), true)
    assert.equal(editor.run(), 'edited value')
    assert.equal(editor.lastExitStatus, 0)
    editor.cleanup()
    assert.equal(existsSync(editor.tempFile), false)
  } finally {
    f.cleanup()
  }
})

test('patched tmp keeps external-editor async callback and automatic cleanup', async () => {
  const f = fixture()
  const previousVisual = process.env.VISUAL
  try {
    process.env.VISUAL = `${process.execPath} ${f.editor}`
    const value = await new Promise((resolve, reject) => {
      editAsync('initial value', (error, result) => error ? reject(error) : resolve(result), {
        dir: f.root,
        prefix: 'input-',
      })
    })
    assert.equal(value, 'edited value')
    assert.deepEqual(readdirSync(f.root), ['editor.cjs'])
  } finally {
    if (previousVisual === undefined) delete process.env.VISUAL
    else process.env.VISUAL = previousVisual
    f.cleanup()
  }
})

test('patched tmp file callback retains idempotent cleanup within the fixture', async () => {
  const f = fixture()
  try {
    const result = await new Promise((resolve, reject) => {
      tmp.file({ dir: f.root, discardDescriptor: true }, (error, name, fd, cleanup) => {
        if (error) reject(error)
        else resolve({ name, fd, cleanup })
      })
    })
    assert.equal(existsSync(result.name), true)
    assert.equal(result.fd, undefined)
    await new Promise((resolve, reject) => result.cleanup(error => error ? reject(error) : resolve()))
    result.cleanup()
    assert.equal(existsSync(result.name), false)
  } finally {
    f.cleanup()
  }
})
