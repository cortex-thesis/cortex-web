import { api } from './api'
import type { CognitiveState, CurriculumPackage } from '../constants/states'

export interface StudentReportSession {
  id: string
  started_at: string
  class_name: string
  activity: string
  duration_seconds: number
  focus: number | null
  dominant: CognitiveState | null
  tasks_completed: number
  tasks_total: number
  mode_changes: number
}

export interface TeacherStudentReport extends RosterStudent {
  classes: TeacherClass[]
  sessions: StudentReportSession[]
  session_count: number
  journal_count: number
  average_focus: number | null
  average_duration_seconds: number | null
  tasks_completed: number
  tasks_total: number
  state_distribution: Record<CognitiveState, number> | null
}

export const getTeacherStudentReport = (classId: string, studentId: string, signal?: AbortSignal) =>
  api<TeacherStudentReport>(`/teacher/students/${encodeURIComponent(studentId)}/?class_id=${encodeURIComponent(classId)}`, { cache: 'no-store', signal })

export interface TeacherIdentity {
  id: number
  name: string
  role: 'teacher'
  avatar: string | null
  school: string | null
}

export interface RosterStudent {
  id: number
  name: string
  role: 'student'
  avatar: string | null
  avatar_color: 'pink' | 'blue' | 'yellow' | 'green' | 'purple'
  student_number: string
  school: string | null
  session_count?: number
  last_state?: CognitiveState | null
  journal_count?: number
}

export interface GlobalPackage { id: number; slug: string; name: string }

export interface TeacherClass {
  id: number
  name: string
  code: string
  description: string
  school_year: string
  status: 'active' | 'archived'
  student_count: number
  package_count: number
  packages: GlobalPackage[]
  teacher: TeacherIdentity
  students?: RosterStudent[]
  average_focus?: number | null
  latest_session_at?: string | null
}

export interface TeacherDashboardData {
  reporting: { period: string; is_partial: boolean; month: string; start: string | null; end_exclusive: string | null; generated_at: string; sample_count: number; measured_sessions: number; basis: string }
  comparison: null | { start: string; end_exclusive: string; total_sessions: number; average_focus: number | null; state_distribution: Record<CognitiveState, number>; sample_count: number; measured_sessions: number }
  teacher: TeacherIdentity
  classes: TeacherClass[]
  class_count: number
  student_count: number
  unread_notifications: number
  active_sessions: number
  total_sessions: number
  average_focus: number | null
  state_distribution: Record<CognitiveState, number>
  live_sessions: Array<LiveSession & { class_id: number; class_name: string }>
  recent_sessions: Array<{
    id: string; class_id: number; class_name: string; student: RosterStudent
    lesson: string; package: CurriculumPackage | null; started_at: string; ended_at: string | null; status: string; completion_percentage: number
  }>
  recent_badges: Array<{
    id: number; key: string; student: RosterStudent; unlocked_at: string
    classes: Array<{ id: number; name: string }>
  }>
}

export const getTeacherDashboard = (month = '', classId = '', filters: Record<string, string> = {}) => api<TeacherDashboardData>(`/teacher/dashboard/?${new URLSearchParams({ ...(month ? { month } : {}), ...(classId ? { class_id: classId } : {}), ...filters })}`, { cache: 'no-store' })
export const getTeacherClasses = () => api<{ classes: TeacherClass[] }>('/classes/', { cache: 'no-store' })
export const getTeacherClass = (id: string) => api<TeacherClass>(`/classes/${id}/`, { cache: 'no-store' })
export interface LiveSession {
  control_mode?: 'free' | 'teacher' | 'automatic'
  status?: string
  class_session_id?: string | null
  presentation_mode?: string
  last_seen_at?: string | null
  id: string
  student: RosterStudent
  lesson: string
  started_at: string
  focus_score: number
  latest: null | { recorded_at: string; bands: Record<'delta' | 'theta' | 'alpha' | 'beta' | 'gamma', number>; state: CognitiveState; accepted_channels: number; battery_level: number | null }
}
export const getTeacherClassLive = (id: string) => api<{ active_sessions: LiveSession[] }>(`/teacher/classes/${id}/live/`, { cache: 'no-store' })
export interface ClassAnalyticsData {
  generated_at?: string
  reporting?: { month: string; start: string | null; end_exclusive: string | null; basis: string }
  class: TeacherClass
  student_count: number
  session_count: number
  active_sessions: number
  average_focus: number | null
  completion_rate: number | null
  state_distribution: Record<CognitiveState, number>
  students: Array<{ id: number; name: string; average_focus: number | null }>
  recent_sessions: Array<{ id: string; student: RosterStudent; lesson: string; package: CurriculumPackage | null; started_at: string; ended_at: string | null; completion_percentage: number }>
  recent_badges: Array<{ key: string; student: RosterStudent; unlocked_at: string }>
  lessons: Array<{ id: number; title: string }>
  selected_lesson_id: number | null
  slides: Array<{ id: number; title: string; position: number }>
  timeline: Array<{ session_id: string; student_id: number; name: string; started_at: string; points: Array<{ slide_id: number; state: CognitiveState | null; samples: number }> }>
}
export const getClassAnalytics = (id: string, lessonId = '', signal?: AbortSignal, month = 'all') =>
  api<ClassAnalyticsData>(`/teacher/classes/${id}/analytics/?${new URLSearchParams({ ...(lessonId ? { lesson_id: lessonId } : {}), month })}`, { cache: 'no-store', signal })
export const getTeacherClassYear = (signal?: AbortSignal) => api<{ school_year: string }>('/teacher/class-year/', { cache: 'no-store', signal })
export const createTeacherClass = (data: { name: string; description?: string }) =>
  api<TeacherClass>('/classes/', { method: 'POST', body: JSON.stringify(data) })
export const updateTeacherClass = (id: string, data: Partial<Pick<TeacherClass, 'name' | 'description' | 'school_year'>>) =>
  api<TeacherClass>(`/classes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
export const archiveTeacherClass = (id: string) => api<{ status: string }>(`/classes/${id}/`, { method: 'DELETE' })
export const enrollStudent = (classId: string, studentId: number) => api(`/classes/${classId}/students/${studentId}/`, { method: 'POST' })
export const removeStudent = (classId: string, studentId: number) => api(`/classes/${classId}/students/${studentId}/`, { method: 'DELETE' })
