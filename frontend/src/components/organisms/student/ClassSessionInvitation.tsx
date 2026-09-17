import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../store/authStore'
import { listClassSessions, type ClassroomSession } from '../../../lib/classSessionApi'
import styles from './ClassSessionInvitation.module.css'

export default function ClassSessionInvitation() {
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()
  const location = useLocation()
  const [sessions, setSessions] = useState<ClassroomSession[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => {
    if (user?.role !== 'student') return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try { const data = await listClassSessions(); if (!cancelled) setSessions(data.sessions) }
      catch { /* A background invitation check must not interrupt an existing lesson. */ }
      if (!cancelled) timer = setTimeout(() => void refresh(), 5000)
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [user?.id, user?.role])
  if (user?.role !== 'student' || location.pathname.startsWith('/student/class-session/')) return null
  const invitation = sessions.find(item => !item.student_session && !dismissed.includes(`${item.id}:${item.invitation_revision}`))
  if (!invitation) return null
  return <aside className={styles.prompt} role="status" aria-label="Teacher-led session invitation"><div><strong>{invitation.teacher_name} is inviting you to {invitation.class_name}</strong><p>Join your classmates in the lobby. Your teacher will start the lesson.</p></div><button onClick={() => navigate(`/student/class-session/${invitation.id}`)}>Join lobby</button><button className={styles.later} onClick={() => setDismissed(previous => [...previous, `${invitation.id}:${invitation.invitation_revision}`])}>Later</button></aside>
}
