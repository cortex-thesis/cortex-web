import { create } from 'zustand'
import type { User } from '../types'
import { api, primeApiCache } from '../lib/api'
import type { TeacherDashboardData } from '../lib/teacherApi'

interface LoginCredentials {
  email: string
  password: string
}

type AuthUser = Omit<User, 'classIds'> & { pseudonym: string; student_number?: string; dashboard?: TeacherDashboardData }
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
  clearError: () => void
}

function normalizeUser(user: AuthUser): User {
  const identity = { ...user }
  delete identity.dashboard
  return { ...identity, id: String(user.id), avatar: user.avatar ?? null, classIds: [] }
}

function storedUser(): User | null {
  try { return JSON.parse(localStorage.getItem(AUTH_CACHE_KEY) ?? 'null') as User | null } catch { return null }
}

function storeUser(user: User | null) {
  if (user) localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user))
  else localStorage.removeItem(AUTH_CACHE_KEY)
}

const initialUser = storedUser()

export const useAuthStore = create<AuthState>()((set) => ({
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  isInitialized: Boolean(initialUser),
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      const [, authUser] = await Promise.all([api('/auth/csrf/'), api<AuthUser>('/auth/me/')])
      const user = normalizeUser(authUser)
      storeUser(user)
      set({ user, isAuthenticated: true, isInitialized: true })
    } catch {
      storeUser(null)
      set({ user: null, isAuthenticated: false, isInitialized: true })
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api<AuthUser>('/auth/login/', {
        method: 'POST', body: JSON.stringify(credentials),
      })
      if (response.dashboard) {
        primeApiCache('/teacher/dashboard/', response.dashboard)
        primeApiCache('/classes/', { classes: response.dashboard.classes })
        const classRequests = response.dashboard.classes.flatMap((item) => [
          api(`/classes/${item.id}/`),
          api(`/teacher/classes/${item.id}/analytics/`),
          api(`/teacher/journals/?class_id=${item.id}`),
        ])
        await Promise.allSettled([
          api('/teacher/journals/'),
          api('/teacher/notifications/'),
          api('/teacher/preferences/'),
          api('/teacher/profile/'),
          api('/teacher/students/'),
          ...classRequests,
        ])
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

  clearError: () => set({ error: null }),
}))
