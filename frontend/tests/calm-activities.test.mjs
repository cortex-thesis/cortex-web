import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

function load(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } })
  const resolved = outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
  return import(`data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`)
}
const { nextCalmActivity } = await load(await readFile(new URL('../src/lib/calmActivities.ts', import.meta.url), 'utf8'))
test('shuffled rotation visits all six calm activities before repeating', () => {
  const deck = []
  for (let cycle = 0; cycle < 3; cycle++) {
    const activities = Array.from({ length: 6 }, () => nextCalmActivity(deck, () => .3))
    assert.deepEqual([...activities].sort(), [0, 1, 2, 3, 4, 5])
  }
})

let slots, cursor, effects
globalThis.__calmHooks = {
  useState(initial) {
    const index = cursor++
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
  },
  useEffect(callback) { effects.push(callback) },
}
const source = (await readFile(new URL('../src/pages/student/CalmActivity.tsx', import.meta.url), 'utf8'))
  .replace("import { useEffect, useState } from 'react'", 'const { useEffect, useState } = globalThis.__calmHooks')
  .replace("import styles from './CalmActivity.module.css'", 'const styles = {}')
const { default: CalmActivity } = await load(source)
function nodes(tree) { return Array.isArray(tree) ? tree.flatMap(nodes) : tree?.props ? [tree, ...nodes(tree.props.children)] : [] }
function harness(kind) {
  slots = []; effects = []
  return { render(paused = false) { cursor = 0; effects = []; return CalmActivity({ paused, nextActivity: () => kind }) } }
}
test('typed grounding accepts personal observations and clears each prompt', () => {
  const run = harness(0)
  for (let step = 0; step < 3; step++) {
    assert.equal(nodes(run.render()).find(node => node.type === 'textarea').props.value, '')
    assert.equal(nodes(run.render()).find(node => node.props.children === 'Next prompt').props.disabled, true)
    nodes(run.render()).find(node => node.type === 'textarea').props.onChange({ target: { value: 'My own observation' } })
    assert.equal(nodes(run.render(true)).find(node => node.type === 'textarea').props.disabled, true)
    nodes(run.render(true)).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(nodes(run.render()).find(node => node.type === 'textarea').props.value, 'My own observation')
    nodes(run.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  }
  const next = nodes(run.render()).find(node => node.props.children === 'Try another calm activity')
  assert.ok(next); next.props.onClick()
  assert.equal(nodes(run.render()).find(node => node.type === 'textarea').props.value, '')
})

test('grounding allows skipping and does not advance on whitespace', () => {
  const run = harness(0)
  nodes(run.render()).find(node => node.type === 'textarea').props.onChange({ target: { value: '   ' } })
  nodes(run.render()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.ok(nodes(run.render()).find(node => node.props.children === 'Find 3 things you can see.'))
  for (let step = 0; step < 3; step++) nodes(run.render()).find(node => node.props.children === 'Skip this prompt').props.onClick()
  assert.ok(nodes(run.render()).find(node => node.props.children === 'Try another calm activity'))
})
test('matching requires the correct shape and paused activities disable interaction', () => {
  const run = harness(2)
  nodes(run.render()).find(node => node.props['aria-label'] === 'Red triangle').props.onClick()
  assert.ok(nodes(run.render()).find(node => node.props.role === 'status'))
  assert.equal(nodes(run.render(true)).find(node => node.props['aria-label'] === 'Blue circle').props.disabled, true)
  nodes(run.render()).find(node => node.props['aria-label'] === 'Blue circle').props.onClick()
  assert.ok(nodes(run.render()).find(node => node.props.children === 'Try another calm activity'))
})
