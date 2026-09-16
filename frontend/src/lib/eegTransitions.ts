import type { CognitiveState } from '../constants/states'

export const EEG_STATE_HOLD_MS = 5000

export function eegSessionPhase(complete: boolean, ending: boolean, calibrated: boolean) {
  if (complete || ending) return 'complete'
  return calibrated ? 'active' : 'calibrating'
}

export function sustainedEEGState(state: CognitiveState | null, since: number, now: number): CognitiveState | null {
  if (state === 'distracted' || state === 'overstimulated') return now - since >= EEG_STATE_HOLD_MS ? state : null
  return state
}

export function nextEEGMode(state: CognitiveState | null, boundary: 'lesson' | 'refocus' | 'breathing', lessonComplete = false) {
  if (lessonComplete) return 'focus'
  if (boundary === 'breathing') return 'breathing'
  if (state === 'overstimulated') return 'breathing'
  if (state === 'distracted' || (state === null && boundary === 'refocus')) return 'refocus'
  return 'focus'
}
