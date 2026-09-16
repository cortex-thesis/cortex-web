import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/eegTransitions.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { eegSessionPhase, nextEEGMode, sustainedEEGState } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
test('lesson boundaries keep calm states in the lesson and divert other states', () => {
  for (const state of ['focused', 'relaxed', null]) assert.equal(nextEEGMode(state, 'lesson'), 'focus')
  assert.equal(nextEEGMode('overstimulated', 'lesson'), 'breathing')
  assert.equal(nextEEGMode('distracted', 'lesson'), 'refocus')
})
test('completed refocusing activities return only with a recovered state', () => {
  for (const state of ['focused', 'relaxed']) assert.equal(nextEEGMode(state, 'refocus'), 'focus')
  for (const state of ['distracted', null]) assert.equal(nextEEGMode(state, 'refocus'), 'refocus')
  assert.equal(nextEEGMode('overstimulated', 'refocus'), 'breathing')
})
test('breathing never automatically dismisses on a state change', () => {
  for (const state of ['focused', 'relaxed', 'distracted', 'overstimulated', null]) assert.equal(nextEEGMode(state, 'breathing'), 'breathing')
})

test('breaks require five continuous seconds of the same state', () => {
  for (const state of ['distracted', 'overstimulated']) {
    assert.equal(sustainedEEGState(state, 1000, 5999), null)
    assert.equal(sustainedEEGState(state, 1000, 6000), state)
    assert.equal(sustainedEEGState(state, 9000, 10000), null)
  }
  assert.equal(sustainedEEGState(null, 0, 10000), null)
  assert.equal(sustainedEEGState('focused', 10000, 10000), 'focused')
})
test('finishing a lesson bypasses regulation for every state', () => {
  for (const state of ['focused', 'relaxed', 'distracted', 'overstimulated', null]) assert.equal(nextEEGMode(state, 'lesson', true), 'focus')
})

test('completion takes priority over calibration after signal loss or disconnect', () => {
  for (const calibrated of [false, true]) {
    assert.equal(eegSessionPhase(true, false, calibrated), 'complete')
    assert.equal(eegSessionPhase(false, true, calibrated), 'complete')
    assert.equal(eegSessionPhase(true, true, calibrated), 'complete')
  }
  assert.equal(eegSessionPhase(false, false, false), 'calibrating')
  assert.equal(eegSessionPhase(false, false, true), 'active')
})
