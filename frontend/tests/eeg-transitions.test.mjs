import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/eegTransitions.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { eegSessionPhase, nextEEGMode, sustainedEEGState, advanceEEGHoldMeter, emptyEEGHoldMeter, heldFocusTemplate, queuedFocusTemplate, breathingResumeUnlocked, focusTemplateForScore } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

test('triggered support survives focused readings, signal loss, and changing scores for the current activity', () => {
  for (const support of ['passive', 'active', 'rest']) {
    assert.equal(queuedFocusTemplate('none', support), support)
    for (const candidate of ['none', 'passive', 'active', 'rest']) assert.equal(queuedFocusTemplate(support, candidate), support)
  }
  assert.equal(queuedFocusTemplate('none', 'none'), 'none')
})

test('signal loss keeps a started lesson active but initial calibration still waits for a valid signal', () => {
  assert.equal(eegSessionPhase(false, false, false, false), 'calibrating')
  assert.equal(eegSessionPhase(false, false, true, false), 'active')
  assert.equal(eegSessionPhase(false, false, false, true), 'active')
  assert.equal(eegSessionPhase(true, false, false, true), 'complete')
})

test('breathing Continue unlocks after recovery and stays available through overstimulation or signal loss', () => {
  assert.equal(breathingResumeUnlocked(false, 'focused', 14), false)
  assert.equal(breathingResumeUnlocked(false, 'overstimulated', 15), false)
  for (const state of ['focused', 'relaxed']) assert.equal(breathingResumeUnlocked(false, state, 15), true)
  for (const state of ['focused', 'relaxed', 'distracted', 'overstimulated', null]) {
    assert.equal(breathingResumeUnlocked(true, state, 15), true)
  }
})
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

test('state thresholds are ten seconds distracted and overstimulated', () => {
  for (const [state, duration] of [['distracted', 10000], ['overstimulated', 10000]]) {
    assert.equal(sustainedEEGState(state, 1000, 1000 + duration - 1), null)
    assert.equal(sustainedEEGState(state, 1000, 1000 + duration), state)
    assert.equal(sustainedEEGState(state, 9000, 10000), null)
  }
  assert.equal(sustainedEEGState(null, 0, 10000), null)
  assert.equal(sustainedEEGState('focused', 10000, 10000), 'focused')
})
test('hold meters drain gradually during recovery instead of resetting', () => {
  let meter = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'distracted', 55, 6000)
  meter = advanceEEGHoldMeter(meter, 'focused', 90, 1000)
  assert.equal(meter.distracted, 5000)
  assert.equal(meter.committed, null)
  meter = advanceEEGHoldMeter(meter, 'distracted', 55, 5000)
  assert.equal(meter.committed, 'refocus')
})

test('overstimulation waits for a full meter and repeated episodes can fill it after gradual recovery', () => {
  let meter = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'overstimulated', null, 100)
  assert.equal(meter.committed, null)
  meter = advanceEEGHoldMeter(meter, 'overstimulated', null, 5900)
  meter = advanceEEGHoldMeter(meter, 'focused', null, 1000)
  assert.equal(meter.overstimulated, 5000)
  meter = advanceEEGHoldMeter(meter, 'overstimulated', null, 4999)
  assert.equal(meter.committed, null)
  meter = advanceEEGHoldMeter(meter, 'overstimulated', null, 1)
  assert.equal(meter.committed, 'breathing')
  assert.equal(advanceEEGHoldMeter(meter, 'focused', null, 10000).committed, 'breathing')
})
test('a full meter cannot be cancelled by focused readings or signal loss', () => {
  for (const [state, score, time, expected] of [['distracted', 55, 10000, 'refocus'], ['overstimulated', 30, 10000, 'breathing']]) {
    const committed = advanceEEGHoldMeter(emptyEEGHoldMeter(), state, score, time)
    assert.equal(committed.committed, expected)
    assert.equal(advanceEEGHoldMeter(committed, 'focused', 100, 30000).committed, expected)
    assert.equal(advanceEEGHoldMeter(committed, null, null, 30000).committed, expected)
  }
})

test('low focus scores cannot queue overstimulation breathing without a full overstimulation meter', () => {
  for (const state of ['focused', 'relaxed', 'distracted', null]) {
    const meter = advanceEEGHoldMeter(emptyEEGHoldMeter(), state, 10, 30000)
    assert.notEqual(meter.committed, 'breathing')
    assert.equal(meter.overstimulated, 0)
  }
  const partial = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'overstimulated', 10, 9999)
  assert.equal(partial.committed, null)
  assert.equal(advanceEEGHoldMeter(partial, 'relaxed', 10, 30000).committed, null)
})
test('templates start at five seconds distracted or ten seconds relaxed', () => {
  const distracted = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'distracted', 55, 4999)
  assert.equal(heldFocusTemplate(distracted, 'distracted', 55), 'none')
  assert.equal(heldFocusTemplate(advanceEEGHoldMeter(distracted, 'distracted', 55, 1), 'distracted', 55), 'active')
  const relaxed = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'relaxed', 72, 9999)
  assert.equal(heldFocusTemplate(relaxed, 'relaxed', 72), 'none')
  assert.equal(heldFocusTemplate(advanceEEGHoldMeter(relaxed, 'relaxed', 72, 1), 'relaxed', 72), 'passive')
})
test('focus score tiers have exact inclusive boundaries and no templates without a signal', () => {
  for (const [score, expected] of [[100, 'none'], [80, 'none'], [79, 'passive'], [65, 'passive'], [64, 'active'], [45, 'active'], [44, 'rest'], [0, 'rest'], [null, 'none']]) assert.equal(focusTemplateForScore(score), expected)
  assert.equal(heldFocusTemplate(emptyEEGHoldMeter(), null, 40), 'none')
})
test('different states fill different meters and invalid readings do not fill fatigue', () => {
  let meter = advanceEEGHoldMeter(emptyEEGHoldMeter(), 'overstimulated', null, 5000)
  meter = advanceEEGHoldMeter(meter, 'distracted', 55, 2000)
  assert.equal(meter.overstimulated, 3000)
  assert.equal(meter.distracted, 2000)
  assert.equal(meter.committed, null)
  assert.equal(advanceEEGHoldMeter(emptyEEGHoldMeter(), null, 10, 30000).fatigue, 0)
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
