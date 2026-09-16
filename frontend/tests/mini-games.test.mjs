import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import ts from 'typescript'

async function load(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))).toString('base64')}`)
}
const logicSource = await readFile(new URL('../src/lib/miniGameLogic.ts', import.meta.url), 'utf8')
const logic = await load(logicSource)
const source = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.tsx', import.meta.url), 'utf8')
const games = await load(source
  .replace("from 'react'", `from '${import.meta.resolve('react')}'`)
  .replace("import { Backpack, Clock, Eraser, Folder, NotebookPen, Ruler } from 'lucide-react'", "const Backpack = () => null, Clock = Backpack, Eraser = Backpack, Folder = Backpack, NotebookPen = Backpack, Ruler = Backpack")
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import { validObjectSelection, wordAtEndpoints } from '../../../lib/miniGameLogic'", logicSource)
  .replace("import styles from './MiniGames.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })')
  .replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime')))

let active
globalThis.__miniGameHooks = {
  useState(initial) {
    const runtime = active, index = runtime.index++
    if (!(index in runtime.slots)) runtime.slots[index] = initial
    return [runtime.slots[index], value => { runtime.slots[index] = typeof value === 'function' ? value(runtime.slots[index]) : value }]
  },
  useRef(initial) {
    const runtime = active, index = runtime.index++
    if (!(index in runtime.slots)) runtime.slots[index] = { current: initial }
    return runtime.slots[index]
  },
  useEffect() {},
}
const interactive = await load(source
  .replace("import { Children, useEffect, useRef, useState } from 'react'", `import { Children } from '${import.meta.resolve('react')}'; const {useEffect, useRef, useState} = globalThis.__miniGameHooks`)
  .replace("import { Backpack, Clock, Eraser, Folder, NotebookPen, Ruler } from 'lucide-react'", 'const Backpack = () => null, Clock = Backpack, Eraser = Backpack, Folder = Backpack, NotebookPen = Backpack, Ruler = Backpack')
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import { validObjectSelection, wordAtEndpoints } from '../../../lib/miniGameLogic'", logicSource)
  .replace("import styles from './MiniGames.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
function harness(name, task) {
  const runtime = { slots: [], index: 0 }, answers = []
  let changed = 0
  return {
    answers, get changed() { return changed },
    render() { active = runtime; runtime.index = 0; return interactive[name]({ task, onAnswered: (correct, value) => answers.push({ correct, value: JSON.parse(value) }), onChanged: () => changed++ }) },
  }
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('')
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  return tree?.props ? text(tree.props.children) : ''
}
function click(run, label) {
  const button = nodes(run.render()).find(node => node.type === 'button' && text(node) === label)
  assert.ok(button, `Missing button: ${label}`)
  assert.ok(!button.props.disabled, `Disabled button: ${label}`)
  button.props.onClick()
}

test('word selection supports forward/reverse horizontal and vertical endpoints', () => {
  const targets = [{ word: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }, { word: 'DRY', cells: [[1,4], [2,4], [3,4]] }]
  assert.equal(logic.wordAtEndpoints(targets, [], [0,0], [0,3])?.word, 'SOAP')
  assert.equal(logic.wordAtEndpoints(targets, [], [0,3], [0,0])?.word, 'SOAP')
  assert.equal(logic.wordAtEndpoints(targets, [], [1,4], [3,4])?.word, 'DRY')
  assert.equal(logic.wordAtEndpoints(targets, ['SOAP'], [0,0], [0,3]), undefined)
  assert.equal(logic.wordAtEndpoints(targets, [], [0,0], [2,2]), undefined)
})
test('Find It accepts appropriate subsets without allowing distractors or duplicates', () => {
  assert.equal(logic.validObjectSelection(['rice', 'water'], ['rice', 'egg', 'water'], true, 2), true)
  assert.equal(logic.validObjectSelection(['rice'], ['rice', 'egg', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['rice', 'candy'], ['rice', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['rice', 'rice'], ['rice', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['water', 'rice'], ['rice', 'water']), true)
})
test('all reusable games initialize and render accessible buttons', () => {
  const task = { id: 'test', items: [{ id: 'pencil', label: 'Pencil', imageUrl: '/pencil.png', price: 8 }, { id: 'book', label: 'Book', price: 15 }], correctItemIds: ['pencil'], grid: Array.from({ length: 7 }, () => Array(7).fill('X')), targets: [{ word: 'SOAP', displayLabel: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }], rounds: [{ direction: 'Tap the pencil, then the book.', correctOrder: ['pencil', 'book'] }], targetItemId: 'pencil', paymentOptions: [10,20], payment: 10, givenChange: 2 }
  for (const name of ['FindIt', 'WordSearch', 'AudioSequence', 'Shopping']) {
    const markup = renderToStaticMarkup(createElement(games[name], { task }))
    assert.match(markup, /type="button"/)
    assert.doesNotMatch(markup, /countdown|lives left|time remaining/i)
  }
  const audio = renderToStaticMarkup(createElement(games.AudioSequence, { task }))
  assert.doesNotMatch(audio, /Tap the pencil, then the book/)
  assert.match(audio, /Show a visual prompt/)
  assert.match(audio, /disabled/)
})
test('word hunt has pointer and keyboard button paths and calm responsive styles', async () => {
  assert.match(source, /onPointerUp/)
  assert.match(source, /onClick/)
  assert.match(source, /onPointerCancel/)
  const css = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.module.css', import.meta.url), 'utf8')
  assert.match(css, /min-height: 44px/)
  assert.match(css, /focus-visible/)
  assert.match(css, /max-width: 380px/)
  assert.doesNotMatch(css, /animation:/)
})

test('flip cards use balanced three-column rows and two columns on small screens', async () => {
  const css = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.flipGrid\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 600px\)\s*\{\s*\.flipGrid\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
})

test('Find It handler feedback, incorrect selections, reset and completion', () => {
  const task = { items: [{ id: 'soap', label: 'Soap' }, { id: 'pencil', label: 'Pencil' }], correctItemIds: ['soap'] }
  const run = harness('FindIt', task)
  click(run, 'Pencil'); click(run, 'Check my choices')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Reset'); assert.equal(run.changed, 1)
  click(run, 'Soap'); click(run, 'Check my choices')
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.picked, ['soap'])
})
test('word endpoint handlers complete once and reset found progress', () => {
  const run = harness('WordSearch', { grid: [['S','O','A','P']], targets: [{ word: 'SOAP', displayLabel: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }] })
  nodes(run.render()).find(node => node.props?.['data-cell'] === '0,0').props.onClick()
  nodes(run.render()).find(node => node.props?.['data-cell'] === '0,3').props.onClick()
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.found, ['SOAP'])
  assert.ok(nodes(run.render()).filter(node => node.props?.['data-cell']).every(node => node.props.className.includes('found')))
  assert.match(text(run.render()), /Found/)
  click(run, 'Reset'); assert.equal(run.changed, 1)
  assert.match(text(run.render()), /0 of 1 found/)
})
test('audio replay, playback gate, sequence completion and requested prompt evidence', () => {
  const utterances = []
  globalThis.window = { speechSynthesis: { cancel() {}, speak(value) { utterances.push(value) } } }
  globalThis.SpeechSynthesisUtterance = class { constructor(value) { this.text = value } }
  const run = harness('AudioSequence', { items: [{ id: 'pencil', label: 'Pencil' }, { id: 'book', label: 'Book' }], rounds: [{ direction: 'Tap the pencil, then the book.', correctOrder: ['pencil','book'] }] })
  assert.doesNotMatch(text(run.render()), /Tap the pencil, then the book/)
  click(run, '▶ Listen')
  assert.equal(nodes(run.render()).find(node => node.type === 'button' && text(node) === 'Pencil').props.disabled, true)
  utterances.at(-1).onend()
  click(run, '↻ Listen again'); utterances.at(-1).onend()
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(run.answers.at(-1).value.rounds[0].completion_support, 'after_replay')
  assert.equal(run.answers.at(-1).value.rounds[0].replays, 1)
  click(run, 'Reset activity'); click(run, 'Show a visual prompt')
  assert.match(text(run.render()), /Tap the pencil, then the book/)
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).value.rounds.length, 1)
  assert.equal(run.answers.at(-1).value.rounds[0].completion_support, 'with_visual_prompt')
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance
})
test('shopping handlers run a complete transaction and reject insufficient payment', () => {
  const task = { items: [{ id: 'pencil', label: 'Pencil', price: 8 }, { id: 'book', label: 'Book', price: 15 }], targetItemId: 'pencil', paymentOptions: [5,10,20], payment: 10, givenChange: 2 }
  const run = harness('Shopping', task)
  click(run, 'Pencil₱8'); click(run, '₱8'); click(run, 'Pay ₱5')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Restart transaction')
  click(run, 'Pencil₱8'); click(run, '₱8'); click(run, 'Pay ₱10'); click(run, 'Yes')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(run.answers.at(-1).value.change, 2)
  assert.equal(run.answers.at(-1).value.verified, true)
})

test('listening retry retains playback readiness and does not require a replay', () => {
  const utterances = []
  globalThis.window = { speechSynthesis: { cancel() {}, speak(value) { utterances.push(value) } } }
  globalThis.SpeechSynthesisUtterance = class {}
  const run = harness('AudioSequence', { items: [{id:'pencil',label:'Pencil'},{id:'book',label:'Book'}], rounds:[{direction:'A story.',correctOrder:['pencil','book']}] })
  click(run, '▶ Listen'); utterances[0].onend()
  click(run, 'Book'); click(run, 'Pencil')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Try this round again')
  assert.equal(nodes(run.render()).find(node => node.type === 'button' && text(node) === 'Pencil').props.disabled, false)
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(utterances.length, 1)
  assert.equal(run.answers.at(-1).value.rounds[0].replays, 0)
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance
})

test('flip cards hide content, retry mismatches, retain matched pairs and reset', () => {
  const run = harness('FlipMatching', { pairs: [{id:'egg',left:{label:'Egg',imageUrl:'/egg.png'},right:{label:'Builds the body'}},{id:'rice',left:{label:'Rice',imageUrl:'/rice.png'},right:{label:'Gives energy'}}] })
  assert.doesNotMatch(text(run.render()), /Gives energy|Builds the body/)
  const deck = nodes(run.render()).filter(node => node.type === 'button' && node.key?.includes(':'))
  const flip = key => nodes(run.render()).find(node => node.key === key).props.onClick()
  assert.equal(deck.length, 4)
  flip('egg:picture'); flip('rice:meaning')
  assert.equal(run.answers.at(-1).correct, false)
  assert.doesNotMatch(text(run.render()), /Turn cards back/)
  flip('egg:picture'); flip('rice:meaning')
  flip('egg:picture'); flip('egg:meaning')
  assert.match(text(run.render()), /1 of 2 pairs matched/)
  flip('rice:picture'); flip('rice:meaning')
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.matched, ['egg','rice'])
  click(run, 'Reset cards')
  assert.match(text(run.render()), /0 of 2 pairs matched/)
  flip('egg:picture'); flip('rice:meaning')
  flip('rice:picture')
  assert.equal(nodes(run.render()).find(node => node.key === 'egg:picture').props['aria-pressed'], false)
  assert.equal(nodes(run.render()).find(node => node.key === 'rice:picture').props['aria-pressed'], true)
  flip('rice:meaning')
  assert.match(text(run.render()), /1 of 2 pairs matched/)
})
test('reduced presentation pages objects but retains all configured choices', () => {
  const task = { items: Array.from({length: 6}, (_, i) => ({ id: String(i), label: `Object ${i}` })), correctItemIds: ['5'] }
  const markup = renderToStaticMarkup(createElement(games.FindIt, { task, quiet: true }))
  assert.match(markup, /More objects/)
  assert.match(markup, /Group 1 of 3/)
  assert.match(markup, /Object 0/)
  assert.doesNotMatch(markup, /Object 5/)
  assert.equal(task.items.length, 6)
})
