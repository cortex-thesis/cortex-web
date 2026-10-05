import { api } from './api'
import type { TeacherClass } from './teacherApi'

export interface SchoolAccount {
  id: number
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  account_status: 'pending' | 'active' | 'suspended' | 'disabled'
  school: string | null
  school_id?: string | null
  username: string
  admin_scope?: 'none' | 'school' | 'super'
  requested_at: string
}

export interface SchoolDashboardData {
  administrator: { id: number; name: string; avatar: string | null; school: string | null }
  classes: Array<TeacherClass & { session_count: number; average_completion: number; average_focus: number }>
  class_count: number
  teacher_count: number
  student_count: number
  active_sessions: number
  total_sessions: number
  pending_teachers: number
  average_completion: number
  average_focus: number
}

export interface School { id: string; name: string; is_active: boolean }
export interface CreateAccountInput { username: string; name: string; email: string; temporary_password: string; role: 'admin' | 'teacher' | 'student'; school_id: string }

export const getSchoolDashboard = () => api<SchoolDashboardData>('/admin/dashboard/')
export const getSchoolAccounts = () => api<{ accounts: SchoolAccount[] }>('/admin/accounts/')
export const getSchools = () => api<{ schools: School[] }>('/admin/schools/')
export const createAccount = (input: CreateAccountInput) => api<SchoolAccount & { temporary_password?: string }>('/admin/accounts/', { method: 'POST', body: JSON.stringify(input) })
export const updateAccountStatus = (id: number, status: SchoolAccount['account_status']) => api<SchoolAccount>(`/admin/accounts/${id}/status/`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const editAccount = (id: number, input: { name: string; username: string; email: string }) => api<SchoolAccount>(`/admin/accounts/${id}/`, { method: 'PATCH', body: JSON.stringify(input) })
export const deleteAccount = (id: number) => api<{ status: string }>(`/admin/accounts/${id}/`, { method: 'DELETE' })
export const deletePendingAccount = (id: number) => api<{ status: string }>(`/admin/accounts/${id}/status/`, { method: 'DELETE' })
export const createSchool = (input: { name: string; address: string; contact_email: string; contact_number: string }) => api<School>('/admin/schools/', { method: 'POST', body: JSON.stringify(input) })
