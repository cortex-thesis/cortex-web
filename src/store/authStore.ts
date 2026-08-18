import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import { mockStudent } from '../mocks'

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  clearError: () => void
}

// Mock auth call — swap the body of this function for a real
// POST /api/auth/login/ once the Django backend is up. Keep the
// same resolve/reject shape so nothing else in the store changes.
function mockLoginRequest(credentials: LoginCredentials): Promise<{
  user: User
  token: string
}> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!credentials.email || !credentials.password) {
        reject(new Error('Enter your email and password.'))
        return
      }
      if (credentials.password.length < 4) {
        reject(new Error('That email or password looks incorrect.'))
        return
      }
      resolve({
        user: {
          id: mockStudent.id,
          name: mockStudent.name,
          role: 'student',
          avatar: mockStudent.avatar ?? null,
          classIds: mockStudent.classIds ?? [],
        },
        token: 'mock-jwt-token',
      })
    }, 700)
  })
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const { user, token } = await mockLoginRequest(credentials)
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unable to log in.',
          })
          throw err
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'cortex-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
