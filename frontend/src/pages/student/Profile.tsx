import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Clock3, Pencil, PlayCircle, TrendingUp } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { ListSkeleton } from '../../components/molecules'
import { StudentFlowerAvatar } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { PACKAGE_EMOJI, getStudentSessions, type StudentSessionsData } from '../../lib/studentApi'
import { api } from '../../lib/api'
import { PACKAGE_META } from '../../constants/packages'
import type { CurriculumPackage } from '../../constants/states'
import styles from './Profile.module.css'

interface PackageProgress { slug: CurriculumPackage; name: string; percentage: number; is_completed: boolean; last_interacted_at: string | null }

export default function Profile() {
  const navigate = useNavigate()
  const student = useAuthStore((state) => state.user)!
  const [sessionData, setSessionData] = useState<StudentSessionsData | null>(null)
  const [sessionsError, setSessionsError] = useState('')
  const [packageProgress, setPackageProgress] = useState<PackageProgress[] | null>(null)
  const [progressError, setProgressError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<{ packages: PackageProgress[] }>('/student/package-progress/', { cache: 'no-store' })
      .then((data) => { if (!cancelled) setPackageProgress(data.packages) })
      .catch(() => { if (!cancelled) setProgressError('Unable to load package progress.') })
    getStudentSessions()
      .then((data) => { if (!cancelled) setSessionData(data) })
      .catch((error: unknown) => { if (!cancelled) setSessionsError(error instanceof Error ? error.message : 'Unable to load session summary.') })
    return () => { cancelled = true }
  }, [student.id])

  const completedSessions = sessionData?.summary.completed_sessions ?? 0
  const inProgressSessions = (sessionData?.sessions ?? []).filter((session) => session.status === 'in_progress').length
  const learningSeconds = sessionData?.summary.total_duration_seconds ?? 0
  const learningMinutes = Math.round(learningSeconds / 60)
  const learningTime = learningMinutes >= 60 ? `${Math.floor(learningMinutes / 60)}h ${learningMinutes % 60}m` : `${learningMinutes}m`

  return (
    <PlayfulZoneTemplate>
      <div className={styles.page}>
        <header className={styles.profileHero}>
          <div className={styles.identity}>
            <StudentFlowerAvatar name={student.name} color={student.avatar_color} size="xl" />
            <div><span className={styles.eyebrow}>Student profile</span><h1 className={styles.name}>{student.name}</h1><p className={styles.profileMeta}>Student number {student.student_number || 'Not assigned'}</p></div>
          </div>
          <button className={styles.editBtn} onClick={() => navigate('/student/settings', { state: { editProfile: true } })}><Pencil size={15} /> Edit profile</button>
        </header>

        <section className={styles.statsGrid} aria-label="Learning summary">
          <Stat icon={<PlayCircle size={21}/>} color="#1D9E75" bg="#E1F5EE" value={inProgressSessions} label="In progress" detail={inProgressSessions ? 'Ready to continue' : 'No unfinished lessons'} />
          <Stat icon={<span aria-hidden="true">✓</span>} color="#534AB7" bg="#EEEDFE" value={completedSessions} label="Sessions completed" detail="Completed session records" />
          <Stat icon={<Clock3 size={21}/>} color="#D4537E" bg="#FBEAF0" value={learningTime} label="Learning time" detail="Across completed sessions" />
        </section>
        {sessionsError && <p className={styles.inlineError} role="alert">{sessionsError}</p>}

        <section aria-labelledby="my-learning-heading">
          <div className={styles.groupHeading}><span className={styles.sectionEyebrow}>Personal space</span><h2 id="my-learning-heading">My learning</h2></div>
          <div className={styles.learningLinks}>
            <button className={styles.learningEntry} onClick={() => navigate('/student/achievements')}>
              <span className={styles.gardenFlowers} aria-hidden="true"><img src="/assets/profile-flowers/flower-pink.svg" alt="" /><img src="/assets/profile-flowers/flower-purple.svg" alt="" /><img src="/assets/profile-flowers/flower-green.svg" alt="" /></span>
              <span><span className={styles.sectionEyebrow}>Achievements</span><strong>Achievement Garden</strong><small>See what your learning has grown.</small></span><ArrowRight size={18}/>
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
            {(packageProgress ?? []).map((item) => (
              <div className={styles.progressItem} key={item.slug}>
                <span className={styles.packageIcon} style={{ background: PACKAGE_META[item.slug]?.bg }} aria-hidden="true">{PACKAGE_EMOJI[item.slug]}</span>
                <span className={styles.packageName}>{item.name}</span>
                <div className={styles.progressTrack} role="progressbar" aria-label={item.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.percentage}><div className={styles.progressFill} style={{ width: `${item.percentage}%` }}/></div>
                <strong className={styles.progressPercent}>{item.percentage}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PlayfulZoneTemplate>
  )
}

function Stat({ icon, color, bg, value, label, detail }: { icon: React.ReactNode; color: string; bg: string; value: React.ReactNode; label: string; detail: string }) {
  return <div className={styles.statCard}><span className={styles.statIcon} style={{ color, background: bg }}>{icon}</span><span className={styles.statContent}><strong className={styles.statValue}>{value}</strong><span className={styles.statLabel}>{label}</span><small className={styles.statDetail}>{detail}</small></span></div>
}
