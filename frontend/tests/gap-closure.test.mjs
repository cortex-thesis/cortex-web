import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const live = await readFile(new URL('../src/pages/student/LiveEEG.tsx', import.meta.url), 'utf8')
const start = live.indexOf('  useEffect(() => {', live.indexOf('const highlightEligible'))
const source = live.slice(start, live.indexOf('  const highlightImportantWords', start))
for (const state of ['distracted', 'overstimulated']) test(`${state} highlighting waits five seconds and cancels at state/activity/completion boundaries`, () => {
  let callback, cleanup, ready = '', id = 0
  const timers = new Map()
  const window = { setTimeout(fn, delay) { assert.equal(delay, 5000); timers.set(++id, fn); return id }, clearTimeout(key) { timers.delete(key) } }
  const run = (eligible, key) => {
    cleanup?.()
    Function('useEffect', 'queueMicrotask', 'window', 'highlightEligible', 'highlightKey', 'setHighlightReady', source)(fn => { callback = fn }, fn => fn(), window, eligible, key, value => { ready = value })
    cleanup = callback()
  }
  run(true, `activity1/${state}`)
  assert.equal(ready, '')
  assert.equal(timers.size, 1)
  run(false, 'focused')
  assert.equal(timers.size, 0)
  assert.equal(ready, '')
  run(true, `activity2/${state}`)
  assert.equal(ready, '')
  ;[...timers.values()][0]()
  assert.equal(ready, `activity2/${state}`)
  run(false, 'complete')
  assert.equal(ready, '')
  assert.equal(timers.size, 0)
  cleanup()
  assert.equal(timers.size, 0)
})

test('brainwave panel shows score units, capture time, missing bands and stale/disconnected states', async () => {
  const ts = (await import('typescript')).default
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  let source = await readFile(new URL('../src/components/molecules/EEGWaveDisplay/EEGWaveDisplay.tsx', import.meta.url), 'utf8')
  source = source.replace("import RecordedWaveforms from './RecordedWaveforms'", 'const RecordedWaveforms = () => null')
    .replace("import { useEffect, useState } from 'react'", 'const useEffect = () => {}; const useState = () => [Date.parse("2026-01-02T00:00:00Z")]')
    .replace("import { StateBadge } from '../../atoms'", 'const StateBadge = () => null')
    .replace("import styles from './EEGWaveDisplay.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })')
    .replace("import clsx from 'clsx'", 'const clsx = (...args) => args.filter(Boolean).join(" ")')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))
  const { EEGWaveDisplay } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  const props = { recordedAt: '2026-01-01T00:00:00Z', connectionStatus: 'connected', bandPowers: { theta: 1.25, alpha: NaN, beta: 1, gamma: 1 } }
  const html = renderToStaticMarkup(createElement(EEGWaveDisplay, props))
  assert.match(html, /1.25.*x baseline/)
  assert.match(html, /Alpha.*unavailable/)
  assert.match(html, /Stale recorded data/)
  assert.match(renderToStaticMarkup(createElement(EEGWaveDisplay, { ...props, recordedAt: '2026-01-02T00:00:00Z' })), /Latest recorded data/)
  assert.match(renderToStaticMarkup(createElement(EEGWaveDisplay, { ...props, recordedAt: 'invalid' })), /Update time unavailable/)
  assert.match(html, /dateTime="2026-01-01T00:00:00Z"/i)
  assert.match(renderToStaticMarkup(createElement(EEGWaveDisplay, { ...props, connectionStatus: 'offline' })), /Disconnected/)
  assert.match(renderToStaticMarkup(createElement(EEGWaveDisplay)), /Waiting for EEG data/)
})

test('recorded waveform replay renders actual samples, channel order, empty and loading states', async () => {
  const ts = (await import('typescript')).default
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const original = await readFile(new URL('../src/components/molecules/EEGWaveDisplay/RecordedWaveforms.tsx', import.meta.url), 'utf8')
  const source = original.replace("import { useEffect, useState } from 'react'", 'const useEffect = () => {}; const useState = () => [globalThis.__replayStates.shift(), () => {}]')
    .replace("import { api } from '../../../lib/api'", 'const api = () => Promise.resolve({})')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))
  const { default: Replay } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  const render = (data, error = '') => {
    globalThis.__replayStates = [data, 0, error, 0]
    return renderToStaticMarkup(createElement(Replay, { sessionId: 'fixture' }))
  }
  const recording = { recording: { ended_at: '2026-01-01T00:01:00Z', sampling_rate_hz: 256, channel_names: ['TP9', 'AF7'] }, chunks: [{ sequence_number: 1, captured_at: '2026-01-01T00:00:00Z', start_offset_ms: 0, end_offset_ms: 2000, samples: { TP9: [0, 1, 0], AF7: [] } }], next_after: 1 }
  const html = render(recording)
  assert.match(html, /Recorded samples, not a live signal/)
  assert.match(html, /256.*Hz/)
  assert.match(html, /points="0,45 150,5 300,45"/)
  assert.match(html, /AF7.*samples unavailable/)
  assert.match(html, /Recording complete/)
  assert.match(render({ ...recording, chunks: [] }), /No further recorded samples/)
  assert.match(render(null), /Loading recording/)
  assert.match(render(null, 'Disconnected'), /Disconnected/)
  delete globalThis.__replayStates
})

test('presentation instrumentation uses one browser clock, bounded entries and no personal data', async () => {
  const ts = (await import('typescript')).default
  const source = await readFile(new URL('../src/lib/presentationTiming.ts', import.meta.url), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const { measurePresentation } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  const at = performance.now()
  measurePresentation(at, 'state-render', 1)
  measurePresentation(at, 'state-render', 2)
  const entries = performance.getEntriesByName('cortex:state-render')
  assert.equal(entries.length, 1)
  assert.ok(entries[0].duration >= 0)
  assert.deepEqual(entries[0].detail, { sequence: 2, clock: 'browser-monotonic', boundary: 'react-effect' })
  performance.clearMeasures('cortex:state-render')
})

test('lesson image failure offers retry without substituting instructional content', async () => {
  const ts = (await import('typescript')).default
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const original = await readFile(new URL('../src/components/molecules/ActivityTemplate/ActivityTemplate.tsx', import.meta.url), 'utf8')
  const body = original.slice(original.indexOf('function LessonImage'), original.indexOf('function MediaButton'))
  let failed = false
  globalThis.__imageState = () => [failed, () => {}]
  const js = ts.transpileModule(`const useState = () => globalThis.__imageState(); ${body}; export default LessonImage`, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))
  const { default: Image } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  assert.match(renderToStaticMarkup(createElement(Image, { src: '/lesson-image.png', alt: 'Original lesson image' })), /Original lesson image/)
  failed = true
  const html = renderToStaticMarkup(createElement(Image, { src: '/lesson-image.png', alt: 'Original lesson image' }))
  assert.match(html, /Image unavailable/)
  assert.match(html, /Retry image/)
  assert.doesNotMatch(html, /<img/)
  delete globalThis.__imageState
})
