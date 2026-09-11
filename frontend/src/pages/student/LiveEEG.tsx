import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BatteryMedium, Bluetooth, Check, Radio } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DetailSkeleton, InlineSkeleton, TaskCard } from '../../components/molecules'
import { api } from '../../lib/api'
import { endStudentSession, getStudentSessions, trackStudentSlide } from '../../lib/studentApi'
import { MUSE_CHANNELS, useMuseStore, type BandPowers } from '../../store/museStore'
import type { Task } from '../../types'
import styles from './LiveEEG.module.css'

interface LessonData {
  id: number
  title: string
  package: Task['package']
  slides: Array<{ id: number; title: string; activity: { type: Task['contentType']; configuration: Record<string, unknown> } }>
}
interface SessionPayload { lesson: LessonData | null }

const BANDS: Array<{ key: keyof BandPowers; label: string }> = [
  { key: 'delta', label: 'Delta' }, { key: 'theta', label: 'Theta' },
  { key: 'alpha', label: 'Alpha' }, { key: 'beta', label: 'Beta' }, { key: 'gamma', label: 'Gamma' },
]
const fieldNames: Record<string, string> = Object.fromEntries([
  'imageUrl', 'altText', 'contentLabel', 'contentDescription', 'durationSeconds', 'mediaUrl', 'actionLabel',
  'taskTemplate', 'correctItemIds', 'correctOrder', 'sortAnswers', 'selectionMode', 'correctFeedback', 'retryFeedback',
  'sceneImageUrl', 'preferredColumns', 'boardMinHeight', 'mediaFit',
].map((name) => [name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), name]))
function taskConfiguration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(taskConfiguration)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [fieldNames[key] ?? key, taskConfiguration(item)]))
}

export default function LiveEEG() {
  const navigate = useNavigate()
  const location = useLocation()
  const context = (location.state as { sessionId?: string; classId?: number; lessonId?: number; mode?: string } | null) ?? {}
  const { status, deviceName, battery, quality, bands, absoluteBands, relativeBands, baselineProgress, acceptedChannels, disconnect } = useMuseStore()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [position, setPosition] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [error, setError] = useState('')
  const lastStoredAt = useRef(0)
  const sessionId = context.sessionId

  useEffect(() => {
    if (!sessionId) return
    void api<SessionPayload>(`/sessions/${sessionId}/eeg/`, { cache: 'no-store' }).then((payload) => setLesson(payload.lesson)).catch((reason: Error) => setError(reason.message))
  }, [sessionId])

  const slide = lesson?.slides[position]
  useEffect(() => {
    if (!sessionId || !slide) return
    void trackStudentSlide(sessionId, slide.id, 'enter').catch((reason: Error) => setError(reason.message))
  }, [sessionId, slide])

  useEffect(() => {
    if (!sessionId || status !== 'streaming' || baselineProgress < 100) return
    if (Date.now() - lastStoredAt.current < 2000) return
    lastStoredAt.current = Date.now()
    void api(`/sessions/${sessionId}/eeg/`, {
      method: 'POST', body: JSON.stringify({ slide_id: slide?.id ?? null, bands, absolute_bands: absoluteBands, relative_bands: relativeBands, signal_quality: quality, accepted_channels: acceptedChannels, battery_level: battery }),
    }).catch((reason: Error) => setError(reason.message))
  }, [sessionId, status, baselineProgress, slide?.id, bands, absoluteBands, relativeBands, quality, acceptedChannels, battery])

  const task = useMemo<Task | null>(() => lesson && slide ? ({
    imageUrl: null, question: '', choices: [], answer: '',
    ...taskConfiguration(slide.activity.configuration) as Partial<Task>, id: String(slide.id), title: slide.title,
    package: lesson.package, index: position + 1, total: lesson.slides.length, contentType: slide.activity.type,
  }) : null, [lesson, slide, position])

  if (status !== 'streaming') return <div className={styles.unsupported}><Bluetooth size={44} /><h1>Muse 2 is not connected</h1><p>Reconnect the headset to continue this lesson session.</p><button onClick={() => navigate('/student/eeg-pairing', { replace: true, state: context })}>Connect Muse 2</button></div>

  async function finish() {
    disconnect()
    if (!sessionId) return navigate('/student/sessions', { replace: true })
    try {
      await endStudentSession(sessionId)
      const data = await getStudentSessions(); const session = data.sessions.find((item) => item.id === sessionId)
      if (!session) throw new Error('Session unavailable')
      navigate('/student/session-summary', { replace: true, state: { summary: { sessionId, duration: session.duration_seconds, focusScore: session.focus_score, stateDistribution: session.state_distribution, taskCompleted: session.tasks_completed, taskTotal: session.tasks_total } } })
    } catch { navigate('/student/sessions', { replace: true }) }
  }

  return <main className={styles.sessionPage}>
    <header className={styles.compactHeader}>
      <div><span className={styles.eyebrow}>Recorded Muse 2 lesson</span><h1>{lesson?.title ?? <InlineSkeleton width={260} height={30} />}</h1></div>
      <div className={styles.device}><Radio size={15} />{deviceName || 'Muse 2'}<span><BatteryMedium size={15} />{battery == null ? '—' : `${battery}%`}</span></div>
    </header>
    <section className={styles.eegBar} aria-label="Live processed brainwave values">
      {BANDS.map(({ key, label }) => <div key={key}><span>{label}</span><strong>{bands[key].toFixed(3)}</strong></div>)}
      <div><span>Signal</span><strong>{acceptedChannels}/4</strong></div>
      <div><span>Baseline</span><strong>{baselineProgress}%</strong></div>
    </section>
    <section className={styles.contactBar}>{MUSE_CHANNELS.map((channel, index) => <span key={channel} className={quality[index] === 2 ? styles.contactGood : quality[index] === 1 ? styles.contactFair : styles.contactPoor}>{channel}</span>)}</section>
    {error && <p className={styles.error}>{error}</p>}
    <section className={styles.lessonContainer}>
      {lesson && <div className={styles.lessonProgress}><span style={{ width: `${Math.min(100, (position + 1) * 100 / Math.max(lesson.slides.length, 1))}%` }} /></div>}
      <div className={styles.lessonStage}>{!lesson ? <DetailSkeleton /> : !slide ? <div className={styles.complete}><Check size={40} /><h2>Lesson complete</h2><button onClick={() => void finish()}>Save and finish session</button></div> : task && <TaskCard showProgress={false} task={task} onAnswered={setAnswered} />}</div>
      {slide && <nav className={styles.lessonActions}><button disabled={position === 0} onClick={() => { setPosition((value) => value - 1); setAnswered(false) }}><ArrowLeft size={17} /> Previous</button><button disabled={!answered} onClick={() => { setPosition((value) => value + 1); setAnswered(false) }}>{position === lesson!.slides.length - 1 ? 'Complete lesson' : 'Next'} <ArrowRight size={17} /></button></nav>}
    </section>
    <button className={styles.endSession} onClick={() => void finish()}>End and save session</button>
  </main>
}
