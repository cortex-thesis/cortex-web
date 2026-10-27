import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/features/help/tourState.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { readTourRun, tourRunKey } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
function storage() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } }
test('original and popup-era progress migrate to the restored tour without retaining popup answers', () => {
  for (const [version, expected] of [['v4', [0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10]], ['v5', [0, 0, 0, 5, 6, 7, 8, 9, 10]]]) {
    expected.forEach((mapped, index) => {
      globalThis.sessionStorage = storage()
      const key = tourRunKey('learner', 'student'), legacy = key.replace(':v6:', `:${version}:`)
      sessionStorage.setItem(legacy, JSON.stringify({ index, phase: 'running', route: '/current', history: Array.from({ length: index }, (_, n) => `/route-${n}`), practiceResponse: 'old popup answer', pending: true }))
      const run = readTourRun(key, 11)
      assert.equal(run.index, mapped)
      assert.equal(run.history.length, mapped)
      assert.equal(run.practiceResponse, undefined)
      assert.equal(run.pending, undefined)
      assert.equal(sessionStorage.getItem(legacy), null)
      assert.deepEqual(readTourRun(key, 11), run)
    })
  }
})
test('migrated real-player routes explicitly use the read-only context', () => {
  globalThis.sessionStorage = storage()
  const key = tourRunKey('learner', 'student')
  sessionStorage.setItem(key.replace(':v6:', ':v4:'), JSON.stringify({ index: 4, phase: 'running', route: '/student/class/7/lesson/41/practice' }))
  assert.equal(readTourRun(key, 11).route, '/student/class/7/lesson/41/practice?context=onboarding&stage=activity')
})
test('teacher state is unchanged and completed or malformed runs cannot reopen', () => {
  globalThis.sessionStorage = storage()
  const key = tourRunKey('teacher', 'teacher')
  assert.match(key, /:v4:teacher:/)
  const run = { index: 5, phase: 'running', route: '/teacher/reports', history: ['/teacher/dashboard'] }
  sessionStorage.setItem(key, JSON.stringify(run))
  assert.deepEqual(readTourRun(key, 10), run)
  for (const value of ['bad json', JSON.stringify({ ...run, index: 10 }), JSON.stringify({ ...run, phase: 'complete' }), JSON.stringify({ ...run, history: [null] })]) {
    sessionStorage.setItem(key, value)
    assert.equal(readTourRun(key, 10), null)
  }
})
