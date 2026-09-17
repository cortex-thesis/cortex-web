import type { CognitiveState } from '../constants/states'

export const EEG_STATE_HOLD_MS = 10000
export const OVERSTIMULATED_HOLD_MS = 10000
export type FocusTemplate = 'none' | 'passive' | 'active' | 'rest'
export interface EEGHoldMeter {
  distracted: number
  relaxed: number
  overstimulated: number
  fatigue: number
  committed: 'refocus' | 'breathing' | null
}
export const emptyEEGHoldMeter = (): EEGHoldMeter => ({ distracted: 0, relaxed: 0, overstimulated: 0, fatigue: 0, committed: null })

// Like a hold meter: conditions fill it, recovery drains it, and a full
// meter commits the break until the learner completes it.
export function advanceEEGHoldMeter(meter: EEGHoldMeter, state: CognitiveState | null, focusScore: number | null, elapsedMs: number): EEGHoldMeter {
  if (meter.committed) return meter
  const delta = Math.max(0, elapsedMs)
  const fill = (value: number, matches: boolean, cap: number) => Math.max(0, Math.min(cap, value + (matches ? delta : -delta)))
  const next = {
    distracted: fill(meter.distracted, state === 'distracted', EEG_STATE_HOLD_MS),
    relaxed: fill(meter.relaxed, state === 'relaxed', EEG_STATE_HOLD_MS),
    overstimulated: fill(meter.overstimulated, state === 'overstimulated', OVERSTIMULATED_HOLD_MS),
    fatigue: fill(meter.fatigue, state !== null && focusScore !== null && focusScore < 45, EEG_STATE_HOLD_MS),
    committed: null as EEGHoldMeter['committed'],
  }
  if (next.overstimulated >= OVERSTIMULATED_HOLD_MS) next.committed = 'breathing'
  else if (next.distracted >= EEG_STATE_HOLD_MS) next.committed = 'refocus'
  return next
}

export function focusTemplateForScore(score: number | null): FocusTemplate {
  if (score === null || score >= 80) return 'none'
  if (score >= 65) return 'passive'
  if (score >= 45) return 'active'
  return 'rest'
}

export function heldFocusTemplate(meter: EEGHoldMeter, state: CognitiveState | null, score: number | null): FocusTemplate {
  if (state === null || state === 'overstimulated') return 'none'
  if (state === 'distracted' && meter.distracted < 5000) return 'none'
  if (state === 'relaxed' && meter.relaxed < 10000) return 'none'
  return focusTemplateForScore(score)
}

export function queuedFocusTemplate(current: FocusTemplate, candidate: FocusTemplate): FocusTemplate {
  return current === 'none' ? candidate : current
}

export function breathingResumeUnlocked(unlocked: boolean, state: CognitiveState | null, seconds: number) {
  return unlocked || (seconds >= 15 && (state === 'focused' || state === 'relaxed'))
}

export function eegSessionPhase(complete: boolean, ending: boolean, calibrated: boolean, lessonStarted = false) {
  if (complete || ending) return 'complete'
  return calibrated || lessonStarted ? 'active' : 'calibrating'
}

export function sustainedEEGState(state: CognitiveState | null, since: number, now: number): CognitiveState | null {
  if (state === 'distracted' || state === 'overstimulated') return now - since >= (state === 'overstimulated' ? OVERSTIMULATED_HOLD_MS : EEG_STATE_HOLD_MS) ? state : null
  return state
}

export function nextEEGMode(state: CognitiveState | null, boundary: 'lesson' | 'refocus' | 'breathing', lessonComplete = false) {
  if (lessonComplete) return 'focus'
  if (boundary === 'breathing') return 'breathing'
  if (state === 'overstimulated') return 'breathing'
  if (state === 'distracted' || (state === null && boundary === 'refocus')) return 'refocus'
  return 'focus'
}
