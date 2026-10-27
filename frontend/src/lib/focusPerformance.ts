import type { CognitiveState } from '../constants/states'

type StateDistribution = Record<CognitiveState, number>

export function getFocusPerformance(score: number, distribution?: StateDistribution) {
  if (score >= 80) return { phrase: 'Excellent focus', emoji: '\u{1F31F}', icon: 'star' as const, color: '#1D9E75' }
  if (score >= 70) return { phrase: 'Steady focus', emoji: '\u{1F4AA}', icon: 'muscle' as const, color: score >= 75 ? '#1D9E75' : '#EF9F27' }
  if (score >= 60) return { phrase: 'Growing focus', emoji: '\u{1F331}', icon: 'sprout' as const, color: '#EF9F27' }
  if (distribution && distribution.focused + distribution.relaxed > distribution.distracted + distribution.overstimulated) {
    return { phrase: 'Calm and focused', emoji: '\u{1F331}', icon: 'sprout' as const, color: '#1D9E75' }
  }
  return { phrase: 'Finding your rhythm', emoji: '\u2728', icon: 'stars' as const, color: score >= 50 ? '#EF9F27' : '#D85A30' }
}
