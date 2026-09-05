import { colors } from './tokens'

export type CognitiveState =
  | 'focused'
  | 'relaxed'
  | 'distracted'
  | 'overstimulated'

export const COGNITIVE_STATES: Record<
  CognitiveState,
  {
    label: string
    color: string
    fill: string
    textColor: string
    description: string
    mode: 'focus' | 'relax'
  }
> = {
  focused: {
    label: 'Focused',
    color: colors.state.focused,
    fill: colors.state.focusedFill,
    textColor: colors.state.focusedText,
    description: 'Actively engaged — content continues',
    mode: 'focus',
  },
  relaxed: {
    label: 'Relaxed',
    color: colors.state.relaxed,
    fill: colors.state.relaxedFill,
    textColor: colors.state.relaxedText,
    description: 'Calm but passive — gentle re-engagement triggered',
    mode: 'focus',
  },
  distracted: {
    label: 'Distracted',
    color: colors.state.distracted,
    fill: colors.state.distractedFill,
    textColor: colors.state.distractedText,
    description: 'Attention drifting — re-engagement triggered',
    mode: 'focus',
  },
  overstimulated: {
    label: 'Overstimulated',
    color: colors.state.overstimulated,
    fill: colors.state.overstimulatedFill,
    textColor: colors.state.overstimulatedText,
    description: 'Sensory overload — calming mode triggered',
    mode: 'relax',
  },
}

export const CURRICULUM_PACKAGES = [
  'care',
  'life',
  'pre_vocational',
  'livelihood',
  'functional_academics',
  'career',
  'enrichment',
] as const

export type CurriculumPackage = (typeof CURRICULUM_PACKAGES)[number]
