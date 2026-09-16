import type { CognitiveState } from '../constants/states'

export function nextEEGMode(state: CognitiveState | null, boundary: 'lesson' | 'refocus' | 'breathing') {
  if (boundary === 'breathing') return 'breathing'
  if (state === 'overstimulated') return 'breathing'
  if (state === 'distracted' || (state === null && boundary === 'refocus')) return 'refocus'
  return 'focus'
}
