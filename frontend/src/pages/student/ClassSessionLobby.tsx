import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CalmZoneTemplate } from '../../components/templates'
import { heartbeatClassSession, joinClassSession, type ClassroomSession } from '../../lib/classSessionApi'
import { endStudentSession } from '../../lib/studentApi'
import { useMuseStore } from '../../store/museStore'
import styles from './ClassSessionLobby.module.css'

export default function ClassSessionLobby() {
  const { groupId = '' } = useParams()
  const navigate = useNavigate()
  const status = useMuseStore(state => state.status)
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async (join = false) => {
      try {
        const data = await (join ? joinClassSession(groupId) : heartbeatClassSession(groupId))
        if (!cancelled) { setSession(data); setError('') }
        if (data.status === 'completed' || data.status === 'cancelled') return
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to connect to the lobby.')
        if (join) return
      }
      if (!cancelled) timer = setTimeout(() => void refresh(), 3000)
    }
    void refresh(true)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [groupId, retry])
  async function leave() {
    setBusy(true)
    try { if (session?.student_session) await endStudentSession(session.student_session.id); navigate('/student/home', { replace: true }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to leave the lobby.') }
    finally { setBusy(false) }
  }
  const ended = session?.status === 'completed' || session?.status === 'cancelled'
  const ready = session?.status === 'active' && session.lesson_id
  return <CalmZoneTemplate><div className={styles.page}><section className={styles.card}>
    <span className={styles.eyebrow}>{ended ? 'Session complete' : 'Teacher-led classroom'}</span>
    <div className={styles.orb} aria-hidden="true" />
    <h1>{session?.class_name ?? 'Joining your classroom...'}</h1>
    <p role="status">{ended ? 'Your teacher has ended this session. Thank you for joining.' : ready ? `${session.teacher_name} has started ${session.lesson_title}. You can join the lesson now.` : session?.status === 'paused' ? 'Your teacher has paused the class. Stay here until the lesson resumes.' : 'You are in the lobby. Get comfortable while your teacher chooses a lesson and starts the class.'}</p>
    {session?.lesson_title && !ended && <p className={styles.lesson}>Lesson: {session.lesson_title}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {error && <button onClick={() => setRetry(value => value + 1)}>Try joining again</button>}
    {ready && <button className={styles.primary} onClick={() => navigate(status === 'streaming' ? '/student/mode-select' : '/student/eeg-pairing', { state: { classId: session.class_id, lessonId: session.lesson_id, classSessionId: session.id, mode: 'teacher' } })}>{status === 'streaming' ? 'Join lesson' : 'Connect headset and join lesson'}</button>}
    <button disabled={busy} onClick={() => void leave()}>{busy ? 'Leaving...' : ended ? 'Go home' : 'Leave lobby'}</button>
  </section></div></CalmZoneTemplate>
}
