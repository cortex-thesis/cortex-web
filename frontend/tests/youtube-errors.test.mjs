import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/molecules/ActivityTemplate/ActivityTemplate.tsx', import.meta.url), 'utf8')
function compile(body) {
  return ts.transpileModule(body, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText
    .replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
}
async function moduleFrom(body) { return import(`data:text/javascript;base64,${Buffer.from(compile(body)).toString('base64')}`) }

test('YouTube URL validation accepts supported forms and rejects malformed or misleading links', async () => {
  const body = source.slice(source.indexOf('function youtubeEmbedUrl'), source.indexOf('interface YouTubePlayer'))
  const { default: embed } = await moduleFrom(`${body}; export default youtubeEmbedUrl`)
  for (const url of ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/watch?v=abcdefghijk', 'https://www.youtube.com/shorts/abcdefghijk', 'https://www.youtube-nocookie.com/embed/abcdefghijk']) assert.match(embed(url), /\/embed\/abcdefghijk\?/)
  for (const url of ['https://youtube.com/watch', 'https://youtube.com/watch?v=bad', 'https://fakeyoutube.com/watch?v=abcdefghijk', 'javascript:alert(1)', 'not a url']) assert.equal(embed(url), null)
})

for (const code of [2, 5, 100, 101, 150, 153, 'timeout', 'script']) test(`Unavailable YouTube video (${code}) allows one explicit continuation`, async () => {
  const effects = [], refs = [], state = [null, 0]
  let cursor = 0, stateCursor = 0, timeout, events, continued = 0
  const saved = { window: globalThis.window, document: globalThis.document }
  const host = { replaceChildren(frame) { frame.isConnected = true } }
  globalThis.__videoError = {
    useRef(initial) { const i = cursor++; return refs[i] ??= { current: i === 0 ? host : initial } },
    useState() { const i = stateCursor++; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
    useEffect(fn) { effects.push(fn) }, styles: {}, VideoFallback() {},
  }
  globalThis.window = { setTimeout(fn) { timeout = fn; return 1 }, clearTimeout() {}, clearInterval() {}, addEventListener() {}, removeEventListener() {},
    YT: { Player: class { constructor(frame, options) { events = options.events } destroy() {} } } }
  globalThis.document = { createElement() { return { remove() {} } } }
  try {
    const body = source.slice(source.indexOf('function YouTubeVideo'), source.indexOf('function ActivityTemplate'))
    const { default: Video } = await moduleFrom(`const scenario=${JSON.stringify(code)}; const {useRef,useState,useEffect,styles,VideoFallback}=globalThis.__videoError; const loadYouTubeApi=()=>${code === 'script' ? 'Promise.reject(new Error())' : 'Promise.resolve(window.YT)'}; ${body}; export default YouTubeVideo`)
    Video({ src: 'fixture', title: 'Video', onHalfWatched: () => continued++ })
    effects[0](); const cleanup = effects[1]()
    await Promise.resolve(); await Promise.resolve()
    if (code === 'timeout') timeout()
    else if (typeof code === 'number') events.onError({ data: code })
    assert.notEqual(state[0], null)
    assert.equal(continued, 0)
    cursor = 0; stateCursor = 0
    const output = Video({ src: 'fixture', title: 'Video', onHalfWatched: () => continued++ })
    const fallback = output.props.children[1].props.children[0]
    fallback.props.onContinue(); fallback.props.onContinue()
    assert.equal(continued, 1)
    cleanup()
  } finally { globalThis.window = saved.window; globalThis.document = saved.document; delete globalThis.__videoError }
})
