import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { readTourRun, tourRunKey } from './tourState'

// Preserve old links to the real player while adding its explicit read-only
// context before the player mounts. This never substitutes another screen.
export default function OnboardingPracticeBoundary({ children }: { children: ReactNode }) {
  const user = useAuthStore(state => state.user)
  const location = useLocation()
  const run = user?.role === 'student' ? readTourRun(tourRunKey(user.id, 'student'), 11) : null
  if (run?.phase === 'running' && run.index <= 4 && new URLSearchParams(location.search).get('context') !== 'onboarding') {
    return <Navigate to={`${location.pathname}?context=onboarding&stage=${run.index === 4 ? 'finish' : 'activity'}`} replace />
  }
  return children
}
