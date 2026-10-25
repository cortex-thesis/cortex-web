import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = (await readFile(new URL('../src/lib/api.ts', import.meta.url), 'utf8'))
  .replace("import.meta.env.VITE_API_URL ?? '/api'", "'/api'")
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { api, primeApiCache, cachedApiValue, clearApiCache, setApiCacheOwner, updateApiSyncRevision } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const storage = new Map()
globalThis.localStorage = {
  get length() { return storage.size },
  key: (index) => [...storage.keys()][index] ?? null,
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
}
globalThis.document = { cookie: 'csrftoken=test-token' }
const response = (value) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } })

test('home data survives navigation, time and telemetry but refreshes after local progress and a new sync', async () => {
  clearApiCache()
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  let reads = 0
  globalThis.fetch = async (_url, options) => response((options.method ?? 'GET') === 'GET' ? { version: ++reads } : { saved: true })
  try {
    updateApiSyncRevision('sync-1')
    await api('/student/dashboard/')
    await api('/student/sessions/?home=1')
    now += 60 * 60 * 1000
    await api('/sessions/test/eeg/', { method: 'POST', body: '{}' })
    await api('/sessions/test/control/', { method: 'POST', body: '{"action":"heartbeat"}' })
    updateApiSyncRevision('sync-1')
    await api('/student/dashboard/')
    await api('/student/sessions/?home=1')
    assert.equal(reads, 2)
    await api('/sessions/test/slides/1/', { method: 'POST', body: '{"action":"complete"}' })
    await api('/student/sessions/?home=1')
    assert.equal(reads, 3)
    updateApiSyncRevision('sync-2')
    await api('/student/sessions/?home=1')
    assert.equal(reads, 4)
  } finally { Date.now = originalNow; storage.delete('cortex-last-sync-revision') }
})

test('profile reads preserve other page data and authentication always reaches the server', async () => {
  clearApiCache()
  let requests = 0
  globalThis.fetch = async () => { requests++; return response({ name: 'Teacher' }) }
  primeApiCache('/classes/', { classes: [1] })
  await api('/teacher/profile/')
  assert.deepEqual(await api('/classes/'), { classes: [1] })
  assert.equal(requests, 1)
  await api('/auth/me/')
  await api('/auth/me/')
  assert.equal(requests, 3)
})

test('concurrent page reads share one request', async () => {
  clearApiCache()
  let finish
  let requests = 0
  globalThis.fetch = () => { requests++; return new Promise((resolve) => { finish = resolve }) }
  const first = api('/classes/')
  const second = api('/classes/')
  finish(response({ classes: [2] }))
  assert.deepEqual(await first, await second)
  assert.equal(requests, 1)
})

test('mutations keep CSRF and credentials and prevent old requests restoring cache', async () => {
  clearApiCache()
  let finish
  globalThis.fetch = (_url, options) => {
    if (options.method === 'POST') {
      assert.equal(options.credentials, 'include')
      assert.equal(options.headers.get('X-CSRFToken'), 'test-token')
      return Promise.resolve(response({ saved: true }))
    }
    return new Promise((resolve) => { finish = resolve })
  }
  const oldRequest = api('/classes/')
  await api('/classes/', { method: 'POST', body: '{}' })
  finish(response({ classes: ['old'] }))
  await oldRequest
  assert.equal(cachedApiValue('/classes/'), undefined)
})

test('reports bypass cache and cached data expires without extending its lifetime', async () => {
  clearApiCache()
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  try {
    let requests = 0
    globalThis.fetch = async () => response({ version: ++requests })
    primeApiCache('/report/', { version: 0 })
    assert.deepEqual(await api('/report/', { cache: 'no-store' }), { version: 1 })
    assert.deepEqual(await api('/report/', { cache: 'no-store' }), { version: 2 })
    primeApiCache('/classes/', { version: 0 })
    now += 29_000
    assert.deepEqual(await api('/classes/'), { version: 0 })
    now += 2_000
    assert.deepEqual(await api('/classes/'), { version: 3 })
  } finally { Date.now = originalNow }
})

test('clearing an account removes legacy cache and isolates outstanding reads', async () => {
  clearApiCache()
  storage.set('cortex-api-v2:/classes/', 'old account')
  let finish
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve })
  const oldRequest = api('/classes/')
  clearApiCache()
  assert.equal(storage.size, 0)
  finish(response({ private: 'old account' }))
  await oldRequest
  assert.equal(cachedApiValue('/classes/'), undefined)
})

test('cached dashboard data is isolated between signed-in accounts', () => {
  setApiCacheOwner('student-a')
  primeApiCache('/student/dashboard/', { classes: ['A'] })
  assert.deepEqual(cachedApiValue('/student/dashboard/'), { classes: ['A'] })
  setApiCacheOwner('student-b')
  assert.equal(cachedApiValue('/student/dashboard/'), undefined)
  primeApiCache('/student/dashboard/', { classes: [] })
  assert.deepEqual(cachedApiValue('/student/dashboard/'), { classes: [] })
  setApiCacheOwner(null)
})
