import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Settings,
  Plus,
  Brain,
  BarChart2,
  BookOpen,
  Star,
  UtensilsCrossed,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import {
  SessionCard,
  ClassTile,
  StreakCard,
  QuickActionCard,
} from '../../components/molecules'
import { Avatar, Logo } from '../../components/atoms'
import { mockStudent, mockClasses } from '../../mocks'
import styles from './Home.module.css'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const navigate = useNavigate()

  const student = mockStudent
  const classes = mockClasses
  const todayFocusScore = 78

  // Mock active session — replace with real API call later
  const activeSession = {
    classId: 'class-001',
    className: 'Life Skills — Getting Ready for School',
    icon: <UtensilsCrossed size={20} color="#1D9E75" />,
    iconBg: '#E1F5EE',
    taskIndex: 3,
    taskTotal: 5,
    progress: 65,
  }

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <Logo variant="icon" height={36} />
        <div className={styles.topBarRight}>
          <button
            className={styles.iconBtn}
            aria-label="Notifications"
            onClick={() => navigate('/student/notifications')}
          >
            <Bell size={18} strokeWidth={1.75} />
          </button>
          <button
            className={styles.iconBtn}
            aria-label="Settings"
            onClick={() => navigate('/student/settings')}
          >
            <Settings size={18} strokeWidth={1.75} />
          </button>
          <button
            className={styles.avatarBtn}
            onClick={() => navigate('/student/profile')}
            aria-label="View profile"
          >
            <Avatar name={student.name} imageUrl={student.avatar} size="sm" />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.left}>
          <div className={styles.greeting}>
            <span className={styles.greetingSub}>{getGreeting()}</span>
            <h1 className={styles.greetingName}>
              Welcome back,{' '}
              <span className={styles.greetingAccent}>
                {student.name.split(' ')[0]}!
              </span>
            </h1>
          </div>

          <SessionCard
            session={activeSession}
            onResume={() => navigate('/student/eeg-pairing')}
            onStart={() => navigate('/student/join-class')}
          />

          <div className={styles.classesHeader}>
            <span className={styles.classesLabel}>My Classes</span>
            <button
              className={styles.seeAllBtn}
              onClick={() => navigate('/student/classes')}
            >
              See all
            </button>
          </div>

          <div className={styles.classesGrid}>
            {classes.map((cls) => (
              <ClassTile
                key={cls.id}
                name={cls.name}
                iconEmoji={cls.iconEmoji}
                iconBg={cls.iconBg}
                onClick={() => navigate(`/student/class/${cls.id}`)}
              />
            ))}
          </div>
        </div>

        <div className={styles.right}>
          <StreakCard score={todayFocusScore} />

          <div className={styles.qaGrid}>
            <QuickActionCard
              icon={<Plus size={14} strokeWidth={1.75} color="#534AB7" />}
              iconBg="#EEEDFE"
              label="Join a class"
              sub="Enter code"
              onClick={() => navigate('/student/join-class')}
            />
            <QuickActionCard
              icon={<Brain size={14} strokeWidth={1.75} color="#1D9E75" />}
              iconBg="#E1F5EE"
              label="New session"
              sub="Pair headband"
              onClick={() => navigate('/student/eeg-pairing')}
            />
            <QuickActionCard
              icon={<BarChart2 size={14} strokeWidth={1.75} color="#D4537E" />}
              iconBg="#FBEAF0"
              label="My progress"
              sub="Focus scores"
              onClick={() => navigate('/student/profile')}
            />
            <QuickActionCard
              icon={<Star size={14} strokeWidth={1.75} color="#EF9F27" />}
              iconBg="#FAEEDA"
              label="Achievements"
              sub="Badges earned"
              onClick={() => navigate('/student/profile')}
            />
            <QuickActionCard
              className={styles.journalShortcut}
              icon={<BookOpen size={14} strokeWidth={1.75} color="#534AB7" />}
              iconBg="#EEEDFE"
              label="Learning journal"
              sub="Write, draw, or record"
              onClick={() => navigate('/student/journal')}
            />
          </div>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
