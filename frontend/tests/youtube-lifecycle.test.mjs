import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('YouTube recreates its iframe after Activity cleanup without losing completion', async () => {
  const source = await readFile(new URL('../src/components/molecules/ActivityTemplate/ActivityTemplate.tsx', import.meta.url), 'utf8')
  const body = source.slice(source.indexOf('function YouTubeVideo('), source.indexOf('function ActivityTemplate('))
  const refs = [], effects = [], frames = []
  let cursor = 0, completed = 0, poll
  const host = { replaceChildren(frame) { this.frame = frame; frame.isConnected = true } }
  const saved = { window: globalThis.window, document: globalThis.document }
  globalThis.__youtubeTest = {
    useState(initial) { return [initial, () => {}] },
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: i === 0 ? host : initial } },
    useEffect(callback) { effects.push(callback) },
    styles: { video: 'video', youtubeHost: 'youtubeHost' },
  }
  globalThis.window = {
    addEventListener() {}, removeEventListener() {},
    setInterval(callback) { poll = callback; return 1 }, clearInterval() { poll = null },
    YT: { Player: class {
      constructor(frame, options) { this.frame = frame; options.events.onReady() }
      getCurrentTime() { return 60 }
      getDuration() { return 100 }
      pauseVideo() {}
      destroy() { this.frame.remove() }
    } },
  }
  globalThis.document = { createElement() { const frame = { remove() { this.isConnected = false } }; frames.push(frame); return frame } }
  try {
    const { outputText } = ts.transpileModule(`const {useRef,useEffect,useState,styles}=globalThis.__youtubeTest; const loadYouTubeApi=()=>Promise.resolve(window.YT); ${body}; export default YouTubeVideo`,
      { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } })
    const resolved = outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
    const { default: Video } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
    Video({ src: 'https://www.youtube.com/embed/test', title: 'Lesson', onHalfWatched: () => completed++ })
    effects[0]()
    const cleanup = effects[1]()
    await Promise.resolve()
    assert.equal(host.frame.isConnected, true)
    poll()
    assert.equal(completed, 1)
    cleanup()
    assert.equal(frames[0].isConnected, false)
    const cleanupAgain = effects[1]()
    await Promise.resolve()
    assert.equal(frames.length, 2)
    assert.equal(host.frame.isConnected, true)
    assert.equal(host.frame.src, 'https://www.youtube.com/embed/test')
    poll()
    assert.equal(completed, 1)
    cleanupAgain()
  } finally {
    globalThis.window = saved.window
    globalThis.document = saved.document
    delete globalThis.__youtubeTest
  }
})
