import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { listClassSessions, type ClassroomSession } from '../../../lib/classSessionApi'
import styles from './ClassSessionInvitation.module.css'

export default function ClassSessionInvitation() {
  const user = useAuthStore(state => state.user)
  const authenticated = useAuthStore(state => state.isAuthenticated)
  const initialized = useAuthStore(state => state.isInitialized)
  const location = useLocation()
  // Mount only inside the verified student's area. Unmounting also cancels
  // polling and clears invitations/dismissals on logout or account changes.
  if (!initialized || !authenticated || user?.role !== 'student' ||
      !location.pathname.startsWith('/student/') || location.pathname.startsWith('/student/class-session/')) return null
  return <StudentInvitations key={user.id} />
}

function StudentInvitations() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ClassroomSession[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try { const data = await listClassSessions(); if (!cancelled) setSessions(data.sessions) }
      catch { if (!cancelled) setSessions([]) }
      if (!cancelled) timer = setTimeout(() => void refresh(), 5000)
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [])
  const invitation = sessions.find(item => !item.student_session && !dismissed.includes(`${item.id}:${item.invitation_revision}`))
  if (!invitation) return null
  return <aside className={styles.prompt} role="status" aria-label="Teacher-led session invitation"><div><strong>{invitation.teacher_name} is inviting you to {invitation.class_name}</strong><p>Your teacher has started a lesson. Join your classmates.</p></div><button onClick={() => navigate(`/student/class-session/${invitation.id}`)}>Join lesson</button><button className={styles.later} onClick={() => setDismissed(previous => [...previous, `${invitation.id}:${invitation.invitation_revision}`])}>Later</button></aside>
}
