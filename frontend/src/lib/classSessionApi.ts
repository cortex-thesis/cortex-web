import { api } from './api'
import type { CognitiveState } from '../constants/states'
import type { Task } from '../types'

export type ClassMode = 'focus' | 'breathing' | 'refocus' | 'adaptive'
export interface ClassParticipant {
  id: string; student_id: number; name: string; status: string; online: boolean
  state: CognitiveState | null; signal_channels: number; signal_fresh: boolean
  focus_score: number | null; state_distribution: Record<CognitiveState, number>
  answered: number; correct: number; attempts: number; task_total: number
  completed_steps?: number; progress_percentage?: number
  lesson_completed_steps?: number; lesson_step_total?: number; lesson_progress_percentage?: number
  duration_seconds: number; eeg_samples: number
}
export interface ClassroomLesson {
  id: number; title: string; package: Task['package']
  slides: Array<{ id: number; title: string; activity: { type: Task['contentType']; configuration: Record<string, unknown>; asset_url?: string | null } }>
}
export interface ClassOverviewReport {
  class_name: string; teacher_name: string; started_at: string | null; ended_at: string
  lessons: Array<{ id: number; title: string }>; participants: ClassParticipant[]
  participant_count: number; answered: number; correct: number
  controls: Array<{ action: string; at: string; lesson_id?: number; mode?: string }>
}
export interface ClassroomSession {
  id: string; class_id: number; class_name: string; teacher_name: string
  lesson_id: number | null; lesson_title: string | null; lesson_revision: number
  status: 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'
  presentation_mode: ClassMode; started_at: string | null; ended_at: string | null
  updated_at: string
  invitation_revision: number
  roster?: Array<{ student_id: number; name: string; joined: boolean }>
  participants?: ClassParticipant[]; student_session?: ClassParticipant | null
  lesson?: ClassroomLesson | null; report?: ClassOverviewReport | null
}
export const listClassSessions = () => api<{ sessions: ClassroomSession[] }>('/class-sessions/', { cache: 'no-store' })
export const getClassSession = (id: string) => api<ClassroomSession>(`/class-sessions/${id}/`, { cache: 'no-store' })
export const getClassSessionLessons = (id: string) => api<{ lessons: Array<{ id: number; title: string; package: string }> }>(`/teacher/classes/${id}/session-lessons/`, { cache: 'no-store' })
export const openClassSession = (classId: number, lessonId?: number) => api<ClassroomSession>('/class-sessions/', { method: 'POST', body: JSON.stringify({ class_id: classId, lesson_id: lessonId }) })
export const controlClassSession = (id: string, action: string, extra: { mode?: ClassMode; lesson_id?: number } = {}) => api<ClassroomSession>(`/class-sessions/${id}/`, { method: 'POST', body: JSON.stringify({ action, ...extra }) })
export const joinClassSession = (id: string) => api<ClassroomSession>(`/class-sessions/${id}/join/`, { method: 'POST', body: '{}' })
export const heartbeatClassSession = (id: string) => api<ClassroomSession>(`/class-sessions/${id}/`, { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) })

export async function downloadClassReport(id: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/class-sessions/${id}/report/?download=csv`, { credentials: 'include' })
  if (!response.ok) throw new Error('The report could not be downloaded. Please try again.')
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url; link.download = `class-session-${id}.csv`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
