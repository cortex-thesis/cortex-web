import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/museReadiness.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { museSignalReady } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('Bluetooth connection alone, missing or stale analysis, and rejected channels cannot indicate signal readiness', () => {
  assert.equal(museSignalReady('streaming', 0, 10000, 10000), false)
  assert.equal(museSignalReady('streaming', 4, null, 10000), false)
  assert.equal(museSignalReady('streaming', 4, 4000, 10000), false)
  assert.equal(museSignalReady('streaming', 4, 11000, 10000), false)
  assert.equal(museSignalReady('connecting', 4, 10000, 10000), false)
})
test('fresh usable readings recover readiness without needing a new session', () => {
  assert.equal(museSignalReady('error', 0, null, 10000), false)
  assert.equal(museSignalReady('streaming', 1, 10000, 10000), true)
  assert.equal(museSignalReady('streaming', 4, 10000, 15000), true)
  assert.equal(museSignalReady('streaming', 4, 10000, 15001), false)
})
