import type { CurriculumPackage } from '../constants/states'
import { PACKAGE_META } from '../constants/packages'
import { api } from './api'

export interface StudentPackage { id: number; slug: CurriculumPackage; name: string; lesson_count: number }
export interface StudentLesson { id: number; package: CurriculumPackage; title: string; description: string }
export interface StudentClass { id: number; name: string; code: string; description: string; school_year: string; packages: StudentPackage[]; package_count: number; teacher: { id: number; name: string } }
export interface StudentIdentity { id: number; name: string; role: 'student'; avatar: string | null; student_number: string; school: string | null }
export interface DashboardData { student: StudentIdentity; classes: StudentClass[]; unread_notifications: number; active_session: null }
export interface StudentSessionItem {
  id: string
  class_id: number
  lesson_id: number | null
  control_mode: 'automatic' | 'teacher' | 'free'
  title: string
  class_name: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  focus_score: number
  state: 'focused' | 'relaxed' | 'distracted' | 'overstimulated'
  status: 'in_progress' | 'completed'
  tasks_completed: number
  tasks_total: number
  state_distribution: Record<'focused' | 'relaxed' | 'distracted' | 'overstimulated', number>
}
export interface StudentSessionsData {
  summary: { completed_sessions: number; average_focus_score: number; total_duration_seconds: number }
  sessions: StudentSessionItem[]
}
export interface StudentJournalData {
  session: { id: string; title: string; class_name: string; duration_seconds: number; completed_tasks: string[] }
  entry: null | { id: string; prompt: string; response_type: 'text' | 'drawing' | 'audio'; text_response: string; mood: string; shared_with_teacher: boolean; created_at: string }
}

export const PACKAGE_EMOJI: Record<CurriculumPackage, string> = {
  care: '🤲', life: '🍳', pre_vocational: '🛠️', livelihood: '🌱',
  functional_academics: '📖', career: '💼', enrichment: '🎨',
}

export function classPresentation(item: StudentClass) {
  const packageKey: CurriculumPackage = item.packages?.[0]?.slug ?? 'life'
  return { ...item, package: packageKey, iconEmoji: PACKAGE_EMOJI[packageKey], iconBg: PACKAGE_META[packageKey].bg }
}

export const getStudentDashboard = () => api<DashboardData>('/student/dashboard/')
export const getStudentClasses = () => api<{ classes: StudentClass[] }>('/classes/')
export const getStudentClass = (id: string) => api<StudentClass & { activities: Array<{ id: string; title: string; done: boolean }> }>(`/classes/${id}/`)
export const getStudentClassPackage = (classId: string, packageSlug: string) => api<{ class: StudentClass; package: StudentPackage; lessons: StudentLesson[] }>(`/student/classes/${classId}/packages/${packageSlug}/`)
export const getStudentSessions = () => api<StudentSessionsData>('/student/sessions/')
export const startStudentSession = (data: { class_id: number; lesson_id?: number; control_mode: 'teacher' | 'free' }) =>
  api<{ id: string; class_id: number; lesson_id: number | null; control_mode: string; started_at: string }>('/sessions/start/', { method: 'POST', body: JSON.stringify(data) })
export const endStudentSession = (sessionId: string) =>
  api<{ id: string; ended_at: string }>(`/sessions/${sessionId}/end/`, { method: 'POST' })
export const trackStudentSlide = (sessionId: string, slideId: number, action: 'enter' | 'exit' = 'enter') =>
  api<{ id?: string; status: string; entered_at?: string; exited_at?: string }>(`/sessions/${sessionId}/slides/${slideId}/`, { method: 'POST', body: JSON.stringify({ action }) })
export const getStudentJournal = (sessionId?: string) => api<StudentJournalData>(sessionId ? `/student/journals/?session_id=${encodeURIComponent(sessionId)}` : '/student/journals/')
export const saveStudentJournal = (data: { session_id: string; prompt: string; response_type: 'text'; text_response: string; mood: string; shared_with_teacher: boolean }) =>
  api<{ id: string; status: string }>('/student/journals/', { method: 'POST', body: JSON.stringify(data) })
export function saveStudentJournalMedia(data: { session_id: string; prompt: string; response_type: 'drawing' | 'audio'; mood: string; shared_with_teacher: boolean; file: Blob; filename: string }) {
  const form = new FormData()
  form.append('session_id', data.session_id)
  form.append('prompt', data.prompt)
  form.append('response_type', data.response_type)
  form.append('mood', data.mood)
  form.append('shared_with_teacher', String(data.shared_with_teacher))
  form.append('file', data.file, data.filename)
  return api<{ id: string; status: string }>('/student/journals/', { method: 'POST', body: form })
}
