import type { CurriculumPackage } from '../constants/states'
import { PACKAGE_META } from '../constants/packages'
import { api } from './api'

export interface StudentClass { id: number; name: string; code: string; description: string; school_year: string; packages: Array<{ id: number; slug: CurriculumPackage; name: string }>; package_count: number; teacher: { id: number; name: string } }
export interface StudentIdentity { id: number; name: string; role: 'student'; avatar: string | null; student_number: string; school: string | null }
export interface DashboardData { student: StudentIdentity; classes: StudentClass[]; unread_notifications: number; active_session: null }

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
