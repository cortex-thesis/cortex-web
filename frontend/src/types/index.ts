import {
  type CognitiveState,
  type CurriculumPackage,
} from '../constants/states'

// auth

export type UserRole = 'student' | 'teacher' | 'school_admin' | 'super_admin'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string | null
  classIds: string[]
}

// EEG

export interface BandPowers {
  theta: number
  alpha: number
  beta: number
  gamma: number
  tbr: number
}

export interface EEGUpdate {
  type: 'eeg_update'
  studentId: string
  state: CognitiveState
  bandPowers: BandPowers
  signalStrength: 0 | 1 | 2 | 3 | 4
  timestamp: string
}

export type SignalQuality = 'good' | 'fair' | 'poor'
export type HeadsetConnectionStatus = 'connected' | 'resyncing' | 'offline'

export interface StateTransition {
  state: CognitiveState
  timestamp: string
}

export interface ModeChangeEvent {
  type: 'mode_change'
  fromMode: 'focus' | 'relax'
  toMode: 'focus' | 'relax'
  reason: 'eeg_triggered' | 'teacher_override'
  timestamp: string
}

export type InterventionAction = 'set_mode' | 'set_content' | 'pause' | 'resume' | 'return_auto'

export interface InterventionCommand {
  id: string
  action: InterventionAction
  priority: 'urgent' | 'high' | 'normal'
  state: string
  mode: string
  content_id: number | null
  status: 'pending' | 'delivered' | 'applied' | 'rejected' | 'expired'
  actor_id: number
  requested_at: string
  delivered_at: string | null
  applied_at: string | null
  ended_at: string | null
  duration_seconds: number | null
}

// session

export interface Session {
  id: string
  studentId: string
  classId: string
  startedAt: string
  endedAt: string | null
  focusScore: number | null
  mode: 'focus' | 'relax'
}

export type ActivityTemplateId =
  | 'instructional_video'
  | 'visual_narrative'
  | 'multiple_choice'
  | 'reengagement_prompt'
  | 'breathing_exercise'
  | 'calming_visual'
  | 'calming_soundscape'

export interface ActivityStep {
  id: string
  title: string
  description?: string
  imageUrl?: string | null
  altText?: string
  audioUrl?: string | null
}

export type TaskTemplateId =
  | 'discovery_board'
  | 'scenario_classifier'
  | 'word_search'
  | 'find_it'
  | 'audio_sequence'
  | 'shopping'
  | 'multiple_choice'
  | 'picture_choice'
  | 'yes_no'
  | 'matching_pairs'
  | 'sequence_order'
  | 'sort_groups'
  | 'tap_target'
  | 'picture_puzzle'
  | 'drag_to_target'
  | 'hotspot_hunt'
  | 'trace_route'
  | 'memory_flip'
  | 'pattern_builder'
  | 'tooth_brushing'
  | 'garden_mission'
  | 'garden_kit'
  | 'clock_set'

export interface TaskItem {
  id: string
  label: string
  symbol?: string
  price?: number
  imageUrl?: string | null
  altText?: string
}

export interface TaskPair {
  id: string
  left: TaskItem
  right: TaskItem
}

export interface TaskCategory {
  id: string
  label: string
}

export interface TaskHotspot {
  x: number
  y: number
  radius: number
  label: string
}

export interface TaskLayout {
  size?: 'compact' | 'standard' | 'wide' | 'immersive'
  preferredColumns?: number
  boardMinHeight?: number
  mediaFit?: 'contain' | 'cover'
}

export interface Task {
  id: string
  index: number
  total: number
  title: string
  imageUrl: string | null
  altText?: string
  priceTag?: string
  evidenceRole?: string
  discussion?: boolean
  narrationScript?: string
  videoOptional?: boolean
  selfReportField?: string
  selfReportFields?: Record<string, string>
  initialResponse?: string
  checkpointKey?: string
  clockMode?: 'set' | 'read'
  clockRounds?: { id: string; instruction: string; hour: number; minute: number; period: 'am' | 'pm' }[]
  grid?: string[][]
  targets?: { word: string; displayLabel: string; cells: number[][]; revealImage?: string; followUpQuestion?: { question: string; choices: string[]; answer: string } }[]
  rounds?: { direction: string; correctOrder: string[]; audioUrl?: string }[]
  missions?: { id: string; label: string; instruction: string; answer: string; actionLabel: string; imageUrl?: string; altText?: string; scene?: 'soil' | 'water' | 'measure' | 'meal' | 'display' | 'practice' | 'inspect' | 'compare' | 'reference'; availableItemIds?: string[]; hint: string; feedback: string }[]
  scenarios?: { clue: string; choices: string[]; answer: string; feedback: string }[]
  workspaceLabel?: string
  allowSubset?: boolean
  minimumSelections?: number
  hideImageLabels?: boolean
  immediateFeedback?: boolean
  targetItemId?: string
  paymentOptions?: number[]
  moneyItems?: TaskItem[]
  payment?: number
  givenChange?: number
  changeOptions?: number[]
  question: string
  choices: string[]
  answer: string
  package: CurriculumPackage
  contentType?: 'image' | 'audio' | 'video' | 'interactive'
  contentLabel?: string
  contentDescription?: string
  durationSeconds?: number
  template?: ActivityTemplateId
  instruction?: string
  steps?: ActivityStep[]
  mediaUrl?: string | null
  actionLabel?: string
  taskTemplate?: TaskTemplateId
  items?: TaskItem[]
  pairs?: TaskPair[]
  categories?: TaskCategory[]
  correctItemIds?: string[]
  correctOrder?: string[]
  sortAnswers?: Record<string, string>
  selectionMode?: 'single' | 'multiple'
  scored?: boolean
  correctFeedback?: string
  retryFeedback?: string
  deliveryVariants?: Partial<Record<'attention_reengagement' | 'gentle_reactivation', Partial<Task>>>
  sceneImageUrl?: string | null
  hotspot?: TaskHotspot
  pattern?: TaskItem[]
  dirtyImageUrl?: string | null
  cleaningImageUrl?: string | null
  cleanImageUrl?: string | null
  toolImageUrl?: string | null
  layout?: TaskLayout
}

// class

export interface ClassRoom {
  id: string
  name: string
  code: string
  teacherId: string
  studentIds: string[]
  package: CurriculumPackage
  iconEmoji: string
  iconBg: string
}

// content

export interface ContentItem {
  id: string
  title: string
  type: 'image' | 'audio' | 'video' | 'interactive'
  package: CurriculumPackage
  mode: 'focus' | 'relax' | 'both'
  cognitiveStateTarget: CognitiveState
  fileUrl: string
  thumbnailUrl: string | null
  durationSeconds: number
  createdBy: string
  createdAt: string
}

// student from teacher view

export interface StudentLive {
  id: string
  name: string
  avatar: string | null
  currentState: CognitiveState | null
  signalStrength: 0 | 1 | 2 | 3 | 4
  focusScore: number
  sessionDuration: number
  isConnected: boolean
  bandPowers?: BandPowers
  signalQuality?: SignalQuality
  connectionStatus?: HeadsetConnectionStatus
  workstationPath?: string
  stateStartedAt?: string
  stateTransitions?: StateTransition[]
  activeActivity?: string
  engineMode?: 'auto' | 'teacher-override'
}

// ─── JOURNAL ──────────────────────────────────────────────────

export type JournalResponseType = 'text' | 'drawing' | 'audio'

export type MoodOption = 'happy' | 'okay' | 'tired' | 'confused' | 'proud'

export interface JournalResponse {
  type: JournalResponseType
  content: string
}

export interface JournalEntry {
  id: string
  sessionId: string
  studentId: string
  createdAt: string
  prompt: string
  response: JournalResponse
  mood: MoodOption | null
  tasksDone: string[]
}

// analytics

export interface SessionSummary {
  sessionId: string
  duration: number
  focusScore: number
  stateDistribution: Record<CognitiveState, number>
  taskCompleted: number
  taskTotal: number
}

export type { CognitiveState }
