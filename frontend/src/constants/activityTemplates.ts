import type { ActivityTemplateId, TaskTemplateId } from '../types'

export interface ActivityTemplateDefinition {
  id: ActivityTemplateId
  label: string
  mode: 'focus' | 'relax'
  purpose: string
  backendType: 'image' | 'audio' | 'video' | 'interactive'
}

export const ACTIVITY_TEMPLATES: ActivityTemplateDefinition[] = [
  { id: 'instructional_video', label: 'Instructional video', mode: 'focus', purpose: 'Primary instructional delivery', backendType: 'video' },
  { id: 'visual_narrative', label: 'Step-by-step visual', mode: 'focus', purpose: 'Guided procedural learning', backendType: 'image' },
  { id: 'multiple_choice', label: 'Knowledge check', mode: 'focus', purpose: 'Micro-assessment and engagement', backendType: 'interactive' },
  { id: 'reengagement_prompt', label: 'Re-engagement prompt', mode: 'focus', purpose: 'Attention recapture during distraction', backendType: 'interactive' },
  { id: 'breathing_exercise', label: 'Breathing exercise', mode: 'relax', purpose: 'Arousal regulation', backendType: 'video' },
  { id: 'calming_visual', label: 'Calming visual', mode: 'relax', purpose: 'Low-stimulus sensory cooldown', backendType: 'image' },
  { id: 'calming_soundscape', label: 'Calming soundscape', mode: 'relax', purpose: 'Auditory regulation', backendType: 'audio' },
]

export const ACTIVITY_TEMPLATE_BY_ID = Object.fromEntries(
  ACTIVITY_TEMPLATES.map((template) => [template.id, template])
) as Record<ActivityTemplateId, ActivityTemplateDefinition>

export interface TaskTemplateDefinition {
  id: TaskTemplateId
  label: string
  response: string
  purpose: string
}

export const TASK_TEMPLATES: TaskTemplateDefinition[] = [
  { id: 'multiple_choice', label: 'Multiple choice', response: 'Choose one text answer', purpose: 'Recognition and knowledge checks' },
  { id: 'picture_choice', label: 'Picture choice', response: 'Choose one picture', purpose: 'Visual recognition with reduced reading demand' },
  { id: 'yes_no', label: 'Yes or no', response: 'Choose between two answers', purpose: 'Simple decisions and safety checks' },
  { id: 'matching_pairs', label: 'Matching pairs', response: 'Connect related items', purpose: 'Association and functional vocabulary' },
  { id: 'sequence_order', label: 'Order the steps', response: 'Arrange items from first to last', purpose: 'Procedural learning and routines' },
  { id: 'sort_groups', label: 'Sort into groups', response: 'Place items in categories', purpose: 'Classification and discrimination' },
  { id: 'tap_target', label: 'Tap the correct item', response: 'Select a target from a scene', purpose: 'Identification and attention practice' },
  { id: 'picture_puzzle', label: 'Build the picture', response: 'Move pieces into order', purpose: 'Visual-spatial assembly and sustained engagement' },
  { id: 'drag_to_target', label: 'Move to the right place', response: 'Drag objects to meaningful targets', purpose: 'Functional association and direct manipulation' },
  { id: 'hotspot_hunt', label: 'Hotspot hunt', response: 'Place a marker on a scene', purpose: 'Visual scanning and precise functional identification' },
  { id: 'trace_route', label: 'Trace the route', response: 'Move through checkpoints in order', purpose: 'Motor planning and procedural recall' },
  { id: 'memory_flip', label: 'Memory flip', response: 'Turn over and pair hidden cards', purpose: 'Working-memory practice in a controlled set' },
  { id: 'pattern_builder', label: 'Pattern builder', response: 'Complete a visual or functional pattern', purpose: 'Prediction and sequence recognition' },
]

export const TASK_TEMPLATE_BY_ID = Object.fromEntries(
  TASK_TEMPLATES.map((template) => [template.id, template])
) as Record<TaskTemplateId, TaskTemplateDefinition>
