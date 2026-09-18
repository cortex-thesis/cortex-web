import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('music eases to silence before pausing, and cancelled fades do not pause', async () => {
  const source = await readFile(new URL('../src/components/molecules/ModeBgm/fadeVolume.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  const { fadeVolume } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
  const saved = { request: globalThis.requestAnimationFrame, cancel: globalThis.cancelAnimationFrame }
  let tick
  globalThis.requestAnimationFrame = callback => { tick = callback; return 1 }
  globalThis.cancelAnimationFrame = () => {}
  try {
    const audio = { volume: 0.1 }
    let paused = false
    const started = performance.now()
    fadeVolume(audio, 0, () => { paused = true })
    tick(started + 325)
    assert.ok(audio.volume > 0 && audio.volume < 0.05)
    assert.equal(paused, false)
    tick(started + 700)
    assert.equal(audio.volume, 0)
    assert.equal(paused, true)
    audio.volume = 0.1
    paused = false
    const cancel = fadeVolume(audio, 0, () => { paused = true })
    cancel()
    tick(performance.now() + 700)
    assert.equal(audio.volume, 0.1)
    assert.equal(paused, false)
    fadeVolume(audio, 0.13)
    tick(performance.now() + 700)
    assert.equal(audio.volume, 0.13)
  } finally {
    globalThis.requestAnimationFrame = saved.request
    globalThis.cancelAnimationFrame = saved.cancel
  }
})
