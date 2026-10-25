import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, CirclePlay, ChartNoAxesColumn, NotebookPen, ArrowRight } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, SessionCard, ClassTile, QuickActionCard } from '../../components/molecules'
import { FlowerAvatar } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { classPresentation, getStudentDashboard, resumeStudentSession } from '../../lib/studentApi'
import { api, cachedApiValue } from '../../lib/api'
import type { DashboardData, StudentSessionsData } from '../../lib/studentApi'
import styles from './Home.module.css'

const HOME_CLASS_PREVIEW_LIMIT = 2
const LEARNING_ASSET_PATH = '/assets/learning-growth'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.user)!
  const cachedDashboard = cachedApiValue<DashboardData>('/student/dashboard/')
  const cachedSessions = cachedApiValue<StudentSessionsData>('/student/sessions/?home=1')
  const [dashboard, setDashboard] = useState<DashboardData | null>(cachedDashboard ?? null)
  const [sessions, setSessions] = useState<StudentSessionsData | null>(cachedSessions ?? null)
  const [sessionsLoading, setSessionsLoading] = useState(!cachedSessions)
  const [classes, setClasses] = useState<ReturnType<typeof classPresentation>[]>(() => (cachedDashboard?.classes ?? []).map(classPresentation))
  const [classesLoading, setClassesLoading] = useState(!cachedDashboard)
  useEffect(() => {
    let disposed = false
    let generation = 0
    const refresh = () => {
      const current = ++generation
      void Promise.allSettled([getStudentDashboard(), api<StudentSessionsData>('/student/sessions/?home=1')]).then(([dashboardResult, sessionsResult]) => {
        if (disposed || current !== generation) return
        if (dashboardResult.status === 'fulfilled') {
          setDashboard(dashboardResult.value)
          setClasses(dashboardResult.value.classes.map(classPresentation))
        }
        if (sessionsResult.status === 'fulfilled') setSessions(sessionsResult.value)
      }).finally(() => { if (!disposed && current === generation) { setClassesLoading(false); setSessionsLoading(false) } })
    }
    refresh()
    window.addEventListener('cortex:home-invalidated', refresh)
    return () => { disposed = true; window.removeEventListener('cortex:home-invalidated', refresh) }
  }, [student.id])
  const activeSession = sessions?.sessions.find((session) => session.status === 'in_progress') ?? null
  const completedSessions = sessions?.summary.completed_sessions ?? 0
  const previewClasses = classes.slice(0, HOME_CLASS_PREVIEW_LIMIT)
  const hasMoreClasses = classes.length > previewClasses.length
  const sessionCard = activeSession ? {
    classId: String(activeSession.class_id),
    className: activeSession.class_name,
    lessonTitle: activeSession.title,
    icon: <img className={styles.continueIllustration} src={`${LEARNING_ASSET_PATH}/open-book.png`} alt="" />,
    iconBg: 'var(--color-surface-1)',
    taskIndex: Math.min(activeSession.tasks_completed + 1, activeSession.tasks_total),
    taskTotal: activeSession.tasks_total,
    progress: activeSession.tasks_total ? (activeSession.tasks_completed / activeSession.tasks_total) * 100 : 0,
  } : null
  const resumeActiveSession = async () => {
    if (!activeSession) return
    try {
      const resumed = await resumeStudentSession(activeSession.id)
      if (resumed.class_session_id) navigate(`/student/class-session/${resumed.class_session_id}`)
      else navigate('/student/eeg-pairing', { state: { classId: resumed.class_id, lessonId: resumed.lesson_id ?? undefined, sessionId: resumed.id } })
    } catch {
      navigate('/student/sessions')
    }
  }

  return (
    <PlayfulZoneTemplate>
      <div className={styles.body}>
        <div className={styles.welcome}>
          <h1 className={styles.greetingName}>{getGreeting()}, <span className={styles.greetingAccent}>{student.name.split(' ')[0]}!</span></h1>
        </div>
        <div className={styles.homeGrid}>
          <div className={styles.left}>
          <div className={styles.topCards}>
            <button className={styles.identityDisplay} onClick={() => navigate('/student/profile')} aria-label="Open student profile">
              <FlowerAvatar color={student.avatar_color ?? 'pink'} size="lg" />
              <span className={styles.identityCopy}>
                <strong className={styles.identityName}>{student.name}</strong>
                <span className={styles.studentNumber}>Cortex ID · {dashboard?.student.student_number || 'Not assigned'}</span>
                <span className={styles.identityLink}>View profile <ArrowRight size={15} /></span>
              </span>
            </button>
            <SessionCard className={styles.continueCard} session={sessionCard} loading={sessionsLoading} emptyIllustration={<img className={styles.emptyContinueIllustration} src={`${LEARNING_ASSET_PATH}/sprout.png`} alt="" />} onResume={() => void resumeActiveSession()} onStart={() => navigate('/student/classes')} />
          </div>
          <div className={styles.classesHeader}><span className={styles.classesLabel}>My Classes</span>{hasMoreClasses && <button className={styles.seeAllBtn} onClick={() => navigate('/student/classes')}>See all</button>}</div>
          {classesLoading ? <CardGridSkeleton count={2} /> : <div className={`${styles.learningGrid} ${previewClasses.length === 1 ? styles.singleClassGrid : ''} ${previewClasses.length === 0 ? styles.noClassGrid : ''}`}>
            {previewClasses.map(item => <ClassTile key={item.id} name={item.name} illustrationSrc={`${LEARNING_ASSET_PATH}/growing-plant.png`} layout="horizontal" onClick={() => navigate(`/student/class/${item.id}`)} />)}
            <button className={styles.startLearningCard} onClick={() => navigate(classes.length === 1 ? `/student/class/${classes[0].id}` : classes.length ? '/student/classes' : '/student/join-class')}>
              <span className={styles.startLearningIcon} aria-hidden="true"><img src={`${LEARNING_ASSET_PATH}/sprout.png`} alt="" /></span>
              <span className={styles.startLearningCopy}><small>{classes.length ? 'Start learning' : 'Get started'}</small><strong>{classes.length ? 'Start a lesson' : 'Join a class'}</strong><span>{classes.length === 1 ? `Choose something new to learn in ${classes[0].name}.` : classes.length > 1 ? 'Choose a class and find your next lesson.' : 'Join a class to see lessons you can start.'}</span></span>
              <span className={styles.startLearningAction}>{classes.length ? 'Choose' : 'Join'} <ArrowRight size={15} /></span>
            </button>
          </div>}
        </div>
          <div className={styles.right}>
          <button className={styles.progressCard} onClick={() => navigate('/student/sessions')}>
            <span><strong>{completedSessions}</strong><small>Completed {completedSessions === 1 ? 'session' : 'sessions'}</small></span>
            <span><strong>{sessions ? `${Math.floor(sessions.summary.total_duration_seconds / 3600)}h ${Math.floor((sessions.summary.total_duration_seconds % 3600) / 60)}m` : '—'}</strong><small>Learning time</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <div className={styles.qaGrid}>
            <QuickActionCard icon={<UserPlus size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Join a class" sub="Enter code" onClick={() => navigate('/student/join-class')} />
            <QuickActionCard icon={<CirclePlay size={14} strokeWidth={1.75} color="#1D9E75" />} iconBg="#E1F5EE" label="Start a lesson" sub="Choose a class" onClick={() => navigate('/student/classes')} />
            <QuickActionCard icon={<ChartNoAxesColumn size={14} strokeWidth={1.75} color="#D4537E" />} iconBg="#FBEAF0" label="My progress" sub="Profile overview" onClick={() => navigate('/student/profile')} />
            <QuickActionCard icon={<img className={styles.gardenIllustration} src={`${LEARNING_ASSET_PATH}/flower-pot.png`} alt="" />} iconBg="var(--color-surface-1)" label="Achievement garden" sub="See what has bloomed" onClick={() => navigate('/student/achievements')} />
            <QuickActionCard className={styles.journalShortcut} icon={<NotebookPen size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Learning journal" sub="Reflect on a session" onClick={() => navigate('/student/journal')} />
          </div>
          </div>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
