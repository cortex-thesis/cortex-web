import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/pages/student/introductionPersistence.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }
test('introduction progress and completion survive module reload and remain isolated by account and role', async () => {
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage()
  const first = await import(`${moduleUrl}#first`)
  const key = first.introductionKey('one', 'student')
  first.saveIntroduction(key, { step: 1 })
  first.rememberIntroductionAnimation(key)
  const reload = await import(`${moduleUrl}#reload`)
  assert.deepEqual(reload.readIntroduction(key), { step: 1 })
  assert.equal(reload.hasPlayedIntroduction(key), true)
  assert.deepEqual(reload.readIntroduction(first.introductionKey('two', 'student')), { step: 0 })
  assert.deepEqual(reload.readIntroduction(first.introductionKey('one', 'teacher')), { step: 0 })
  reload.saveIntroduction(key, { step: 2, status: 'completed' })
  assert.deepEqual(first.readIntroduction(key), { step: 2, status: 'completed' })
})
test('invalid stored progress is rejected and unavailable storage uses memory', async () => {
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage()
  const api = await import(`${moduleUrl}#fallback`)
  const key = api.introductionKey('fallback', 'student')
  for (const value of ['bad json', '{"step":99}', '{"step":-1}', '{"step":1,"status":"unknown"}']) {
    localStorage.setItem(key, value)
    assert.deepEqual(api.readIntroduction(key), { step: 0 })
  }
  const unavailable = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }
  globalThis.localStorage = unavailable; globalThis.sessionStorage = unavailable
  api.saveIntroduction(key, { step: 1, status: 'dismissed' })
  api.rememberIntroductionAnimation(key)
  assert.deepEqual(api.readIntroduction(key), { step: 1, status: 'dismissed' })
  assert.equal(api.hasPlayedIntroduction(key), true)
})
