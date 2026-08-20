import { useNavigate } from 'react-router-dom'
import { Flame, Target, CheckCircle2, BookOpen } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Avatar, Button } from '../../components/atoms'
import { mockStudent } from '../../mocks'
import styles from './Profile.module.css'

// Replace with a GET /api/students/:id/stats/ call once the backend
// is up — same shape as SessionSummary aggregated over all sessions.
const mockStats = {
  streak: 7,
  avgFocusScore: 78,
  sessionsCompleted: 24,
}

const mockBadges = [
  { id: 'b1', emoji: '🔥', label: '7-day streak' },
  { id: 'b2', emoji: '🎯', label: 'Sharp focus' },
  { id: 'b3', emoji: '📚', label: '20 sessions' },
  { id: 'b4', emoji: '🌱', label: 'Calm & steady' },
]

export default function Profile() {
  const navigate = useNavigate()
  const student = mockStudent

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <span className={styles.title}>Profile</span>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.identity}>
            <Avatar name={student.name} imageUrl={student.avatar} size="lg" />
            <h1 className={styles.name}>{student.name}</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/student/settings')}
            >
              Edit profile
            </Button>
          </div>

          <div className={styles.statsStack}>
            <div className={styles.statCard}>
              <span
                className={styles.statIcon}
                style={{ background: '#FAEEDA' }}
              >
                <Flame size={16} strokeWidth={1.75} color="#EF9F27" />
              </span>
              <span className={styles.statText}>
                <span className={styles.statValue}>{mockStats.streak}</span>
                <span className={styles.statLabel}>Day streak</span>
              </span>
            </div>
            <div className={styles.statCard}>
              <span
                className={styles.statIcon}
                style={{ background: '#E1F5EE' }}
              >
                <Target size={16} strokeWidth={1.75} color="#1D9E75" />
              </span>
              <span className={styles.statText}>
                <span className={styles.statValue}>
                  {mockStats.avgFocusScore}%
                </span>
                <span className={styles.statLabel}>Avg focus</span>
              </span>
            </div>
            <div className={styles.statCard}>
              <span
                className={styles.statIcon}
                style={{ background: '#EEEDFE' }}
              >
                <CheckCircle2 size={16} strokeWidth={1.75} color="#534AB7" />
              </span>
              <span className={styles.statText}>
                <span className={styles.statValue}>
                  {mockStats.sessionsCompleted}
                </span>
                <span className={styles.statLabel}>Sessions</span>
              </span>
            </div>
          </div>

          <button
            className={styles.journalLink}
            onClick={() => navigate('/student/journal')}
          >
            <BookOpen size={16} strokeWidth={1.75} />
            View my learning journal
          </button>
        </aside>

        <div className={styles.main}>
          <span className={styles.sectionLabel}>Badges</span>
          <div className={styles.badgeGrid}>
            {mockBadges.map((b) => (
              <div key={b.id} className={styles.badge}>
                <span className={styles.badgeEmoji}>{b.emoji}</span>
                <span className={styles.badgeLabel}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
