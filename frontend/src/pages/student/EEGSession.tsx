import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import LiveEEG from './LiveEEG'
import { heartbeatClassSession, type ClassroomSession, type ClassMode } from '../../lib/classSessionApi'
import { useMuseStore } from '../../store/museStore'
import { playLessonSound } from '../../lib/lessonSounds'
import styles from './ClassSessionLobby.module.css'

export default function EEGSession() {
  const location = useLocation()
  const context = location.state as { classSessionId?: string; sessionId?: string } | null
  return context?.classSessionId ? <ClassroomPlayer key={context.classSessionId} groupId={context.classSessionId} /> : <LiveEEG />
}

function ClassroomPlayer({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const disconnect = useMuseStore(state => state.disconnect)
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [presentation, setPresentation] = useState<ClassMode | 'returning'>('focus')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const previousMode = useRef<ClassMode | null>(null)
  const mediaRoot = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let returnTimer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try {
        const data = await heartbeatClassSession(groupId)
        if (cancelled) return
        setSession(data); setConnected(true); setError('')
        const mode = data.presentation_mode
        if (mode !== previousMode.current) {
          clearTimeout(returnTimer)
          if (mode === 'focus' && previousMode.current !== null) {
            setPresentation('returning')
            returnTimer = setTimeout(() => { if (!cancelled) { setPresentation('focus'); playLessonSound('transition') } }, 1800)
          } else setPresentation(mode)
          previousMode.current = mode
        }
        if (data.status === 'completed' || data.status === 'cancelled' || data.student_session?.status === 'completed') return
      } catch (reason) {
        if (!cancelled) { setConnected(false); setError(reason instanceof Error ? reason.message : 'Unable to reach your classroom.') }
      }
      if (!cancelled) timer = setTimeout(() => void refresh(), 2000)
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(returnTimer) }
  }, [groupId])
  const ended = session?.status === 'completed' || session?.status === 'cancelled' || session?.student_session?.status === 'completed'
  useEffect(() => { if (ended) disconnect() }, [ended, disconnect])
  const participant = session?.student_session
  const waiting = !connected || !session?.lesson || session.status === 'scheduled' || session.status === 'paused' || !participant
  useEffect(() => {
    if (!waiting) return
    mediaRoot.current?.querySelectorAll<HTMLMediaElement>('audio,video').forEach(media => media.pause())
    window.dispatchEvent(new Event('cortex:pause-media'))
  }, [waiting])
  if (ended) return <div className={styles.page}><section className={styles.card}><h1>Session complete</h1><p>Your teacher-led session has finished. Great work today.</p>{participant && <button className={styles.primary} onClick={() => navigate('/student/session-summary', { replace: true, state: { summary: { sessionId: participant.id, duration: participant.duration_seconds, focusScore: participant.focus_score ?? 0, stateDistribution: participant.state_distribution, taskCompleted: participant.completed_steps ?? 0, taskTotal: participant.task_total } } })}>View my session summary</button>}<button onClick={() => navigate('/student/home', { replace: true })}>Go home</button></section></div>
  return <>
    {waiting && <div className={styles.page}><section className={styles.card}><h1>{!connected ? 'Connecting to your classroom' : session?.status === 'paused' ? 'Your class is paused' : 'Waiting for your teacher'}</h1><p role="status">{session?.status === 'paused' ? 'Take a comfortable pause. Your answers will be here when your teacher resumes.' : 'Your lesson will continue when your teacher is ready.'}</p>{error && <p className={styles.error} role="alert">{error}</p>}<button onClick={() => navigate(`/student/class-session/${groupId}`, { replace: true })}>Return to lobby</button></section></div>}
    {session?.lesson && participant && <div ref={mediaRoot} inert={waiting} style={{ display: waiting ? 'none' : undefined }}><LiveEEG key={session.lesson_revision} teacherControl={{ presentation_mode: presentation, lesson: session.lesson, paused: waiting }} /></div>}
  </>
}
