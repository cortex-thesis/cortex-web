import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Pencil,
  Target,
  TrendingUp,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Avatar, StateBadge } from '../../components/atoms'
import { mockStudent } from '../../mocks'
import styles from './Profile.module.css'

const mockStats = {
  streak: 7,
  avgFocusScore: 78,
  sessionsCompleted: 24,
  learningTime: '11h 42m',
}

const mockBadges = [
  { id: 'b1', emoji: '🔥', label: '7-day streak', detail: 'Learned every day this week' },
  { id: 'b2', emoji: '🎯', label: 'Sharp focus', detail: 'Reached 80% focus in a session' },
  { id: 'b3', emoji: '📚', label: '20 sessions', detail: 'Completed twenty learning sessions' },
  { id: 'b4', emoji: '🌱', label: 'Calm & steady', detail: 'Completed five regulation breaks' },
]

const packageProgress = [
  { name: 'Life Skills', value: 82, color: '#1D9E75' },
  { name: 'Self Care', value: 68, color: '#378ADD' },
  { name: 'Functional Academics', value: 61, color: '#534AB7' },
  { name: 'Pre-Vocational', value: 47, color: '#EF9F27' },
]

const recentSessions = [
  { title: 'Packing My School Bag', date: 'August 25', duration: '31 min', focus: 78, state: 'focused' as const },
  { title: 'Four-count Breathing', date: 'August 22', duration: '18 min', focus: 72, state: 'relaxed' as const },
  { title: 'Reading a Bus Schedule', date: 'August 19', duration: '28 min', focus: 69, state: 'distracted' as const },
]

export default function Profile() {
  const navigate = useNavigate()
  const student = mockStudent

  return (
    <PlayfulZoneTemplate>
      <div className={styles.page}>
        <header className={styles.profileHero}>
          <div className={styles.identity}>
            <Avatar name={student.name} imageUrl={student.avatar} size="xl" />
            <div>
              <span className={styles.eyebrow}>Student profile</span>
              <h1 className={styles.name}>{student.name}</h1>
              <p className={styles.profileMeta}>Independent Living Skills · Student ID CTX-001</p>
            </div>
          </div>
          <button className={styles.editBtn} onClick={() => navigate('/student/settings')}>
            <Pencil size={15} /> Edit profile
          </button>
        </header>

        <section className={styles.statsGrid} aria-label="Learning statistics">
          <Stat icon={<Flame size={22}/>} color="#EF9F27" bg="#FAEEDA" value={mockStats.streak} label="Day streak" detail="Personal best: 10 days" />
          <Stat icon={<Target size={22}/>} color="#1D9E75" bg="#E1F5EE" value={`${mockStats.avgFocusScore}%`} label="Average focus" detail="Up 6% this month" />
          <Stat icon={<CheckCircle2 size={22}/>} color="#534AB7" bg="#EEEDFE" value={mockStats.sessionsCompleted} label="Sessions completed" detail="4 sessions this week" />
          <Stat icon={<Clock3 size={22}/>} color="#D4537E" bg="#FBEAF0" value={mockStats.learningTime} label="Total learning time" detail="Current school term" />
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div><span className={styles.sectionEyebrow}>Achievements</span><h2>My badges</h2></div>
              <span className={styles.countPill}>{mockBadges.length} earned</span>
            </div>
            <div className={styles.badgeGrid}>
              {mockBadges.map((badge) => (
                <div key={badge.id} className={styles.badge}>
                  <span className={styles.badgeEmoji}>{badge.emoji}</span>
                  <span><strong>{badge.label}</strong><small>{badge.detail}</small></span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div><span className={styles.sectionEyebrow}>Curriculum</span><h2>Package progress</h2></div>
              <TrendingUp size={20} color="#1D9E75" />
            </div>
            <div className={styles.progressList}>
              {packageProgress.map((item) => (
                <div className={styles.progressItem} key={item.name}>
                  <div className={styles.progressMeta}><span>{item.name}</span><strong>{item.value}%</strong></div>
                  <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${item.value}%`, background: item.color }}/></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className={`${styles.card} ${styles.sessionsCard}`}>
          <div className={styles.sectionHeader}>
            <div><span className={styles.sectionEyebrow}>Learning history</span><h2>Recent sessions</h2></div>
            <button className={styles.textBtn} onClick={() => navigate('/student/sessions')}>View all <ArrowRight size={14}/></button>
          </div>
          <div className={styles.sessionList}>
            {recentSessions.map((session) => (
              <button className={styles.sessionRow} key={session.title} onClick={() => navigate('/student/session-summary')}>
                <span className={styles.sessionIcon}><BookOpen size={18}/></span>
                <span className={styles.sessionInfo}><strong>{session.title}</strong><small>{session.date} · {session.duration}</small></span>
                <StateBadge state={session.state} size="sm" />
                <span className={styles.focusScore}>{session.focus}%<small>focus</small></span>
                <ArrowRight size={16} className={styles.chevron}/>
              </button>
            ))}
          </div>
        </section>

        <button className={styles.journalBanner} onClick={() => navigate('/student/journal')}>
          <span className={styles.journalIcon}><BookOpen size={24}/></span>
          <span><strong>My Learning Journal</strong><small>Write, draw, or record what you learned today.</small></span>
          <ArrowRight size={18}/>
        </button>
      </div>
    </PlayfulZoneTemplate>
  )
}

function Stat({ icon, color, bg, value, label, detail }: { icon: React.ReactNode; color: string; bg: string; value: React.ReactNode; label: string; detail: string }) {
  return <div className={styles.statCard}><span className={styles.statIcon} style={{ color, background: bg }}>{icon}</span><span><strong className={styles.statValue}>{value}</strong><span className={styles.statLabel}>{label}</span><small className={styles.statDetail}>{detail}</small></span></div>
}
