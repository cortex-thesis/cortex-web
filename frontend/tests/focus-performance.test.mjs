import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/focusPerformance.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { getFocusPerformance } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('recognizes focused and relaxed time together, including mostly relaxed sessions', () => {
  for (const distribution of [
    { focused: 40, relaxed: 45, distracted: 10, overstimulated: 5 },
    { focused: 5, relaxed: 95, distracted: 0, overstimulated: 0 },
    { focused: 55, relaxed: 0, distracted: 30, overstimulated: 15 },
  ]) {
    const performance = getFocusPerformance(distribution.focused, distribution)
    assert.equal(performance.phrase, 'Calm and focused')
    assert.equal(performance.color, '#1D9E75')
  }
})

test('keeps the existing message for mixed, difficult, or unrecorded sessions', () => {
  for (const distribution of [
    { focused: 20, relaxed: 20, distracted: 40, overstimulated: 20 },
    { focused: 25, relaxed: 25, distracted: 25, overstimulated: 25 },
    { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0 },
  ]) assert.equal(getFocusPerformance(distribution.focused, distribution).phrase, 'Finding your rhythm')
  assert.equal(getFocusPerformance(40).phrase, 'Finding your rhythm')
})

test('preserves existing descriptions for higher focused scores', () => {
  for (const [score, phrase] of [[80, 'Excellent focus'], [70, 'Steady focus'], [60, 'Growing focus']]) {
    assert.equal(getFocusPerformance(score).phrase, phrase)
  }
})
