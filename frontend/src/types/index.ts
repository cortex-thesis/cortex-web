import {
  type CognitiveState,
  type CurriculumPackage,
} from '../constants/states'

// auth

export type UserRole = 'student' | 'teacher' | 'admin'

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

export interface Task {
  id: string
  index: number
  total: number
  title: string
  imageUrl: string | null
  question: string
  choices: string[]
  answer: string
  package: CurriculumPackage
  contentType?: 'image' | 'audio' | 'video' | 'interactive'
  contentLabel?: string
  contentDescription?: string
  durationSeconds?: number
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
