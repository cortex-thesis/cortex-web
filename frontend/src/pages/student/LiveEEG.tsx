import { Activity, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BatteryMedium, Check, Radio, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DetailSkeleton, InlineSkeleton, TaskCard } from '../../components/molecules'
import { PlayfulZoneTemplate } from '../../components/templates'
import { api } from '../../lib/api'
import { playLessonSound } from '../../lib/lessonSounds'
import { endStudentSession, getStudentSessions, trackStudentSlide } from '../../lib/studentApi'
import { MUSE_CHANNELS, useMuseStore, type BandPowers } from '../../store/museStore'
import type { Task } from '../../types'
import EEGRegulation from './EEGRegulation'
import { eegSessionPhase, nextEEGMode, sustainedEEGState } from '../../lib/eegTransitions'
import type { CognitiveState } from '../../constants/states'
import { lessonTrivia } from '../../lib/lessonTrivia'
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
  'imageUrl', 'altText', 'priceTag', 'audioUrl', 'contentLabel', 'contentDescription', 'durationSeconds', 'mediaUrl', 'actionLabel',
  'taskTemplate', 'correctItemIds', 'correctOrder', 'sortAnswers', 'selectionMode', 'correctFeedback', 'retryFeedback',
  'sceneImageUrl', 'preferredColumns', 'boardMinHeight', 'mediaFit',
  'dirtyImageUrl', 'cleaningImageUrl', 'cleanImageUrl', 'toolImageUrl',
].map((name) => [name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), name]))
function taskConfiguration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(taskConfiguration)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [fieldNames[key] ?? key, key === 'sort_answers' ? item : taskConfiguration(item)]))
}

interface TeacherControl { paused: boolean; presentation_mode: 'focus' | 'breathing' | 'refocus' | 'returning' | 'adaptive'; lesson: LessonData }

export default function LiveEEG({ teacherControl }: { teacherControl?: TeacherControl }) {
  const navigate = useNavigate()
  const location = useLocation()
  const context = (location.state as { sessionId?: string; classId?: number; lessonId?: number; mode?: string } | null) ?? {}
  const { status, deviceName, battery, quality, bands, absoluteBands, relativeBands, baselineProgress, acceptedChannels, disconnect } = useMuseStore()
  const [lesson, setLesson] = useState<LessonData | null>(teacherControl?.lesson ?? null)
  const [position, setPosition] = useState(0)
  const [answered, setAnswered] = useState<Record<number, boolean>>({})
  const [retry, setRetry] = useState<Record<number, number>>({})
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
  const [triviaIndex, setTriviaIndex] = useState(() => Math.floor(Math.random() * 100))
  const [completed, setCompleted] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState('')
  const [deviceState, setDeviceState] = useState<CognitiveState | null>(null)
  const [forcedState, setForcedState] = useState<CognitiveState | null>(null)
  const [localMode, setMode] = useState<'focus' | 'breathing' | 'refocus' | 'returning'>('focus')
  const adaptive = !teacherControl || teacherControl.presentation_mode === 'adaptive'
  const mode = adaptive ? localMode : teacherControl!.presentation_mode as 'focus' | 'breathing' | 'refocus' | 'returning'
  const [ending, setEnding] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [savingStep, setSavingStep] = useState(false)
  const finishing = useRef(false)
  const sessionSaved = useRef(false)
  const recordingStopped = useRef(false)
  const complete = Boolean(lesson?.slides.length && position >= lesson.slides.length)
  useEffect(() => {
    if (!adaptive || mode !== 'returning') return
    const timer = window.setTimeout(() => { setMode('focus'); playLessonSound('transition') }, 1800)
    return () => window.clearTimeout(timer)
  }, [mode, adaptive])
  const currentState = forcedState ?? (status === 'streaming' && baselineProgress >= 100 && acceptedChannels > 0 ? deviceState : null)
  const stateHold = useRef<{ state: CognitiveState | null; since: number }>({ state: null, since: 0 })
  useEffect(() => { stateHold.current = { state: currentState, since: Date.now() } }, [currentState])
  function transitionState() {
    return stateHold.current.state === currentState ? sustainedEEGState(currentState, stateHold.current.since, Date.now()) : null
  }
  const lastStoredAt = useRef(0)
  const sessionId = context.sessionId

  useEffect(() => {
    if (!sessionId || teacherControl) return
    void api<SessionPayload>(`/sessions/${sessionId}/eeg/`, { cache: 'no-store' }).then((payload) => setLesson(payload.lesson)).catch((reason: Error) => setError(reason.message))
  }, [sessionId, teacherControl])

  const calibrated = Boolean(forcedState || (status === 'streaming' && baselineProgress >= 100 && acceptedChannels > 0))
  const phase = eegSessionPhase(complete, ending, calibrated)
  useEffect(() => {
    if (phase !== 'calibrating') return
    const timer = window.setInterval(() => setTriviaIndex(value => value + 1), 7000)
    return () => window.clearInterval(timer)
  }, [phase])
  const trivia = lessonTrivia(lesson?.package)
  const slide = lesson?.slides[position]
  useEffect(() => {
    if (!sessionId || !slide || mode !== 'focus' || !calibrated || complete || ending || teacherControl?.paused) return
    void trackStudentSlide(sessionId, slide.id, 'enter').catch((reason: Error) => setError(reason.message))
  }, [sessionId, slide, mode, calibrated, complete, ending, teacherControl?.paused])

  useEffect(() => {
    if (!sessionId || complete || ending || teacherControl?.paused || status !== 'streaming' || baselineProgress < 100) return
    if (Date.now() - lastStoredAt.current < 2000) return
    lastStoredAt.current = Date.now()
    void api<{ state: CognitiveState }>(`/sessions/${sessionId}/eeg/`, {
      method: 'POST', body: JSON.stringify({ slide_id: mode === 'focus' ? slide?.id ?? null : null, bands, absolute_bands: absoluteBands, relative_bands: relativeBands, signal_quality: quality, accepted_channels: acceptedChannels, battery_level: battery }),
    }).then(sample => { if (!recordingStopped.current) setDeviceState(acceptedChannels > 0 ? sample.state : null) }).catch((reason: Error) => { if (!recordingStopped.current) { setDeviceState(null); setError(reason.message) } })
  }, [sessionId, complete, ending, teacherControl?.paused, status, baselineProgress, mode, slide?.id, bands, absoluteBands, relativeBands, quality, acceptedChannels, battery])

  const tasks = useMemo<Task[]>(() => lesson ? lesson.slides.map((item, index) => {
    const configuration = taskConfiguration(item.activity.configuration) as Partial<Task>
    return {
      question: '', choices: [], answer: '', ...configuration,
      imageUrl: configuration.imageUrl ?? item.activity.asset_url ?? null,
      id: String(item.id), title: item.title, package: lesson.package,
      index: index + 1, total: lesson.slides.length, contentType: item.activity.type,
    }
  }) : [], [lesson])
  const task = tasks[position]
  const pendingAnswers = useRef(new Set<Promise<unknown>>())
  const unsavedAnswers = useRef<Record<number, { correct: boolean; selected: string }>>({})
  const [saveFailed, setSaveFailed] = useState(false)
  function saveAnswer(index: number, correct: boolean, selected: string) {
    if (!sessionId || !lesson) return
    const answer = { correct, selected }
    unsavedAnswers.current[index] = answer
    const request = api(`/sessions/${sessionId}/slides/${lesson.slides[index].id}/`, {
      method: 'POST', body: JSON.stringify({ action: 'answer', correct, selected, attempt: (retry[index] ?? 0) + 1 }),
    }).then(() => {
      if (unsavedAnswers.current[index] === answer) delete unsavedAnswers.current[index]
      const remaining = Object.keys(unsavedAnswers.current).length > 0
      setSaveFailed(remaining)
      if (!remaining) setError(previous => previous.includes('saving') || previous.includes('saved') ? '' : previous)
    })
      .catch(() => { setSaveFailed(true); setError('An answer could not be saved. Retry saving before finishing.') })
      .finally(() => pendingAnswers.current.delete(request))
    pendingAnswers.current.add(request)
  }

  const isActivity = Boolean(task && (task.taskTemplate || (task.template ?? 'multiple_choice') === 'multiple_choice'))
  const requiresMedia = Boolean(task?.mediaUrl && (task.contentType === 'audio' || task.contentType === 'video' || task.template === 'instructional_video' || task.template === 'calming_soundscape'))
  const canAdvance = answered[position] || (!isActivity && !requiresMedia)
  async function advance() {
    if (savingStep || !lesson || teacherControl?.paused) return
    if (sessionId) {
      setSavingStep(true)
      try {
        await trackStudentSlide(sessionId, lesson.slides[position].id, 'enter')
        await trackStudentSlide(sessionId, lesson.slides[position].id, 'complete')
      } catch {
        setError('Your lesson progress could not be saved. Please try Next again.')
        return
      } finally { setSavingStep(false) }
    }
    setCompleted(previous => new Set(previous).add(position))
    setPosition(position + 1)
    setVisited(previous => new Set(previous).add(position + 1))
    const nextMode = adaptive ? nextEEGMode(transitionState(), 'lesson', position + 1 >= lesson!.slides.length) : mode
    if (position + 1 >= lesson!.slides.length) recordingStopped.current = true
    setMode(nextMode)
    if (nextMode === 'focus') playLessonSound(position === lesson!.slides.length - 1 ? 'finished' : 'transition')
  }
  const controls = import.meta.env.DEV && !teacherControl && <details className={styles.stateChooser} open>
    <summary>Force state: {forcedState ? 'Manual' : 'EEG device'}</summary>
    <label>Student state<select aria-label="Force student state" value={forcedState ?? ''} onChange={event => setForcedState(event.target.value ? event.target.value as CognitiveState : null)}>
      <option value="">EEG device based</option>{(['focused', 'relaxed', 'overstimulated', 'distracted'] as const).map(state => <option key={state} value={state}>{state}</option>)}
    </select></label>
    <button onClick={() => setForcedState(null)} disabled={!forcedState}>Back to EEG device based</button>
    <small>State: {currentState ?? 'Waiting for signal'}. Breaks require 5 seconds in the same state and begin at Next activity.</small>
  </details>


  async function finish() {
    if (finishing.current || savingStep) return
    finishing.current = true
    await Promise.all([...pendingAnswers.current])
    if (Object.keys(unsavedAnswers.current).length) { finishing.current = false; setError('Please retry saving your answers before finishing.'); return }
    recordingStopped.current = true
    setEnding(true)
    setSavingSession(true)
    setMode('focus')
    disconnect()
    if (!sessionId) return navigate('/student/sessions', { replace: true })
    try {
      if (!sessionSaved.current) { await endStudentSession(sessionId); sessionSaved.current = true }
      const data = await getStudentSessions(); const session = data.sessions.find((item) => item.id === sessionId)
      if (!session) throw new Error('Session unavailable')
      navigate('/student/session-summary', { replace: true, state: { summary: { sessionId, duration: session.duration_seconds, focusScore: session.focus_score, stateDistribution: session.state_distribution, taskCompleted: session.tasks_completed, taskTotal: session.tasks_total } } })
    } catch (reason) {
      setError(sessionSaved.current ? 'Your session is saved, but the summary could not be loaded. Please try again.' : reason instanceof Error ? 'Session could not be saved: ' + reason.message + '. Check that the backend is running and try again.' : 'Session could not be saved. Please try again.')
    } finally { finishing.current = false; setSavingSession(false) }
  }


  return <>
  {phase === 'calibrating' && <div className={styles.calibration}>
    <Radio size={42} aria-hidden="true" />
    <h1>{status === 'connecting' ? 'Reconnecting to your headset' : status !== 'streaming' ? 'Connect your headset' : 'Getting ready for your lesson'}</h1>
    <p>{status === 'streaming' ? 'Sit comfortably while we calibrate your headset.' : 'Keep Muse 2 switched on and nearby.'}</p>
    <progress aria-label="Headset calibration" max={100} value={baselineProgress} />
    <p role="status">{baselineProgress < 100 ? `Calibration ${baselineProgress}%` : 'Checking for a clear signal...'}</p>
    <aside className={styles.trivia}><span>Did you know?</span><p key={triviaIndex}>{trivia[triviaIndex % trivia.length]}</p></aside>
    {error && <p role="alert">{error}</p>}
    {status !== 'streaming' && status !== 'connecting' && <button onClick={() => navigate('/student/eeg-pairing', { replace: true, state: context })}>Connect Muse 2</button>}
    {saveFailed && <button onClick={() => Object.entries(unsavedAnswers.current).forEach(([index, answer]) => saveAnswer(Number(index), answer.correct, answer.selected))}>Retry saving answers</button>}
    <button onClick={() => void finish()}>End session</button>
  </div>}
  <Activity mode={phase !== 'calibrating' ? 'visible' : 'hidden'}><PlayfulZoneTemplate calm={mode !== 'focus'} showNav={mode !== 'breathing'}><div className={`${shellStyles.page} ${playerStyles.page} ${mode === 'breathing' ? styles.quiet : ''}`}>
    <header className={shellStyles.header}>
      <button className={shellStyles.backBtn} onClick={() => void finish()} aria-label="End session and return"><ArrowLeft size={18} /></button>
      <div><span className={shellStyles.eyebrow}>Recorded lesson</span><h1>{lesson?.title ?? <InlineSkeleton width={260} height={30} />}</h1><p>Your lesson is the same with Muse connected. Brainwave monitoring runs quietly in the background.</p></div>
    </header>
    {phase !== 'complete' && <details className={styles.monitorDetails}><summary>EEG device: {currentState ?? 'Calibrating'}</summary><section className={styles.monitor} aria-label="Live Muse 2 status">
      <div className={styles.monitorDevice}><Radio size={15} /><strong>{deviceName || 'Muse 2'}</strong><span><BatteryMedium size={15} />{battery == null ? '—' : `${battery}%`}</span></div>
      <div className={styles.monitorBands}>{BANDS.map(({ key, label }) => <span key={key}><small>{label}</small><strong>{bands[key].toFixed(3)}</strong></span>)}</div>
      <div className={styles.monitorQuality}><span>{acceptedChannels}/4 clean channels</span><span>Baseline {baselineProgress}%</span>{MUSE_CHANNELS.map((channel, index) => <i key={channel} title={`${channel} contact`} className={quality[index] === 2 ? styles.contactGood : quality[index] === 1 ? styles.contactFair : styles.contactPoor} />)}</div>
    </section></details>}
    {error && <p className={styles.error}>{error}</p>}
    <section className={`${playerStyles.player} `} aria-label="Lesson activities">
      {!!lesson?.slides.length && <div className={`${playerStyles.progress} ${mode !== 'focus' ? styles.quietProgress : ''}`}>
        <div className={playerStyles.progressTrack} role="progressbar" aria-label="Lesson steps completed" aria-valuemin={0} aria-valuemax={lesson.slides.length} aria-valuenow={completed.size}><span style={{ width: `${completed.size / lesson.slides.length * 100}%` }} /></div>
        <ol className={playerStyles.dots}>{lesson.slides.map((item, index) => <li key={item.id} aria-current={!complete && index === position ? 'step' : undefined} className={`${playerStyles.dot} ${completed.has(index) ? playerStyles.done : ''} ${!complete && index === position ? playerStyles.current : ''}`}>{completed.has(index) ? <Check size={12} /> : <span />}</li>)}</ol>
        <span className={playerStyles.progressHint}>{complete ? 'All activities complete' : `Activity ${position + 1} of ${lesson.slides.length}`} · Filled: completed · Ring: current</span>
      </div>}
      {phase !== 'complete' && (mode === 'breathing' || mode === 'refocus') && <EEGRegulation key={mode} mode={mode} paused={teacherControl?.paused} allowResume={adaptive} state={currentState} transitionState={adaptive ? transitionState : () => 'distracted'} onResume={() => setMode('returning')} onBreathing={() => setMode('breathing')} />}
      {phase !== 'complete' && mode === 'returning' && <div className={styles.returnTransition} role="status"><Check size={40} aria-hidden="true" /><h2>Let's ease back into your lesson</h2><p>One activity at a time. You can go at your own pace.</p></div>}
      <Activity mode={mode === 'focus' || phase === 'complete' ? 'visible' : 'hidden'}>
      <div className={`${playerStyles.stage} ${mode === 'focus' ? styles.focusArrival : ''}`}>{phase === 'complete' ? <div className={playerStyles.complete}><Check size={40} /><h2>{ending ? 'Session complete' : 'Lesson complete'}</h2><p role="status">{savingSession ? 'Saving your recorded session...' : teacherControl && !ending ? 'Wait here for your teacher to choose the next lesson or end the session.' : 'Your recorded session is ready to save.'}</p>{(!teacherControl || ending) && <button disabled={savingSession} className={`${playerStyles.button} ${playerStyles.next}`} onClick={() => void finish()}>{savingSession ? 'Saving...' : 'Save and finish session'}</button>}</div> : !lesson ? <DetailSkeleton /> : !lesson.slides.length ? <p>No activities have been added to this lesson yet.</p> : task ? tasks.map((item, index) => visited.has(index) && <Activity key={item.id + '/' + (retry[index] ?? 0)} mode={index === position ? 'visible' : 'hidden'}><TaskCard className={playerStyles.task} showProgress={false} lessonNavigation task={item} onAnswered={(correct, selected) => {
        setAnswered(previous => ({ ...previous, [index]: correct }))
        saveAnswer(index, correct, selected)
      }} /></Activity>) : null}</div>
      {phase !== 'complete' && task && <nav className={playerStyles.actions} aria-label="Activity navigation">
        <button className={`${playerStyles.button} ${playerStyles.previous}`} disabled={position === 0 || savingStep} onClick={() => { playLessonSound('transition'); setVisited(previous => new Set(previous).add(position - 1)); setPosition(position - 1) }}><ArrowLeft size={18} />Previous</button>
        {isActivity && answered[position] === false && <button className={`${playerStyles.button} ${playerStyles.retry}`} onClick={() => { setRetry(previous => ({ ...previous, [position]: (previous[position] ?? 0) + 1 })); setAnswered(previous => { const next = { ...previous }; delete next[position]; return next }) }}><RotateCcw size={18} />Try again</button>}
        <button className={`${playerStyles.button} ${playerStyles.next}`} disabled={!canAdvance || savingStep} onClick={() => void advance()}>{savingStep ? 'Saving progress…' : position === lesson!.slides.length - 1 ? 'Finish lesson' : 'Next activity'}<ArrowRight size={18} /></button>
      </nav>}
      </Activity>
      {saveFailed && <button className={styles.endSession} onClick={() => Object.entries(unsavedAnswers.current).forEach(([index, answer]) => saveAnswer(Number(index), answer.correct, answer.selected))}>Retry saving answers</button>}
    </section>
    {phase !== 'complete' && <button className={styles.endSession} onClick={() => void finish()}>{teacherControl ? 'Leave and save my session' : 'End and save session'}</button>}
  </div></PlayfulZoneTemplate></Activity>{controls}</>
}
