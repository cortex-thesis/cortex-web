import { useNotifications } from '../../hooks/useNotifications'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, Plus, Brain, BarChart2, BookOpen, Star, UserRound, LogOut, ArrowRight } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, SessionCard, ClassTile, QuickActionCard } from '../../components/molecules'
import { Logo, StudentFlowerAvatar } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { classPresentation, getStudentDashboard, getStudentSessions, resumeStudentSession } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import type { DashboardData, StudentSessionsData } from '../../lib/studentApi'
import styles from './Home.module.css'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { unread_count } = useNotifications()
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.user)!
  const logout = useAuthStore((state) => state.logout)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const cachedDashboard = cachedApiValue<DashboardData>('/student/dashboard/')
  const [dashboard, setDashboard] = useState<DashboardData | null>(cachedDashboard ?? null)
  const [sessions, setSessions] = useState<StudentSessionsData | null>(null)
  const [classes, setClasses] = useState<ReturnType<typeof classPresentation>[]>(() => (cachedDashboard?.classes ?? []).map(classPresentation))
  const [classesLoading, setClassesLoading] = useState(!cachedDashboard)
  useEffect(() => {
    setClassesLoading(true)
    void Promise.allSettled([getStudentDashboard(), getStudentSessions()]).then(([dashboardResult, sessionsResult]) => {
      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value)
        setClasses(dashboardResult.value.classes.map(classPresentation))
      }
      if (sessionsResult.status === 'fulfilled') setSessions(sessionsResult.value)
    }).finally(() => setClassesLoading(false))
  }, [student.id])
  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeMenu); document.removeEventListener('keydown', closeOnEscape) }
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  const activeSession = sessions?.sessions.find((session) => session.status === 'in_progress') ?? null
  const activeClass = activeSession ? classes.find((item) => item.id === activeSession.class_id) : null
  const completedSessions = sessions?.summary.completed_sessions ?? 0
  const sessionCard = activeSession ? {
    classId: String(activeSession.class_id),
    className: activeSession.class_name,
    lessonTitle: activeSession.title,
    iconEmoji: activeClass?.iconEmoji ?? '📖',
    iconBg: activeClass?.iconBg ?? '#EEEDFE',
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
      <div className={styles.topBar}>
        <Logo variant="icon" height={36} />
        <div className={styles.topBarRight}>
          <button className={styles.iconBtn} aria-label="Notifications" onClick={() => navigate('/student/notifications')}><Bell size={18} strokeWidth={1.75} />{unread_count > 0 && <span>{unread_count}</span>}</button>
          <button className={styles.iconBtn} aria-label="Settings" onClick={() => navigate('/student/settings')}><Settings size={18} strokeWidth={1.75} /></button>
          <div className={styles.accountMenu} ref={menuRef}>
            <button className={styles.avatarBtn} onClick={() => setIsMenuOpen((open) => !open)} aria-label="Open account menu" aria-expanded={isMenuOpen} aria-haspopup="menu"><StudentFlowerAvatar name={student.name} color={student.avatar_color} size="sm" /></button>
            {isMenuOpen && <div className={styles.accountPopover} role="menu">
              <div className={styles.accountSummary}><strong>{student.name}</strong><span>Student account</span></div>
              <div className={styles.menuDivider} />
              <button className={styles.accountMenuItem} role="menuitem" onClick={() => { setIsMenuOpen(false); navigate('/student/profile') }}><UserRound size={16} /> Profile</button>
              <button className={styles.accountMenuItem} role="menuitem" onClick={() => { setIsMenuOpen(false); navigate('/student/settings') }}><Settings size={16} /> Settings</button>
              <button className={styles.accountMenuItem} role="menuitem" onClick={() => void handleLogout()}><LogOut size={16} /> Log out</button>
            </div>}
          </div>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.left}>
          <div className={styles.welcome}>
            <h1 className={styles.greetingName}>{getGreeting()}, <span className={styles.greetingAccent}>{student.name.split(' ')[0]}!</span></h1>
          </div>
          <div className={styles.topCards}>
            <button className={styles.identityDisplay} onClick={() => navigate('/student/profile')} aria-label="Open student profile">
              <span className={styles.identityBotanical} aria-hidden="true">
                <span className={styles.petalOne} /><span className={styles.petalTwo} />
                <StudentFlowerAvatar name={student.name} color={student.avatar_color} size="xl" className={styles.identityFlower} />
                <span className={styles.flowerStem}><span className={styles.leafLeft}/><span className={styles.leafRight}/></span>
              </span>
              <span className={styles.identityCopy}>
                <span className={styles.identityEyebrow}>My Cortex</span>
                <strong className={styles.identityName}>{student.name}</strong>
                <span className={styles.studentNumber}>Student no. {dashboard?.student.student_number || 'Not assigned'}</span>
                <span className={styles.identityLink}>View profile <ArrowRight size={15} /></span>
              </span>
            </button>
            <SessionCard className={styles.continueCard} session={sessionCard} onResume={() => void resumeActiveSession()} onStart={() => navigate('/student/classes')} />
          </div>
          <div className={styles.classesHeader}><span className={styles.classesLabel}>My Classes</span><button className={styles.seeAllBtn} onClick={() => navigate('/student/classes')}>See all</button></div>
          {classesLoading ? <CardGridSkeleton count={2} /> : <div className={styles.classesGrid}>{classes.map((item) => <ClassTile key={item.id} name={item.name} iconEmoji={item.iconEmoji} iconBg={item.iconBg} onClick={() => navigate(`/student/class/${item.id}`)} />)}</div>}
        </div>
        <div className={styles.right}>
          <button className={styles.progressCard} onClick={() => navigate('/student/sessions')}>
            <span><strong>{completedSessions}</strong><small>Completed {completedSessions === 1 ? 'session' : 'sessions'}</small></span>
            <span><strong>{sessions ? `${Math.floor(sessions.summary.total_duration_seconds / 3600)}h ${Math.floor((sessions.summary.total_duration_seconds % 3600) / 60)}m` : '—'}</strong><small>Learning time</small></span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <div className={styles.qaGrid}>
            <QuickActionCard icon={<Plus size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Join a class" sub="Enter code" onClick={() => navigate('/student/join-class')} />
            <QuickActionCard icon={<Brain size={14} strokeWidth={1.75} color="#1D9E75" />} iconBg="#E1F5EE" label="New session" sub="Choose a lesson" onClick={() => navigate('/student/classes')} />
            <QuickActionCard icon={<BarChart2 size={14} strokeWidth={1.75} color="#D4537E" />} iconBg="#FBEAF0" label="My progress" sub="Profile overview" onClick={() => navigate('/student/profile')} />
            <QuickActionCard icon={<Star size={14} strokeWidth={1.75} color="#EF9F27" />} iconBg="#FAEEDA" label="Achievement garden" sub="See what has bloomed" onClick={() => navigate('/student/achievements')} />
            <QuickActionCard className={styles.journalShortcut} icon={<BookOpen size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Learning journal" sub="Reflect on a session" onClick={() => navigate('/student/journal')} />
          </div>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
