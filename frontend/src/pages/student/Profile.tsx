import { getFocusPerformance } from '../../lib/focusPerformance'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Pencil,
  TrendingUp,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { ListSkeleton, StreakCard } from '../../components/molecules'
import { Avatar, StateBadge } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { PACKAGE_EMOJI, getStudentSessions, type StudentSessionsData } from '../../lib/studentApi'
import { api } from '../../lib/api'
import { PACKAGE_META } from '../../constants/packages'
import type { CurriculumPackage } from '../../constants/states'
import styles from './Profile.module.css'

const mockStats = {
  sessionsCompleted: 0,
  learningTime: '0m',
}


interface PackageProgress { slug: CurriculumPackage; name: string; percentage: number; is_completed: boolean; last_interacted_at: string | null }




export default function Profile() {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.user)!
  const [sessionData, setSessionData] = useState<StudentSessionsData | null>(null)
  const [sessionsError, setSessionsError] = useState('')
  const [packageProgress, setPackageProgress] = useState<PackageProgress[] | null>(null)
  const [progressError, setProgressError] = useState('')
  const [badgeUnlocks, setBadgeUnlocks] = useState<Record<string, string>>({})
  const badgeCarousel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let cancelled = false
    api<{ packages: PackageProgress[]; completed_lessons: number; badge_unlocks: Record<string, string> }>('/student/package-progress/', { cache: 'no-store' })
      .then((data) => { if (!cancelled) { setPackageProgress(data.packages); setBadgeUnlocks(data.badge_unlocks) } })
      .catch(() => { if (!cancelled) setProgressError('Unable to load package progress.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    getStudentSessions()
      .then((data) => { if (!cancelled) setSessionData(data) })
      .catch((error: unknown) => { if (!cancelled) setSessionsError(error instanceof Error ? error.message : 'Unable to load recent sessions.') })
    return () => { cancelled = true }
  }, [])

  const badges = [
    ...[1, 3, 12].map((count) => ({
      id: 'lessons-' + count,
      label: count === 1 ? 'Completed First Lesson' : 'Completed ' + count + ' Lessons',
      detail: badgeUnlocks['lessons-' + count] ? 'You completed ' + count + (count === 1 ? ' lesson.' : ' lessons.') : 'Complete ' + count + (count === 1 ? ' lesson.' : ' lessons.'),
      earned: !!badgeUnlocks['lessons-' + count],
      icon: count === 1 ? '\u{1F331}' : count === 3 ? '\u{1F31F}' : '\u{1F3C6}',
    })),
    ...Object.entries(PACKAGE_META).map(([slug, meta]) => {
      const earned = !!badgeUnlocks[slug]
      return { id: slug, label: 'Completed ' + meta.label + ' Package', earned,
        detail: earned ? 'You completed every activity in this package.' : 'Complete every activity in the ' + meta.label + ' package.',
        icon: PACKAGE_EMOJI[slug as CurriculumPackage] }
    }),
  ].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1
    return a.earned ? new Date(badgeUnlocks[b.id]).getTime() - new Date(badgeUnlocks[a.id]).getTime() : 0
  })

  const recentSessions = (sessionData?.sessions ?? [])
    .filter((session) => session.status === 'completed')
    .sort((a, b) => new Date(b.ended_at ?? b.started_at).getTime() - new Date(a.ended_at ?? a.started_at).getTime())
    .slice(0, 3)

  return (
    <PlayfulZoneTemplate>
      <div className={styles.page}>
        <header className={styles.profileHero}>
          <div className={styles.identity}>
            <Avatar name={student.name} imageUrl={student.avatar} size="xl" />
            <div>
              <span className={styles.eyebrow}>Student profile</span>
              <h1 className={styles.name}>{student.name}</h1>
              <p className={styles.profileMeta}>Student ID {student.id}</p>
            </div>
          </div>
          <button className={styles.editBtn} onClick={() => navigate('/student/settings')}>
            <Pencil size={15} /> Edit profile
          </button>
        </header>

        <section className={styles.statsGrid} aria-label="Learning statistics">
          <StreakCard score={sessionData?.summary.average_focus_score ?? 0} label="Current progress" className={styles.currentProgress} />
          <Stat icon={<CheckCircle2 size={22}/>} color="#534AB7" bg="#EEEDFE" value={mockStats.sessionsCompleted} label="Sessions completed" detail="4 sessions this week" />
          <Stat icon={<Clock3 size={22}/>} color="#D4537E" bg="#FBEAF0" value={mockStats.learningTime} label="Total learning time" detail="Current school term" />
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div><span className={styles.sectionEyebrow}>Achievements</span><h2>My badges</h2></div>
              <span className={styles.countPill}>{badges.filter((badge) => badge.earned).length} earned</span>
            </div>
            <div className={styles.carouselControls}>
              <button type="button" className={styles.textBtn} aria-label="Previous badges" onClick={() => badgeCarousel.current?.scrollBy({ left: -badgeCarousel.current.clientWidth, behavior: 'smooth' })}><ChevronLeft size={18} /></button>
              <button type="button" className={styles.textBtn} aria-label="Next badges" onClick={() => badgeCarousel.current?.scrollBy({ left: badgeCarousel.current.clientWidth, behavior: 'smooth' })}><ChevronRight size={18} /></button>
            </div>
            {progressError && <p role="alert">Badge progress is currently unavailable.</p>}
            <div className={styles.badgeGrid} ref={badgeCarousel} tabIndex={0} role="region" aria-label="Badges, newest unlocked first">
              {badges.map((badge) => (
                <div key={badge.id} className={`${styles.badge} ${badge.earned ? '' : styles.badgeLocked}`}>
                  <span className={styles.badgeEmoji} aria-hidden="true">{badge.icon}</span>
                  <span><strong>{badge.label}</strong><small>{badge.detail}</small><small className={styles.badgeStatus}>{badge.earned ? 'Unlocked ' + new Date(badgeUnlocks[badge.id]).toLocaleDateString() : 'Not earned yet'}</small></span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <div><span className={styles.sectionEyebrow}>Curriculum</span><h2>Package progress</h2></div>
              <TrendingUp size={20} color="#1D9E75" />
            </div>
            <div className={styles.progressList} tabIndex={0} role="region" aria-label="Package progress, most recently interacted first">
              {!packageProgress && !progressError && <ListSkeleton rows={4} />}
              {progressError && <p role="alert">{progressError}</p>}
              {(packageProgress ?? []).map((item) => (
                <div className={styles.progressItem} key={item.slug}>
                  <span className={styles.packageIcon} style={{ background: PACKAGE_META[item.slug]?.bg }} aria-hidden="true">{PACKAGE_EMOJI[item.slug]}</span>
                  <span className={styles.packageName}>{item.name}</span>
                  <div className={styles.progressTrack} role="progressbar" aria-label={item.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage}><div className={styles.progressFill} style={{ width: `${item.percentage}%`, background: '#1D9E75' }}/></div>
                  <strong className={styles.progressPercent}>{item.percentage}%</strong>
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
            {!sessionData && !sessionsError && <ListSkeleton rows={3} />}
            {sessionsError && <p role="alert">{sessionsError}</p>}
            {sessionData && recentSessions.length === 0 && <p>No completed sessions yet.</p>}
            {recentSessions.map((session) => (
              <button className={styles.sessionRow} key={session.id} onClick={() => navigate('/student/session-summary', { state: { summary: { sessionId: session.id, duration: session.duration_seconds, focusScore: session.focus_score, stateDistribution: session.state_distribution, taskCompleted: session.tasks_completed, taskTotal: session.tasks_total } } })}>
                <span className={styles.sessionIcon}><BookOpen size={18}/></span>
                <span className={styles.sessionInfo}><strong>{session.title}</strong><small>{new Date(session.ended_at ?? session.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {Math.max(1, Math.round(session.duration_seconds / 60))} min</small></span>
                <StateBadge state={session.state} size="sm" />
                <span className={styles.focusScore}>
                  <span className={styles.focusEmoji} aria-hidden="true">
                    {getFocusPerformance(session.focus_score, session.state_distribution).emoji}
                  </span>
                  <span>{getFocusPerformance(session.focus_score, session.state_distribution).phrase}</span>
                </span>
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

function Stat({ icon, color, bg, value, label, detail, compact = false }: { compact?: boolean; icon: React.ReactNode; color: string; bg: string; value: React.ReactNode; label: string; detail: string }) {
  return <div className={styles.statCard}><span className={styles.statIcon} style={{ color, background: bg }}>{icon}</span><span className={styles.statContent}><strong className={`${styles.statValue} ${compact ? styles.statValueCompact : ''}`}>{value}</strong><span className={styles.statLabel}>{label}</span><small className={styles.statDetail}>{detail}</small></span></div>
}
