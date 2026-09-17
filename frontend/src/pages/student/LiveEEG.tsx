import { Activity, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BatteryMedium, Radio, RotateCcw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DetailSkeleton, InlineSkeleton, TaskCard } from '../../components/molecules'
import { PlayfulZoneTemplate } from '../../components/templates'
import { api } from '../../lib/api'
import { playLessonSound } from '../../lib/lessonSounds'
import { endStudentSession, getStudentSessions, trackStudentSlide } from '../../lib/studentApi'
import ModeBgm from '../../components/molecules/ModeBgm/ModeBgm'
import { MUSE_CHANNELS, useMuseStore, type BandPowers } from '../../store/museStore'
import type { Task } from '../../types'
import EEGRegulation from './EEGRegulation'
import { nextCalmActivity } from '../../lib/calmActivities'
import { advanceEEGHoldMeter, emptyEEGHoldMeter, heldFocusTemplate, queuedFocusTemplate, eegSessionPhase, type FocusTemplate } from '../../lib/eegTransitions'
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
  'narrationScript', 'videoOptional', 'selfReportField', 'selfReportFields',
  'imageUrl', 'altText', 'priceTag', 'audioUrl', 'contentLabel', 'contentDescription', 'durationSeconds', 'mediaUrl', 'actionLabel',
  'evidenceRole', 'displayLabel', 'revealImage', 'followUpQuestion', 'workspaceLabel', 'allowSubset', 'minimumSelections', 'hideImageLabels', 'immediateFeedback', 'targetItemId', 'paymentOptions', 'moneyItems', 'givenChange', 'changeOptions',
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
  const context = (location.state as { sessionId?: string; classId?: number; lessonId?: number; mode?: string; devBypass?: boolean } | null) ?? {}
  const { status, deviceName, battery, quality, bands, absoluteBands, relativeBands, baselineProgress, acceptedChannels, disconnect } = useMuseStore()
  const [lesson, setLesson] = useState<LessonData | null>(teacherControl?.lesson ?? null)
  const [position, setPosition] = useState(0)
  const [answered, setAnswered] = useState<Record<number, boolean>>({})
  const [focusGates, setFocusGates] = useState<Record<string, boolean>>({})
  const [activitySupport, setActivitySupport] = useState<Record<string, FocusTemplate>>({})
  const [coolActivities, setCoolActivities] = useState<Record<string, boolean>>({})
  const [lessonStarted, setLessonStarted] = useState(false)
  const [retry, setRetry] = useState<Record<number, number>>({})
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
  const [triviaIndex, setTriviaIndex] = useState(() => Math.floor(Math.random() * 100))
  const [completed, setCompleted] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState('')
  const [deviceState, setDeviceState] = useState<CognitiveState | null>(null)
  const [deviceFocusScore, setDeviceFocusScore] = useState<number | null>(null)
  const [forcedFocusScore, setForcedFocusScore] = useState(90)
  const [hold, setHold] = useState(emptyEEGHoldMeter)
  const holdRef = useRef(emptyEEGHoldMeter())
  const [forcedState, setForcedState] = useState<CognitiveState | null>(import.meta.env.DEV && context.devBypass ? 'focused' : null)
  const calmDeck = useRef<number[]>([])
  const [localMode, setMode] = useState<'focus' | 'breathing' | 'refocus' | 'returning'>('focus')
  const adaptive = !teacherControl || teacherControl.presentation_mode === 'adaptive'
  const mode = adaptive ? localMode : teacherControl!.presentation_mode as 'focus' | 'breathing' | 'refocus' | 'returning'
  const [displayMode, setDisplayMode] = useState(mode)
  const modeLeaving = displayMode !== mode
  useEffect(() => {
    if (displayMode === mode) return
    const timer = window.setTimeout(() => setDisplayMode(mode), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [mode, displayMode])
  const [ending, setEnding] = useState(false)
  const [savingSession, setSavingSession] = useState(false)
  const [savingStep, setSavingStep] = useState(false)
  const finishing = useRef(false)
  const sessionSaved = useRef(false)
  const recordingStopped = useRef(false)
  const complete = Boolean(lesson?.slides.length && position >= lesson.slides.length)
  useEffect(() => {
    if (!adaptive || mode !== 'returning') return
    const timer = window.setTimeout(() => { setMode('focus'); playLessonSound('transition') }, 3000)
    return () => window.clearTimeout(timer)
  }, [mode, adaptive])
  const currentState = forcedState ?? (status === 'streaming' && baselineProgress >= 100 && acceptedChannels > 0 ? deviceState : null)
  function transitionState() {
    if (holdRef.current.committed === 'breathing') return 'overstimulated'
    return currentState === 'focused' || currentState === 'relaxed' ? currentState : 'distracted'
  }
  const lastStoredAt = useRef(0)
  const sessionId = context.sessionId
  const reportMode = mode === 'breathing' || mode === 'refocus' ? 'relax' : 'focus'
  useEffect(() => {
    if (!sessionId || ending || complete || teacherControl?.paused) return
    void api(`/sessions/${sessionId}/mode/`, { method: 'POST', body: JSON.stringify({ mode: reportMode }) })
      .catch((reason: Error) => setError(reason.message))
  }, [sessionId, reportMode, ending, complete, teacherControl?.paused])

  useEffect(() => {
    if (!sessionId || teacherControl) return
    void api<SessionPayload>(`/sessions/${sessionId}/eeg/`, { cache: 'no-store' }).then((payload) => setLesson(payload.lesson)).catch((reason: Error) => setError(reason.message))
  }, [sessionId, teacherControl])

  const calibrated = Boolean(forcedState || (status === 'streaming' && baselineProgress >= 100 && acceptedChannels > 0))
  useEffect(() => { if (calibrated) setLessonStarted(true) }, [calibrated])
  const phase = eegSessionPhase(complete, ending, calibrated, lessonStarted)
  const focusScore = forcedState ? forcedFocusScore : calibrated ? deviceFocusScore : null
  const supportKey = `${lesson?.id ?? ''}/${position}`
  const coolingTriggered = adaptive && mode === 'focus' && currentState === 'overstimulated' && hold.overstimulated >= 5000
  const coolSupport = adaptive && mode === 'focus' && Boolean(coolActivities[supportKey] || coolingTriggered)
  useEffect(() => {
    if (coolingTriggered) setCoolActivities(previous => previous[supportKey] ? previous : { ...previous, [supportKey]: true })
  }, [supportKey, coolingTriggered])
  const candidateSupport = adaptive && mode === 'focus' && phase === 'active' ? heldFocusTemplate(hold, currentState, focusScore) : 'none'
  const queuedSupport = queuedFocusTemplate(activitySupport[supportKey] ?? 'none', candidateSupport)
  const focusTemplate = adaptive && mode === 'focus' && phase === 'active' ? queuedSupport : 'none'
  const backgroundSupport = coolSupport || focusTemplate !== 'none'
  useEffect(() => {
    if (candidateSupport === 'none') return
    setActivitySupport(previous => {
      const next = queuedFocusTemplate(previous[supportKey] ?? 'none', candidateSupport)
      return previous[supportKey] === next ? previous : { ...previous, [supportKey]: next }
    })
  }, [supportKey, candidateSupport])
  const updateHold = useEffectEvent((elapsedMs: number) => {
    const next = mode === 'refocus'
      ? advanceEEGHoldMeter(holdRef.current, currentState === 'overstimulated' ? currentState : null, null, elapsedMs)
      : advanceEEGHoldMeter(holdRef.current, currentState, focusScore, elapsedMs)
    holdRef.current = next
    setHold(previous => previous.distracted === next.distracted && previous.relaxed === next.relaxed &&
      previous.overstimulated === next.overstimulated && previous.fatigue === next.fatigue && previous.committed === next.committed ? previous : next)
    // Full meters queue a change; neither lessons nor refocusing games are interrupted.
  })
  useEffect(() => {
    if (!adaptive || phase !== 'active' || teacherControl?.paused || (mode !== 'focus' && mode !== 'refocus')) return
    let lastTick = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      updateHold(document.hidden ? 0 : Math.min(500, now - lastTick)); lastTick = now
    }, 100)
    return () => window.clearInterval(timer)
  }, [adaptive, phase, mode, teacherControl?.paused])
  function resumeLesson() {
    holdRef.current = emptyEEGHoldMeter(); setHold(holdRef.current)
    setMode('returning')
  }
  useEffect(() => {
    if (phase !== 'calibrating') return
    const timer = window.setInterval(() => setTriviaIndex(value => value + 1), 7000)
    return () => window.clearInterval(timer)
  }, [phase])
  const trivia = lessonTrivia(lesson?.package)
  const slide = lesson?.slides[position]
  const slideEntry = useRef<{ sessionId: string; slideId: number; request: Promise<unknown> } | null>(null)
  useEffect(() => {
    if (!sessionId || !slide || mode !== 'focus' || !calibrated || complete || ending || teacherControl?.paused) return
    const request = trackStudentSlide(sessionId, slide.id, 'enter')
    slideEntry.current = { sessionId, slideId: slide.id, request }
    void request.catch((reason: Error) => setError(reason.message))
  }, [sessionId, slide, mode, calibrated, complete, ending, teacherControl?.paused])

  useEffect(() => {
    if (!sessionId || complete || ending || teacherControl?.paused || status !== 'streaming' || baselineProgress < 100) return
    if (Date.now() - lastStoredAt.current < 2000) return
    lastStoredAt.current = Date.now()
    void api<{ state: CognitiveState; focus_score: number | null }>(`/sessions/${sessionId}/eeg/`, {
      method: 'POST', body: JSON.stringify({ slide_id: mode === 'focus' ? slide?.id ?? null : null, bands, absolute_bands: absoluteBands, relative_bands: relativeBands, signal_quality: quality, accepted_channels: acceptedChannels, battery_level: battery }),
    }).then(sample => { if (!recordingStopped.current) { setDeviceState(acceptedChannels > 0 ? sample.state : null); setDeviceFocusScore(sample.focus_score) } }).catch((reason: Error) => { if (!recordingStopped.current) { setDeviceState(null); setDeviceFocusScore(null); setError(reason.message) } })
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
  const requiresMedia = Boolean(!task?.videoOptional && task?.mediaUrl && (task.contentType === 'audio' || task.contentType === 'video' || task.template === 'instructional_video' || task.template === 'calming_soundscape'))
  const canAdvance = !focusGates[task?.id ?? ''] && (answered[position] || (!isActivity && !requiresMedia))
  const videoSlide = Boolean(task && (task.contentType === 'video' || task.template === 'instructional_video')) && displayMode === 'focus'
  async function advance() {
    if (savingStep || !lesson || teacherControl?.paused || mode !== 'focus') return
    playLessonSound(position === lesson.slides.length - 1 ? 'finished' : 'transition')
    if (sessionId) {
      setSavingStep(true)
      try {
        const entry = slideEntry.current
        if (entry?.sessionId === sessionId && entry.slideId === lesson.slides[position].id) {
          try { await entry.request } catch { await trackStudentSlide(sessionId, entry.slideId, 'enter') }
        } else {
          await trackStudentSlide(sessionId, lesson.slides[position].id, 'enter')
        }
        await trackStudentSlide(sessionId, lesson.slides[position].id, 'complete')
      } catch {
        setError('Your lesson progress could not be saved. Please try Next again.')
        return
      } finally { setSavingStep(false) }
    }
    setCompleted(previous => new Set(previous).add(position))
    setPosition(position + 1)
    setVisited(previous => new Set(previous).add(position + 1))
    if (position + 1 >= lesson!.slides.length) recordingStopped.current = true
    // Apply the queued break only after Next successfully saves this activity.
    if (position + 1 >= lesson!.slides.length) setMode('focus')
    else if (adaptive && holdRef.current.committed) {
      const queuedMode = holdRef.current.committed
      if (queuedMode === 'refocus') {
        holdRef.current = emptyEEGHoldMeter(); setHold(holdRef.current)
      }
      setMode(queuedMode)
      window.dispatchEvent(new Event('cortex:pause-media'))
    }
  }
  const controls = import.meta.env.DEV && !teacherControl && <details className={styles.stateChooser}>
    <summary>Development controls</summary>
    <label>Student state<select aria-label="Force student state" value={forcedState ?? ''} onChange={event => { const value = event.target.value as CognitiveState; setForcedState(value || null); setForcedFocusScore(value === 'focused' ? 90 : value === 'relaxed' ? 72 : value === 'distracted' ? 55 : 30) }}>
      <option value="">EEG device based</option>{(['focused', 'relaxed', 'overstimulated', 'distracted'] as const).map(state => <option key={state} value={state}>{state}</option>)}
    </select></label>
    {forcedState && <label>Focus score: {forcedFocusScore}<input type="range" min={0} max={100} value={forcedFocusScore} onChange={event => setForcedFocusScore(Number(event.target.value))} /></label>}
    <button onClick={() => setForcedState(null)} disabled={!forcedState}>Back to EEG device based</button>
    <small>State: {currentState ?? 'Waiting for signal'}. Distracted: {Math.round(hold.distracted / 1000)}/10s. Overstimulated: {Math.round(hold.overstimulated / 1000)}/10s. Relaxed templates: {Math.round(hold.relaxed / 1000)}/10s. Full meters queue a break for Next activity.</small>
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
  <Activity mode={phase !== 'calibrating' ? 'visible' : 'hidden'}><PlayfulZoneTemplate showNav={false} calm={mode !== 'focus'} spotlight={backgroundSupport} cool={coolSupport} quietNav={mode === 'breathing'}><div className={`${shellStyles.page} ${playerStyles.page} ${backgroundSupport ? styles.spotlight : ''} ${mode === 'breathing' ? styles.quiet : ''}`}>
    <header className={shellStyles.header}>
      <button className={shellStyles.backBtn} onClick={() => void finish()} aria-label="End session and return"><ArrowLeft size={18} /></button>
      {displayMode === 'focus' && <div><h1>{lesson?.title ?? <InlineSkeleton width={260} height={30} />}</h1></div>}
    </header>
    {phase !== 'complete' && displayMode === 'focus' && <div className={playerStyles.musicToolbar}><ModeBgm mode="focus" suspended={Boolean(task?.taskTemplate === 'audio_sequence' || (task?.mediaUrl && (videoSlide || task.contentType === 'audio' || task.template === 'calming_soundscape')) || teacherControl?.paused || phase === 'calibrating')} /></div>}
    {phase !== 'complete' && displayMode === 'focus' && (import.meta.env.DEV || teacherControl) && <details className={styles.monitorDetails}><summary>Session details</summary><section className={styles.monitor} aria-label="Live Muse 2 status">
      <div className={styles.monitorDevice}><Radio size={15} /><strong>{deviceName || 'Muse 2'}</strong><span><BatteryMedium size={15} />{battery == null ? '—' : `${battery}%`}</span></div>
      <div className={styles.monitorBands}>{BANDS.map(({ key, label }) => <span key={key}><small>{label}</small><strong>{bands[key].toFixed(3)}</strong></span>)}</div>
      <div className={styles.monitorQuality}><span>{acceptedChannels}/4 clean channels</span><span>Baseline {baselineProgress}%</span>{MUSE_CHANNELS.map((channel, index) => <i key={channel} title={`${channel} contact`} className={quality[index] === 2 ? styles.contactGood : quality[index] === 1 ? styles.contactFair : styles.contactPoor} />)}</div>
    </section></details>}
    {error && <p className={styles.error}>{error}</p>}
    <section className={`${playerStyles.player} ${videoSlide ? playerStyles.videoPlayer : ''} ${coolSupport ? styles.coolPlayer : focusTemplate === 'rest' ? styles.restPlayer : ''}`} aria-label="Lesson activities">
      {!!lesson?.slides.length && displayMode === 'focus' && !modeLeaving && <div className={`${playerStyles.progress} ${backgroundSupport ? styles.backgroundProgress : ''}`}>
        <div className={playerStyles.progressTrack} role="progressbar" aria-label="Lesson steps completed" aria-valuemin={0} aria-valuemax={lesson.slides.length} aria-valuenow={completed.size}><span style={{ width: `${Math.min(100, completed.size / Math.max(1, lesson.slides.length - 1) * 100)}%` }} /></div>
        <ol className={playerStyles.dots}>{lesson.slides.map((item, index) => <li key={item.id} aria-current={!complete && index === position ? 'step' : undefined} className={`${playerStyles.dot} ${completed.has(index) ? playerStyles.done : ''} ${!complete && index === position ? playerStyles.current : ''}`}>{completed.has(index) ? <span aria-hidden="true" /> : <span />}</li>)}</ol>
        <div className={styles.progressRow}><span className={playerStyles.progressHint} title="Filled: completed · Ring: current">{complete ? 'All activities complete' : `Activity ${position + 1} of ${lesson.slides.length}`}</span>
      <div className={styles.supportTools}>
      {adaptive && mode === 'focus' && phase === 'active' && currentState !== 'focused' && (hold.distracted > 0 || hold.overstimulated > 0) && <div className={styles.holdMeter}>
        <span>Focus support</span><progress aria-label="Hold threshold before a gentle pause" max={100} value={Math.max(hold.distracted / 10000, hold.overstimulated / 10000) * 100} />
      </div>}
      {focusTemplate === 'rest' && <button className={styles.pauseAnchor} onClick={() => {
        holdRef.current = { ...holdRef.current, committed: 'breathing' }; setHold(holdRef.current); setMode('breathing')
        window.dispatchEvent(new Event('cortex:pause-media'))
      }}>Take a 15-second breathing break</button>}
      </div>
      </div></div>}
      <div className={`${styles.modeStage} ${modeLeaving ? styles.modeLeaving : ''}`} inert={modeLeaving}>
      {phase !== 'complete' && (displayMode === 'breathing' || displayMode === 'refocus') && <EEGRegulation key={displayMode} mode={displayMode} nextCalmActivity={() => nextCalmActivity(calmDeck.current)} paused={teacherControl?.paused} allowResume={adaptive && !modeLeaving} state={currentState} transitionState={adaptive ? transitionState : () => 'distracted'} onResume={resumeLesson} onBreathing={() => setMode('breathing')} />}
      {phase !== 'complete' && displayMode === 'returning' && <div className={styles.returnTransition} role="status"><span aria-hidden="true" /><h2>Let's ease back into your lesson</h2><p>One activity at a time. You can go at your own pace.</p></div>}
      <Activity mode={displayMode === 'focus' || phase === 'complete' ? 'visible' : 'hidden'}>
      <div className={playerStyles.stage}>{phase === 'complete' ? <div className={playerStyles.complete}><span aria-hidden="true" /><h2>{ending ? 'Session complete' : 'Lesson complete'}</h2><p role="status">{savingSession ? 'Saving your recorded session...' : teacherControl && !ending ? 'Wait here for your teacher to choose the next lesson or end the session.' : 'Your recorded session is ready to save.'}</p>{(!teacherControl || ending) && <button disabled={savingSession} className={`${playerStyles.button} ${playerStyles.next}`} onClick={() => void finish()}>{savingSession ? 'Saving...' : 'Save and finish session'}</button>}</div> : !lesson ? <DetailSkeleton /> : !lesson.slides.length ? <p>No activities have been added to this lesson yet.</p> : task ? tasks.map((item, index) => visited.has(index) && <Activity key={item.id + '/' + (retry[index] ?? 0)} mode={index === position ? 'visible' : 'hidden'}><TaskCard className={playerStyles.task} showProgress={false} lessonNavigation task={item} focusTemplate={index === position ? focusTemplate : 'none'} focusHolding={currentState === 'focused' || currentState === 'relaxed'} onFocusGateChange={blocked => setFocusGates(previous => previous[item.id] === blocked ? previous : { ...previous, [item.id]: blocked })} deliveryStrategy={focusTemplate === 'rest' ? 'sensory_cooldown' : 'steady_instruction'} onChanged={() => setAnswered(previous => { const next = { ...previous }; delete next[index]; return next })} onAnswered={(correct, selected) => {
        setAnswered(previous => ({ ...previous, [index]: correct }))
        saveAnswer(index, correct, selected)
      }} /></Activity>) : null}</div>
      {phase !== 'complete' && task && <nav className={playerStyles.actions} aria-label="Activity navigation">
        <button className={`${playerStyles.button} ${playerStyles.previous}`} disabled={position === 0 || savingStep} onClick={() => { playLessonSound('transition'); setVisited(previous => new Set(previous).add(position - 1)); setPosition(position - 1) }}><ArrowLeft size={18} />Previous</button>
        {isActivity && !['audio_sequence', 'memory_flip', 'scenario_classifier'].includes(task.taskTemplate ?? '') && answered[position] === false && <button className={`${playerStyles.button} ${playerStyles.retry}`} onClick={() => { setRetry(previous => ({ ...previous, [position]: (previous[position] ?? 0) + 1 })); setAnswered(previous => { const next = { ...previous }; delete next[position]; return next }) }}><RotateCcw size={18} />Try again</button>}
        <button className={`${playerStyles.button} ${playerStyles.next}`} disabled={!canAdvance || savingStep} onClick={() => void advance()}>{savingStep ? 'Saving progress…' : position === lesson!.slides.length - 1 ? 'Finish lesson' : 'Next activity'}<ArrowRight size={18} /></button>
      </nav>}
      </Activity>
      </div>
      {saveFailed && <button className={styles.endSession} onClick={() => Object.entries(unsavedAnswers.current).forEach(([index, answer]) => saveAnswer(Number(index), answer.correct, answer.selected))}>Retry saving answers</button>}
    </section>
    {phase !== 'complete' && <button className={styles.endSession} onClick={() => void finish()}>{teacherControl ? 'Leave and save my session' : 'End and save session'}</button>}
    {controls}
  </div></PlayfulZoneTemplate></Activity></>
}
