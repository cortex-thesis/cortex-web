import { useNotifications } from '../../hooks/useNotifications'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, Plus, Brain, BarChart2, BookOpen, Star, UserRound, LogOut } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, SessionCard, ClassTile, StreakCard, QuickActionCard } from '../../components/molecules'
import { Avatar, Logo } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { classPresentation, getStudentDashboard } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import type { DashboardData } from '../../lib/studentApi'
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
  const [classes, setClasses] = useState<ReturnType<typeof classPresentation>[]>(() => (cachedDashboard?.classes ?? []).map(classPresentation))
  const [classesLoading, setClassesLoading] = useState(!cachedDashboard)
  useEffect(() => {
    setClassesLoading(true)
    void getStudentDashboard().then((data) => setClasses(data.classes.map(classPresentation))).finally(() => setClassesLoading(false))
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

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <Logo variant="icon" height={36} />
        <div className={styles.topBarRight}>
          <button className={styles.iconBtn} aria-label="Notifications" onClick={() => navigate('/student/notifications')}><Bell size={18} strokeWidth={1.75} />{unread_count > 0 && <span>{unread_count}</span>}</button>
          <button className={styles.iconBtn} aria-label="Settings" onClick={() => navigate('/student/settings')}><Settings size={18} strokeWidth={1.75} /></button>
          <div className={styles.accountMenu} ref={menuRef}>
            <button className={styles.avatarBtn} onClick={() => setIsMenuOpen((open) => !open)} aria-label="Open account menu" aria-expanded={isMenuOpen} aria-haspopup="menu"><Avatar name={student.name} imageUrl={student.avatar} size="sm" /></button>
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
          <div className={styles.greeting}><span className={styles.greetingSub}>{getGreeting()}</span><h1 className={styles.greetingName}>Welcome back, <span className={styles.greetingAccent}>{student.name.split(' ')[0]}!</span></h1></div>
          <SessionCard session={null} onStart={() => navigate('/student/classes')} />
          <div className={styles.classesHeader}><span className={styles.classesLabel}>My Classes</span><button className={styles.seeAllBtn} onClick={() => navigate('/student/classes')}>See all</button></div>
          {classesLoading ? <CardGridSkeleton count={2} /> : <div className={styles.classesGrid}>{classes.map((item) => <ClassTile key={item.id} name={item.name} iconEmoji={item.iconEmoji} iconBg={item.iconBg} onClick={() => navigate(`/student/class/${item.id}`)} />)}</div>}
        </div>
        <div className={styles.right}>
          <StreakCard score={0} />
          <div className={styles.qaGrid}>
            <QuickActionCard icon={<Plus size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Join a class" sub="Enter code" onClick={() => navigate('/student/join-class')} />
            <QuickActionCard icon={<Brain size={14} strokeWidth={1.75} color="#1D9E75" />} iconBg="#E1F5EE" label="New session" sub="Coming next" onClick={() => navigate('/student/classes')} />
            <QuickActionCard icon={<BarChart2 size={14} strokeWidth={1.75} color="#D4537E" />} iconBg="#FBEAF0" label="My progress" sub="Profile overview" onClick={() => navigate('/student/profile')} />
            <QuickActionCard icon={<Star size={14} strokeWidth={1.75} color="#EF9F27" />} iconBg="#FAEEDA" label="Achievements" sub="View badges" onClick={() => navigate('/student/profile')} />
            <QuickActionCard className={styles.journalShortcut} icon={<BookOpen size={14} strokeWidth={1.75} color="#534AB7" />} iconBg="#EEEDFE" label="Learning journal" sub="Available after sessions" onClick={() => navigate('/student/profile')} />
          </div>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
