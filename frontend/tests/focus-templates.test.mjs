import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

async function load(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 } })
  return `data:text/javascript;base64,${Buffer.from(outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))).toString('base64')}`
}
const supportSource = await readFile(new URL('../src/components/molecules/TaskCard/FocusSupport.tsx', import.meta.url), 'utf8')
const supportUrl = await load(supportSource
  .replace("from 'react'", `from '${import.meta.resolve('react')}'`)
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => {}')
  .replace("import styles from './TaskCard.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
let runtime
globalThis.__focusTemplateHooks = {
  useState(initial) {
    const active = runtime, index = active.index++
    if (!(index in active.slots)) active.slots[index] = initial
    return [active.slots[index], next => { active.slots[index] = typeof next === 'function' ? next(active.slots[index]) : next }]
  },
  useEffect(callback, deps) {
    const index = runtime.index++
    if (!runtime.deps[index] || deps.some((dep, i) => dep !== runtime.deps[index][i])) runtime.effects.push(callback)
    runtime.deps[index] = deps
  },
  useEffectEvent: callback => callback,
}
const cardSource = await readFile(new URL('../src/components/molecules/TaskCard/TaskCard.tsx', import.meta.url), 'utf8')
const cardUrl = await load(cardSource
  .replace("import { useEffect, useEffectEvent, useState } from 'react'", 'const { useEffect, useEffectEvent, useState } = globalThis.__focusTemplateHooks')
  .replace("import { GripVertical, Image as ImageIcon, Pause, Play, Volume2 } from 'lucide-react'", 'const GripVertical = () => null, ImageIcon = GripVertical, Pause = GripVertical, Play = GripVertical, Volume2 = GripVertical')
  .replace("import AnswerChoice from '../AnswerChoice'", 'const AnswerChoice = () => null')
  .replace("import { ProgressBar } from '../../atoms'", 'const ProgressBar = () => null')
  .replace("import ActivityTemplate from '../ActivityTemplate'", 'const ActivityTemplate = () => null')
  .replace("import TaskInteraction from '../TaskInteraction'", 'const TaskInteraction = () => null')
  .replace("import { ACTIVITY_TEMPLATE_BY_ID, TASK_TEMPLATE_BY_ID } from '../../../constants/activityTemplates'", 'const ACTIVITY_TEMPLATE_BY_ID = {}, TASK_TEMPLATE_BY_ID = {}')
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => {}')
  .replace("import styles from './TaskCard.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })')
  .replace("from './FocusSupport'", `from '${supportUrl}'`))
const { default: TaskCard } = await import(cardUrl)
const task = { id: 'wash', index: 1, total: 3, title: 'Wash your hands', question: 'Which tool do you use?', choices: ['Soap', 'Pencil'], answer: 'Soap', instruction: 'Use soap and water.', package: 'care', imageUrl: null }
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return tree?.props ? [tree, ...nodes(tree.props.children)] : []
}
function label(tree) {
  if (Array.isArray(tree)) return tree.map(label).join('')
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  return tree?.props ? label(tree.props.children) : ''
}
function harness(index, level = 'active') {
  const active = { slots: [], deps: [], effects: [], index: 0 }, gates = [], timers = []
  return {
    gates,
    render() { runtime = active; active.index = 0; return TaskCard({ task: { ...task, index }, focusTemplate: level, onFocusGateChange: gate => gates.push(gate) }) },
    effects() {
      const previousWindow = globalThis.window
      globalThis.window = { setTimeout: callback => { timers.push(callback); return timers.length }, clearTimeout: () => {} }
      try { active.effects.splice(0).forEach(callback => callback()) } finally { globalThis.window = previousWindow }
    },
    second() { timers.shift()?.() },
  }
}
function click(run, text) {
  const button = nodes(run.render()).find(node => node.type === 'button' && label(node) === text)
  assert.ok(button, `Missing button ${text}`); button.props.onClick()
}
function inert(run) { return nodes(run.render()).find(node => node.props.className === 'focusContent').props.inert }

test('optimal flow keeps the normal lesson available and passive nudges never block it', () => {
  for (const level of ['none', 'passive']) {
    const run = harness(1, level)
    assert.equal(inert(run), false)
    run.effects(); assert.equal(run.gates.at(-1), false)
  }
})
test('rapid check requires a correct tap and the three-second pause before progression', () => {
  const run = harness(1)
  assert.equal(inert(run), true); run.effects()
  click(run, 'Pencil'); assert.equal(inert(run), true)
  click(run, 'Soap'); assert.equal(inert(run), true)
  for (let second = 0; second < 3; second++) { run.second(); run.render(); run.effects() }
  assert.equal(inert(run), false)
  assert.equal(run.gates.at(-1), false)
})
test('recall flip retains the gate until the correct recall response', () => {
  const run = harness(2)
  click(run, 'Flip card')
  assert.ok(nodes(run.render()).some(node => String(node.props.className).includes('flippedRecall')))
  click(run, 'Pencil'); assert.equal(inert(run), true)
  click(run, 'Soap'); assert.equal(inert(run), false)
})
test('critical terms are masked accessibly and a reveal unlocks the original instruction', () => {
  const run = harness(3)
  const tree = run.render()
  const markup = renderToStaticMarkup(createElement(tree.type, tree.props))
  assert.match(markup, /aria-label="Tap to reveal the hidden action word"/)
  assert.match(markup, /••••/)
  tree.props.value.reveal()
  assert.equal(inert(run), false)
})
