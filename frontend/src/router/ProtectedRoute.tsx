import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserRole } from '../types'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const initialized = useAuthStore((state) => state.isInitialized)

  if (!initialized) return null
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) {
    const destination = user.role === 'teacher' ? '/teacher/dashboard'
      : user.role === 'school_admin' ? '/school-admin/dashboard'
        : user.role === 'super_admin' ? '/admin/dashboard' : '/student/home'
    return <Navigate to={destination} replace />
  }
  return <Outlet />
}
