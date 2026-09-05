import { COGNITIVE_STATES } from './states'
import type { CognitiveState } from './states'

export type DeliveryIntensity = 'normal' | 'elevated' | 'gentle' | 'reduced'
export type DeliveryStrategy = 'steady_instruction' | 'attention_reengagement' | 'gentle_reactivation' | 'sensory_cooldown'
export type InteractionDensity = 'full' | 'narrowed' | 'gentle' | 'none'

export interface DeliveryConfig {
  intensity: DeliveryIntensity
  strategy: DeliveryStrategy
  interactionDensity: InteractionDensity
  visualIntensity: 1 | 2 | 3 | 4 | 5
  audioIntensity: 1 | 2 | 3 | 4 | 5
  pacing: 'slow' | 'normal'
  nudgeIntervalMs: number
  adaptations: string[]
}

// Paper-aligned state-to-delivery policy. Focused maintains delivery;
// distracted narrows and briefly strengthens the cue; relaxed uses a
// gentle re-entry stimulus; overstimulated replaces the academic task
// with sensory cooldown. Pages consume this policy instead of inventing
// their own state behavior.
export const DELIVERY_CONFIG: Record<CognitiveState, DeliveryConfig> = {
  focused: {
    intensity: 'normal',
    strategy: 'steady_instruction', interactionDensity: 'full', visualIntensity: 3, audioIntensity: 3, pacing: 'normal',
    nudgeIntervalMs: 30000,
    adaptations: [],
  },
  distracted: {
    intensity: 'elevated',
    strategy: 'attention_reengagement', interactionDensity: 'narrowed', visualIntensity: 4, audioIntensity: 3, pacing: 'normal',
    nudgeIntervalMs: 15000,
    adaptations: [
      'Re-engagement prompt shown',
      'Shorter, simpler instructions',
      'Nudges every 15s instead of 30s',
    ],
  },
  relaxed: {
    intensity: 'gentle',
    strategy: 'gentle_reactivation', interactionDensity: 'gentle', visualIntensity: 2, audioIntensity: 2, pacing: 'slow',
    nudgeIntervalMs: 30000,
    adaptations: ['Mild re-engagement cue', 'Gentle pacing', 'No sudden stimulus increase'],
  },
  overstimulated: {
    intensity: 'reduced',
    strategy: 'sensory_cooldown', interactionDensity: 'none', visualIntensity: 1, audioIntensity: 1, pacing: 'slow',
    nudgeIntervalMs: 20000,
    adaptations: [
      'Reduced visual/audio intensity',
      'Slower pacing',
      'Simpler calming activity',
    ],
  },
}

export function getDeliveryMode(
  state: CognitiveState | null | undefined
): 'focus' | 'relax' {
  return COGNITIVE_STATES[state ?? 'focused'].mode
}

export function getDeliveryConfig(
  state: CognitiveState | null | undefined
): DeliveryConfig {
  return DELIVERY_CONFIG[state ?? 'focused']
}
