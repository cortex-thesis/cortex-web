import PackageIcon from '../../components/atoms/PackageIcon'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, History, LogOut, Pencil, PlayCircle, Sprout, TrendingUp } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { ListSkeleton } from '../../components/molecules'
import { StudentFlowerAvatar } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { getStudentSessions, type StudentSessionsData } from '../../lib/studentApi'
import { api } from '../../lib/api'
import { PACKAGE_META } from '../../constants/packages'
import type { CurriculumPackage } from '../../constants/states'
import styles from './Profile.module.css'

interface PackageProgress { slug: CurriculumPackage; name: string; percentage: number; is_completed: boolean; last_interacted_at: string | null }
interface ProgressResponse { packages: PackageProgress[]; badge_unlocks: Record<string, string> }
interface SyncState { enabled: boolean; pending?: number; status?: string }

const achievementLabels: Record<string, string> = {
  'lessons-1': 'First Lesson Bloom',
  'lessons-3': '3 Lessons Bloom',
  'lessons-12': '12 Lessons Bloom',
  care: 'Care Bloom',
  life: 'Life Bloom',
  pre_vocational: 'Pre-Vocational Bloom',
  livelihood: 'Livelihood Bloom',
  functional_academics: 'Functional Academics Bloom',
  career: 'Career Bloom',
  enrichment: 'Enrichment Bloom',
}
const flowerColors = ['pink', 'blue', 'yellow', 'green', 'purple'] as const

export default function Profile() {
  const navigate = useNavigate()
  const student = useAuthStore(state => state.user)!
  const logout = useAuthStore(state => state.logout)
  const [sessionData, setSessionData] = useState<StudentSessionsData | null>(null)
  const [sessionsError, setSessionsError] = useState('')
  const [packageProgress, setPackageProgress] = useState<PackageProgress[] | null>(null)
  const [achievementUnlocks, setAchievementUnlocks] = useState<Record<string, string> | null>(null)
  const [progressError, setProgressError] = useState('')
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<ProgressResponse>('/student/package-progress/', { cache: 'no-store' })
      .then(data => { if (!cancelled) { setPackageProgress(data.packages); setAchievementUnlocks(data.badge_unlocks) } })
      .catch(() => { if (!cancelled) setProgressError('Unable to load package progress.') })
    getStudentSessions()
      .then(data => { if (!cancelled) setSessionData(data) })
      .catch((error: unknown) => { if (!cancelled) setSessionsError(error instanceof Error ? error.message : 'Unable to load session summary.') })
    return () => { cancelled = true }
  }, [student.id])

  useEffect(() => {
    if (!confirmingSignOut) return
    void api<SyncState>('/sync/status/', { cache: 'no-store' }).then(setSyncState).catch(() => setSyncState(null))
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !signingOut) setConfirmingSignOut(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [confirmingSignOut, signingOut])

  const completedSessions = sessionData?.summary.completed_sessions ?? 0
  const inProgressSessions = (sessionData?.sessions ?? []).filter(session => session.status === 'in_progress').length
  const learningSeconds = sessionData?.summary.total_duration_seconds ?? 0
  const learningMinutes = Math.round(learningSeconds / 60)
  const learningTime = learningMinutes >= 60 ? `${Math.floor(learningMinutes / 60)}h ${learningMinutes % 60}m` : `${learningMinutes}m`
  const earnedAchievements = Object.entries(achievementUnlocks ?? {}).filter(([, unlockedAt]) => Boolean(unlockedAt))

  async function signOut() {
    setSigningOut(true)
    await logout()
    navigate('/', { replace: true })
  }

  return <PlayfulZoneTemplate>
    <div className={styles.page}>
      <section className={styles.profileTop} aria-label="Student identity and achievements">
        <header className={styles.profileHero}>
          <div className={styles.identity}>
            <StudentFlowerAvatar name={student.name} color={student.avatar_color} size="xl" />
            <div><span className={styles.eyebrow}>Student profile</span><h1 className={styles.name}>{student.name}</h1><p className={styles.profileMeta}>Student number {student.student_number || 'Not assigned'}</p></div>
          </div>
          <button className={styles.editBtn} onClick={() => navigate('/student/settings', { state: { editProfile: true } })}><Pencil size={15} /> Edit profile</button>
        </header>

        <button className={styles.gardenPreview} onClick={() => navigate('/student/achievements')}>
          <span className={styles.sectionEyebrow}>Achievements</span>
          <strong>Achievement Garden</strong>
          {!achievementUnlocks && !progressError ? <span className={styles.previewLoading}>Growing your preview…</span> : earnedAchievements.length ? <span className={styles.previewFlowers}>
            {earnedAchievements.slice(0, 5).map(([id], index) => <span key={id} role="img" aria-label={achievementLabels[id] ?? 'Earned achievement'} title={achievementLabels[id] ?? 'Earned achievement'}><img src={`/assets/profile-flowers/flower-${flowerColors[index % flowerColors.length]}.svg`} alt="" /></span>)}
          </span> : <span className={styles.previewEmpty}><Sprout size={22} /> Your garden is ready to grow.</span>}
          <span className={styles.previewLink}>See what your learning has grown <ArrowRight size={15} /></span>
        </button>
      </section>

      <section className={styles.statsGrid} aria-label="Learning summary">
        <Stat icon={<PlayCircle size={21}/>} color="#1D9E75" bg="#E1F5EE" value={inProgressSessions} label="In progress" detail={inProgressSessions ? 'Ready to continue' : 'No unfinished lessons'} />
        <Stat icon={<span aria-hidden="true">✓</span>} color="#534AB7" bg="#EEEDFE" value={completedSessions} label="Sessions completed" detail="Completed session records" />
        <Stat icon={<Clock3 size={21}/>} color="#D4537E" bg="#FBEAF0" value={learningTime} label="Learning time" detail="Across completed sessions" />
      </section>
      {sessionsError && <p className={styles.inlineError} role="alert">{sessionsError}</p>}

      <section aria-labelledby="my-learning-heading">
        <div className={styles.groupHeading}><div><span className={styles.sectionEyebrow}>My learning</span><h2 id="my-learning-heading">Continue and reflect</h2></div></div>
        <div className={styles.learningLinks}>
          <button className={styles.learningEntry} onClick={() => navigate('/student/sessions')}>
            <span className={styles.learningIcon}><History size={25}/></span>
            <span><span className={styles.sectionEyebrow}>Session history</span><strong>Review your learning sessions</strong><small>{completedSessions} completed · {inProgressSessions} in progress</small></span><ArrowRight size={18}/>
          </button>
          <button className={`${styles.learningEntry} ${styles.journalEntry}`} onClick={() => navigate('/student/journal')}>
            <span className={styles.learningIcon}><BookOpen size={25}/></span>
            <span><span className={styles.sectionEyebrow}>Reflections</span><strong>Learning Journal</strong><small>Reflect on your learning sessions.</small></span><ArrowRight size={18}/>
          </button>
        </div>
      </section>

      <section className={`${styles.card} ${styles.progressCard}`}>
        <div className={styles.sectionHeader}><div><span className={styles.sectionEyebrow}>Curriculum</span><h2>Package progress</h2></div><TrendingUp size={20} color="#1D9E75" /></div>
        <div className={styles.progressList} aria-label="Package progress, most recently interacted first">
          {!packageProgress && !progressError && <ListSkeleton rows={4} />}
          {progressError && <p role="alert">{progressError}</p>}
          {(packageProgress ?? []).map(item => <div className={styles.progressItem} key={item.slug}>
            <span className={styles.packageIcon} style={{ background: PACKAGE_META[item.slug]?.bg }} aria-hidden="true"><PackageIcon packageId={item.slug} /></span>
            <span className={styles.packageName}>{item.name}</span>
            <div className={styles.progressTrack} role="progressbar" aria-label={item.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage}><div className={styles.progressFill} style={{ width: `${item.percentage}%` }}/></div>
            <strong className={styles.progressPercent}>{item.percentage}%</strong>
          </div>)}
        </div>
      </section>

      <section className={styles.accountSection}>
        <div><span className={styles.sectionEyebrow}>Account</span><strong>Sign out of Cortex</strong><small>You’ll need to sign in again to continue.</small></div>
        <button className={styles.signOutBtn} onClick={() => setConfirmingSignOut(true)}><LogOut size={16} /> Sign out</button>
      </section>
    </div>

    {confirmingSignOut && <div className={styles.dialogBackdrop} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !signingOut) setConfirmingSignOut(false) }}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
        <h2 id="sign-out-title">Sign out?</h2>
        <p>You’ll need to sign in again to continue using Cortex.</p>
        {syncState?.enabled && <p className={styles.syncNote}>{syncState.pending ? `${syncState.pending} pending changes remain safely saved on this laptop and can sync later.` : 'Locally saved Cortex data remains on this laptop.'}</p>}
        <div className={styles.dialogActions}><button disabled={signingOut} onClick={() => setConfirmingSignOut(false)}>Cancel</button><button className={styles.confirmSignOut} disabled={signingOut} onClick={() => void signOut()}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div>
      </div>
    </div>}
  </PlayfulZoneTemplate>
}

function Stat({ icon, color, bg, value, label, detail }: { icon: React.ReactNode; color: string; bg: string; value: React.ReactNode; label: string; detail: string }) {
  return <div className={styles.statCard}><span className={styles.statIcon} style={{ color, background: bg }}>{icon}</span><span className={styles.statContent}><strong className={styles.statValue}>{value}</strong><span className={styles.statLabel}>{label}</span><small className={styles.statDetail}>{detail}</small></span></div>
}
