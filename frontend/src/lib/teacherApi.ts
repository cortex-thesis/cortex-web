import { api } from './api'

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
  student_number: string
  school: string | null
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
}

export interface TeacherDashboardData {
  teacher: TeacherIdentity
  classes: TeacherClass[]
  class_count: number
  student_count: number
  unread_notifications: number
  active_sessions: number
  total_sessions: number
}

export const getTeacherDashboard = () => api<TeacherDashboardData>('/teacher/dashboard/')
export const getTeacherClasses = () => api<{ classes: TeacherClass[] }>('/classes/')
export const getTeacherClass = (id: string) => api<TeacherClass>(`/classes/${id}/`)
export const createTeacherClass = (data: { name: string; description?: string; school_year?: string }) =>
  api<TeacherClass>('/classes/', { method: 'POST', body: JSON.stringify(data) })
export const updateTeacherClass = (id: string, data: Partial<Pick<TeacherClass, 'name' | 'description' | 'school_year'>>) =>
  api<TeacherClass>(`/classes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
export const archiveTeacherClass = (id: string) => api<{ status: string }>(`/classes/${id}/`, { method: 'DELETE' })
export const enrollStudent = (classId: string, studentId: number) => api(`/classes/${classId}/students/${studentId}/`, { method: 'POST' })
export const removeStudent = (classId: string, studentId: number) => api(`/classes/${classId}/students/${studentId}/`, { method: 'DELETE' })
