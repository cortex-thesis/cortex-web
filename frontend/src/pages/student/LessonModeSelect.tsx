import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Radio} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { InlineSkeleton } from '../../components/molecules'
import { api } from '../../lib/api'
import type { StudentLesson } from '../../lib/studentApi'
import styles from './ModeSelect.module.css'

export default function LessonModeSelect() {
  const { classId = '', lessonId = '' } = useParams()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const onboarding = search.get('context') === 'onboarding'
  const [selected, setSelected] = useState<'practice' | 'eeg'>('practice')
  const [result, setResult] = useState<{ key: string; lesson: StudentLesson } | null>(null)
  const [error, setError] = useState('')
  const key = `${classId}/${lessonId}`
  useEffect(() => {
    const controller = new AbortController()
    api<StudentLesson>(`/student/classes/${classId}/lessons/${lessonId}/`, { cache: 'no-store', signal: controller.signal })
      .then((lesson) => setResult({ key, lesson })).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load lesson.') })
    return () => controller.abort()
  }, [classId, lessonId, key])
  const lesson = result?.key === key ? result.lesson : null
  return <PlayfulZoneTemplate showNav={false}>
    <div className={styles.topBar}><button className={styles.backBtn} aria-label="Back to learning package" onClick={() => navigate(lesson ? `/student/class/${classId}/package/${lesson.package}` : `/student/class/${classId}`, { replace: true })}><ArrowLeft size={18} /></button><h1 className={styles.topTitle}>Choose how to learn</h1></div>
    <div className={styles.content}>
      <div className={styles.textBlock}><h2 className={styles.heading}>{lesson?.title ?? <InlineSkeleton width={240} height={28} />}</h2><p className={styles.sub}>How would you like to explore this lesson?</p></div>
      <div className={styles.modeCards} aria-label="Learning options">
        {([{ id: 'practice', name: 'Practice', description: onboarding ? 'Onboarding practice: answers and progress are not recorded.' : 'Try activities at your own pace. Your lesson progress is saved.', icon: BookOpen, badge: 'No headset needed', bg: '#EEEDFE' }, { id: 'eeg', name: 'EEG Session', description: 'Connect your headset and continue to a recorded EEG session.', icon: Radio, badge: 'Headset required', bg: '#E3F1EA' }] as const).map((option) => <button data-tour={option.id === 'practice' ? 'practice-mode' : undefined} key={option.id} disabled={onboarding && option.id === 'eeg'} aria-pressed={selected === option.id} className={`${styles.card} ${selected === option.id ? styles.cardSelected : ''}`} onClick={() => setSelected(option.id)}>
          <span className={styles.cardIcon} style={{ background: option.bg }}><option.icon size={30} /></span><span className={styles.cardName}>{option.name}</span><span className={styles.cardDesc}>{option.description}</span><span className={`${styles.cardBadge} ${styles.badgeFree}`}>{option.badge}</span>{selected === option.id && <span className={styles.checkmark}><span aria-hidden="true" /></span>}
        </button>)}
      </div>
      {error && <p role="alert">{error}</p>}
      <button data-tour={selected === 'practice' ? 'practice-start' : undefined} className={styles.startBtn} disabled={!lesson || !!error} onClick={() => { if (!lesson) return; if (selected === 'practice') navigate(`/student/class/${classId}/lesson/${lesson.id}/practice${onboarding ? '?context=onboarding&stage=activity' : ''}`); else navigate('/student/eeg-pairing', { state: { classId: Number(classId), lessonId: lesson.id, package: lesson.package, lesson: lesson.title } }) }}>Continue to {selected === 'practice' ? 'practice' : 'EEG session'}</button>
    </div>
  </PlayfulZoneTemplate>
}
