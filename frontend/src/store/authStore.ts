import { create } from 'zustand'
import type { User } from '../types'
import { api } from '../lib/api'

interface LoginCredentials {
  email: string
  password: string
}

type AuthUser = Omit<User, 'classIds'> & { pseudonym: string; student_number?: string }

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
  return { ...user, id: String(user.id), avatar: user.avatar ?? null, classIds: [] }
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      await api('/auth/csrf/')
      const user = await api<AuthUser>('/auth/me/')
      set({ user: normalizeUser(user), isAuthenticated: true, isInitialized: true })
    } catch {
      set({ user: null, isAuthenticated: false, isInitialized: true })
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const user = normalizeUser(await api<AuthUser>('/auth/login/', {
        method: 'POST', body: JSON.stringify(credentials),
      }))
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
      set({ user: null, isAuthenticated: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))
