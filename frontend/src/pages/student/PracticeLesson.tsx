import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, RotateCcw, Check } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PlayfulZoneTemplate } from '../../components/templates'
import { DetailSkeleton, InlineSkeleton, TaskCard } from '../../components/molecules'
import { api } from '../../lib/api'
import type { Task } from '../../types'
import styles from './FreeLessonSelect.module.css'
import playerStyles from './PracticeLesson.module.css'

interface Lesson {
  progress: { completed_slide_ids: number[] }
  id: number
  title: string
  package: Task['package']
  slides: { id: number; title: string; activity: { type: Task['contentType']; configuration: Record<string, unknown> } }[]
}

const fieldNames: Record<string, string> = Object.fromEntries([
  'imageUrl', 'altText', 'contentLabel', 'contentDescription', 'durationSeconds', 'mediaUrl',
  'actionLabel', 'taskTemplate', 'correctItemIds', 'correctOrder', 'sortAnswers', 'selectionMode',
  'correctFeedback', 'retryFeedback', 'sceneImageUrl', 'preferredColumns', 'boardMinHeight', 'mediaFit',
].map((name) => [name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), name]))

function taskConfiguration(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(taskConfiguration)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [fieldNames[key] ?? key, key === 'sort_answers' ? item : taskConfiguration(item)]))
}

export default function PracticeLesson() {
  const { classId = '', lessonId = '' } = useParams()
  return <LessonPlayer key={`${classId}/${lessonId}`} classId={classId} lessonId={lessonId} />
}

function LessonPlayer({ classId, lessonId }: { classId: string; lessonId: string }) {
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [error, setError] = useState('')
  const [position, setPosition] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [retry, setRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const reduceMotion = useReducedMotion()
  const [completed, setCompleted] = useState<Set<number>>(() => new Set())
  useEffect(() => {
    const controller = new AbortController()
    api<Lesson>(`/student/classes/${classId}/lessons/${lessonId}/`, { method: 'POST', body: '{}', signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setLesson(data)
        const done = new Set(data.slides.flatMap((item, index) => data.progress.completed_slide_ids.includes(item.id) ? [index] : []))
        setCompleted(done)
        const firstPending = data.slides.findIndex((_, index) => !done.has(index))
        setPosition(firstPending < 0 ? 0 : firstPending)
      }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load lesson.') })
    return () => controller.abort()
  }, [classId, lessonId])
  const back = () => navigate(lesson ? `/student/class/${classId}/package/${lesson.package}` : `/student/class/${classId}`, { replace: true })
  const slide = lesson?.slides[position]
  async function advance() {
    if (!slide || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await api(`/student/classes/${classId}/lessons/${lessonId}/`, { method: 'POST', body: JSON.stringify({ slide_id: slide.id }) })
      setPosition((value) => value + 1)
      setAnswered(false)
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Progress could not be saved. Please try again.')
    } finally { setSaving(false) }
  }
  const task: Task | null = lesson && slide ? {
    imageUrl: null, question: '', choices: [], answer: '',
    ...taskConfiguration(slide.activity.configuration) as Partial<Task>,
    id: String(slide.id), title: slide.title, package: lesson.package,
    index: position + 1, total: lesson.slides.length, contentType: slide.activity.type,
  } : null
  const complete = Boolean(lesson?.slides.length && position >= lesson.slides.length)
  return <PlayfulZoneTemplate><div className={`${styles.page} ${playerStyles.page}`}>
    <header className={styles.header}>
      <button className={styles.backBtn} onClick={back} aria-label="Back to lessons"><ArrowLeft size={18} /></button>
      <div><span className={styles.eyebrow}>Lesson practice</span><h1>{lesson?.title ?? <InlineSkeleton width={260} height={30} />}</h1><p>Your lesson progress is saved as you continue. Practice stays separate from EEG session history.</p></div>
    </header>
    <section className={playerStyles.player} aria-label="Lesson activities">
      {!!lesson?.slides.length && <div className={playerStyles.progress}>
        <div className={playerStyles.progressTrack} role="progressbar" aria-label="Activity position" aria-valuemin={1} aria-valuemax={lesson.slides.length} aria-valuenow={Math.min(position + 1, lesson.slides.length)} aria-valuetext={complete ? 'All activities complete' : `Activity ${position + 1} of ${lesson.slides.length}; ${completed.size} completed`}>
          <span style={{ width: `${complete ? 100 : position / Math.max(lesson.slides.length - 1, 1) * 100}%` }} />
        </div>
        <ol className={playerStyles.dots} aria-label="Activity progress">{lesson.slides.map((item, index) => <li key={item.id} aria-current={!complete && index === position ? 'step' : undefined} aria-label={`Activity ${index + 1}: ${!complete && index === position ? 'current' : completed.has(index) ? 'completed' : 'remaining'}`} className={`${playerStyles.dot} ${completed.has(index) ? playerStyles.done : ''} ${!complete && index === position ? playerStyles.current : ''}`}>
          {completed.has(index) ? <Check size={12} aria-hidden="true" /> : <span />}
        </li>)}</ol>
        <span className={playerStyles.progressHint}>{complete ? 'All activities complete' : `${lesson.slides.length - completed.size} activities left`} · Filled: completed · Ring: current</span>
      </div>}
      <div className={playerStyles.stage}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={task ? `${task.id}/${retry}` : error ? 'error' : complete ? 'complete' : 'loading'} initial={{ opacity: reduceMotion ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: reduceMotion ? 1 : 0 }} transition={{ duration: reduceMotion ? 0 : .18 }}>
            {error ? <p role="alert">{error}</p> : !lesson ? <DetailSkeleton /> : !lesson.slides.length ? <p>No activities have been added to this lesson yet.</p> : task ? <TaskCard className={playerStyles.task} showProgress={false} task={task} onAnswered={(correct) => { setAnswered(correct); if (correct) setCompleted((previous) => new Set(previous).add(position)) }} /> : <div className={playerStyles.complete}><Check size={40} /><h2>Practice complete</h2><p>You reached the end of this lesson.</p><button className={`${playerStyles.button} ${playerStyles.next}`} onClick={back}>Back to lessons</button></div>}
          </motion.div>
        </AnimatePresence>
      </div>
      {saveError && <p role="alert">{saveError}</p>}
      {task && <nav className={playerStyles.actions} aria-label="Activity navigation">
        <button className={`${playerStyles.button} ${playerStyles.previous}`} disabled={position === 0 || saving} onClick={() => { setPosition(position - 1); setAnswered(false) }}><ArrowLeft size={18} />Previous</button>
        <button className={`${playerStyles.button} ${playerStyles.retry}`} disabled={saving} onClick={() => { setRetry(retry + 1); setAnswered(false); setCompleted((previous) => { const next = new Set(previous); next.delete(position); return next }) }}><RotateCcw size={18} />Try again</button>
        <button className={`${playerStyles.button} ${playerStyles.next}`} disabled={!answered || saving} onClick={() => void advance()}>{saving ? 'Saving...' : position === lesson!.slides.length - 1 ? 'Finish practice' : 'Next activity'}<ArrowRight size={18} /></button>
      </nav>}
    </section>
  </div></PlayfulZoneTemplate>
}
