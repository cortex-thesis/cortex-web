import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BatteryMedium, Bluetooth, Check, Radio, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DetailSkeleton, InlineSkeleton, TaskCard } from '../../components/molecules'
import { PlayfulZoneTemplate } from '../../components/templates'
import { api } from '../../lib/api'
import { endStudentSession, getStudentSessions, trackStudentSlide } from '../../lib/studentApi'
import { MUSE_CHANNELS, useMuseStore, type BandPowers } from '../../store/museStore'
import type { Task } from '../../types'
import styles from './LiveEEG.module.css'
import shellStyles from './FreeLessonSelect.module.css'
import playerStyles from './PracticeLesson.module.css'

interface LessonData {
  id: number
  title: string
  package: Task['package']
  slides: Array<{ id: number; title: string; activity: { type: Task['contentType']; configuration: Record<string, unknown>; asset_url?: string | null } }>
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
  const [answered, setAnswered] = useState<boolean | null>(null)
  const [retry, setRetry] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(() => new Set())
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

  const task = useMemo<Task | null>(() => {
    if (!lesson || !slide) return null
    const configuration = taskConfiguration(slide.activity.configuration) as Partial<Task>
    return {
      question: '', choices: [], answer: '', ...configuration,
      imageUrl: configuration.imageUrl ?? slide.activity.asset_url ?? null,
      id: String(slide.id), title: slide.title, package: lesson.package,
      index: position + 1, total: lesson.slides.length, contentType: slide.activity.type,
    }
  }, [lesson, slide, position])

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

  const complete = Boolean(lesson?.slides.length && position >= lesson.slides.length)
  return <PlayfulZoneTemplate><div className={`${shellStyles.page} ${playerStyles.page}`}>
    <header className={shellStyles.header}>
      <button className={shellStyles.backBtn} onClick={() => void finish()} aria-label="End session and return"><ArrowLeft size={18} /></button>
      <div><span className={shellStyles.eyebrow}>Recorded lesson</span><h1>{lesson?.title ?? <InlineSkeleton width={260} height={30} />}</h1><p>Your lesson is the same with Muse connected. Brainwave monitoring runs quietly in the background.</p></div>
    </header>
    <section className={styles.monitor} aria-label="Live Muse 2 status">
      <div className={styles.monitorDevice}><Radio size={15} /><strong>{deviceName || 'Muse 2'}</strong><span><BatteryMedium size={15} />{battery == null ? '—' : `${battery}%`}</span></div>
      <div className={styles.monitorBands}>{BANDS.map(({ key, label }) => <span key={key}><small>{label}</small><strong>{bands[key].toFixed(3)}</strong></span>)}</div>
      <div className={styles.monitorQuality}><span>{acceptedChannels}/4 clean channels</span><span>Baseline {baselineProgress}%</span>{MUSE_CHANNELS.map((channel, index) => <i key={channel} title={`${channel} contact`} className={quality[index] === 2 ? styles.contactGood : quality[index] === 1 ? styles.contactFair : styles.contactPoor} />)}</div>
    </section>
    {error && <p className={styles.error}>{error}</p>}
    <section className={`${playerStyles.player} ${task?.template === 'instructional_video' ? playerStyles.videoPlayer : ''}`} aria-label="Lesson activities">
      {!!lesson?.slides.length && <div className={playerStyles.progress}>
        <div className={playerStyles.progressTrack} role="progressbar" aria-label="Activity position" aria-valuemin={1} aria-valuemax={lesson.slides.length} aria-valuenow={Math.min(position + 1, lesson.slides.length)}><span style={{ width: `${complete ? 100 : position / Math.max(lesson.slides.length - 1, 1) * 100}%` }} /></div>
        <ol className={playerStyles.dots}>{lesson.slides.map((item, index) => <li key={item.id} aria-current={!complete && index === position ? 'step' : undefined} className={`${playerStyles.dot} ${completed.has(index) ? playerStyles.done : ''} ${!complete && index === position ? playerStyles.current : ''}`}>{completed.has(index) ? <Check size={12} /> : <span />}</li>)}</ol>
        <span className={playerStyles.progressHint}>{complete ? 'All activities complete' : `${lesson.slides.length - completed.size} activities left`} · Filled: completed · Ring: current</span>
      </div>}
      <div className={`${playerStyles.stage} ${task?.template === 'instructional_video' ? playerStyles.videoStage : ''}`}>{!lesson ? <DetailSkeleton /> : !lesson.slides.length ? <p>No activities have been added to this lesson yet.</p> : task ? <TaskCard key={`${task.id}/${retry}`} className={playerStyles.task} showProgress={false} task={task} onAnswered={(correct) => { setAnswered(correct); if (correct) setCompleted((current) => new Set(current).add(position)) }} /> : <div className={playerStyles.complete}><Check size={40} /><h2>Lesson complete</h2><p>Your recorded session is ready to save.</p><button className={`${playerStyles.button} ${playerStyles.next}`} onClick={() => void finish()}>Save and finish session</button></div>}</div>
      {task && <nav className={playerStyles.actions} aria-label="Activity navigation">
        <button className={`${playerStyles.button} ${playerStyles.previous}`} disabled={position === 0} onClick={() => { setPosition(position - 1); setAnswered(null) }}><ArrowLeft size={18} />Previous</button>
        {answered === false && <button className={`${playerStyles.button} ${playerStyles.retry}`} onClick={() => { setRetry(retry + 1); setAnswered(null); setCompleted((current) => { const next = new Set(current); next.delete(position); return next }) }}><RotateCcw size={18} />Try again</button>}
        <button className={`${playerStyles.button} ${playerStyles.next}`} disabled={answered !== true} onClick={() => { setPosition(position + 1); setAnswered(null) }}>{position === lesson!.slides.length - 1 ? 'Finish lesson' : 'Next'}<ArrowRight size={18} /></button>
      </nav>}
    </section>
    {!complete && <button className={styles.endSession} onClick={() => void finish()}>End and save session</button>}
  </div></PlayfulZoneTemplate>
}
