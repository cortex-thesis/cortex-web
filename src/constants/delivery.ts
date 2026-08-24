import { COGNITIVE_STATES } from './states'
import type { CognitiveState } from './states'

export type DeliveryIntensity = 'normal' | 'elevated'

interface DeliveryConfig {
  intensity: DeliveryIntensity
  nudgeIntervalMs: number
  adaptations: string[]
}

// Maps each classified cognitive state to how strongly its delivery
// mode should adapt. The mode itself (focus/relax) already lives on
// COGNITIVE_STATES[state].mode in states.ts — this file doesn't
// repeat that, it only adds intensity, which is the one thing that
// actually differs between the two states sharing a mode:
//   focused + distracted        -> both 'focus' mode
//   relaxed + overstimulated    -> both 'relax' mode
// This is deliberately the ONLY place that distinguishes
// "focused vs distracted" or "relaxed vs overstimulated" behavior —
// session pages read intensity from here, they don't branch on the
// raw state string themselves. Adjust the numbers/adaptations below
// and every page picks it up automatically.
export const DELIVERY_CONFIG: Record<CognitiveState, DeliveryConfig> = {
  focused: {
    intensity: 'normal',
    nudgeIntervalMs: 30000,
    adaptations: [],
  },
  distracted: {
    intensity: 'elevated',
    nudgeIntervalMs: 15000,
    adaptations: [
      'Re-engagement prompt shown',
      'Shorter, simpler instructions',
      'Nudges every 15s instead of 30s',
    ],
  },
  relaxed: {
    intensity: 'normal',
    nudgeIntervalMs: 30000,
    adaptations: [],
  },
  overstimulated: {
    intensity: 'elevated',
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
