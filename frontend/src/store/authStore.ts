import { create } from 'zustand'
import type { User } from '../types'
import { api, clearApiCache, primeApiCache } from '../lib/api'
import type { TeacherDashboardData } from '../lib/teacherApi'
import type { DashboardData, StudentLesson } from '../lib/studentApi'
import type { CurriculumPackage } from '../constants/states'

interface LoginCredentials {
  email: string
  password: string
}

interface StudentBootstrapData {
  dashboard: DashboardData
  lessons_by_package: Partial<Record<CurriculumPackage, StudentLesson[]>>
  notifications: { notifications: unknown[] }
  preferences: { notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }
  profile: Record<string, unknown>
}

type AuthUser = Omit<User, 'classIds' | 'role'> & {
  pseudonym: string
  role: 'student' | 'teacher' | 'admin'
  admin_scope?: 'none' | 'school' | 'super'
  student_number?: string
  dashboard?: TeacherDashboardData
  student_bootstrap?: StudentBootstrapData
}
const AUTH_CACHE_KEY = 'cortex-auth-user'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
  isLoading: boolean
  error: string | null
  initialize: () => Promise<void>
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
}

function normalizeUser(user: AuthUser): User {
  const identity = { ...user }
  delete identity.dashboard
  delete identity.student_bootstrap
  const role = user.role === 'admin'
    ? (user.admin_scope === 'school' ? 'school_admin' : 'super_admin')
    : user.role
  return { ...identity, role, id: String(user.id), avatar: user.avatar ?? null, classIds: [] }
}

function storedUser(): User | null {
  try { return JSON.parse(localStorage.getItem(AUTH_CACHE_KEY) ?? 'null') as User | null } catch { return null }
}

function storeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
    else localStorage.removeItem(AUTH_CACHE_KEY)
  } catch { /* Login still works when browser storage is unavailable. */ }
}

function primeStudentBootstrap(bootstrap: StudentBootstrapData) {
  primeApiCache('/student/dashboard/', bootstrap.dashboard)
  primeApiCache('/classes/', { classes: bootstrap.dashboard.classes })
  primeApiCache('/student/notifications/', bootstrap.notifications)
  primeApiCache('/student/preferences/', bootstrap.preferences)
  primeApiCache('/student/profile/', bootstrap.profile)
  for (const classItem of bootstrap.dashboard.classes) {
    primeApiCache(`/classes/${classItem.id}/?summary=1`, classItem)
    for (const packageItem of classItem.packages) {
      primeApiCache(`/student/classes/${classItem.id}/packages/${packageItem.slug}/`, {
        class: classItem,
        package: packageItem,
        lessons: bootstrap.lessons_by_package[packageItem.slug] ?? [],
      })
    }
  }
}

const initialUser = storedUser()

export const useAuthStore = create<AuthState>()((set) => ({
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    clearApiCache()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      const options = { signal: controller.signal }
      const [, authUser] = await Promise.all([api('/auth/csrf/', options), api<AuthUser>('/auth/me/', options)])
      if (authUser.student_bootstrap) primeStudentBootstrap(authUser.student_bootstrap)
      if (authUser.dashboard) {
        primeApiCache('/teacher/dashboard/', authUser.dashboard)
        primeApiCache('/classes/', { classes: authUser.dashboard.classes })
      }
      const user = normalizeUser(authUser)
      storeUser(user)
      set({ user, isAuthenticated: true, isInitialized: true })
    } catch {
      clearApiCache()
      storeUser(null)
      set({ user: null, isAuthenticated: false, isInitialized: true })
    } finally {
      clearTimeout(timeout)
      controller.abort()
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      await api('/auth/csrf/')
      const response = await api<AuthUser>('/auth/login/', {
        method: 'POST', body: JSON.stringify(credentials),
      })
      if (response.dashboard) {
        primeApiCache('/teacher/dashboard/', response.dashboard)
        primeApiCache('/classes/', { classes: response.dashboard.classes })
      }
      if (response.student_bootstrap) {
        primeStudentBootstrap(response.student_bootstrap)
      }
      const user = normalizeUser(response)
      storeUser(user)
      set({ user, isAuthenticated: true, isLoading: false })
      return user
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in.'
      set({ isLoading: false, error: message })
      throw error
    }
  },

  logout: async () => {
    try {
      await api('/auth/logout/', { method: 'POST' })
    } finally {
      storeUser(null)
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  updateUser: (nextUser) => set((state) => {
    if (!state.user) return state
    const merged = { ...state.user, ...nextUser }
    storeUser(merged)
    return { user: merged }
  }),

  clearError: () => set({ error: null }),
}))
