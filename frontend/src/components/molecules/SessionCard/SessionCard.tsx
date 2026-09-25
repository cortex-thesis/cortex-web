import { ProgressBar } from '../../atoms'
import styles from './SessionCard.module.css'
import clsx from 'clsx'

export interface ActiveSession {
  classId: string
  className: string
  lessonTitle?: string
  icon?: React.ReactNode
  iconBg: string
  taskIndex: number
  taskTotal: number
  progress: number
}

interface SessionCardProps {
  session?: ActiveSession | null
  loading?: boolean
  onResume?: () => void
  onStart?: () => void
  emptyIllustration?: React.ReactNode
  className?: string
}

function SessionCard({ session, loading = false, onResume, onStart, emptyIllustration, className }: SessionCardProps) {
  if (loading) {
    return <div className={clsx(styles.loading, className)} role="status" aria-label="Loading your current lesson">
      <span className={styles.loadingIcon} aria-hidden="true" />
      <span className={styles.loadingContent} aria-hidden="true">
        <span className={styles.loadingHeading} />
        <span className={styles.loadingLesson} />
        <span className={styles.loadingProgress} />
      </span>
      <span className={styles.loadingAction} aria-hidden="true" />
    </div>
  }

  if (!session) {
    return <div className={clsx(styles.empty, className)}>
      <div className={styles.emptyIcon} aria-hidden="true">{emptyIllustration}</div>
      <span className={styles.emptyCopy}><strong className={styles.emptyTitle}>Ready for your next lesson?</strong><span className={styles.emptySub}>Choose a class and find something new to learn.</span></span>
      <button className={styles.startBtn} onClick={onStart} aria-label="Browse classes">Browse classes <span aria-hidden="true">→</span></button>
    </div>
  }

  const { className: name, lessonTitle, icon, iconBg, taskIndex, taskTotal, progress } = session
  return <div className={clsx(styles.card, className)}>
    <div className={styles.bodyRow}>
      <div className={styles.iconWrap} style={{ background: iconBg }} aria-hidden="true">{icon}</div>
      <div className={styles.info}>
        <h2 className={styles.heading}>Continue where you left off</h2>
        {lessonTitle && <span className={styles.title}>{lessonTitle}</span>}
        <div className={styles.progRow}>
          <span className={styles.progPct}>{taskTotal > 0 ? `Task ${taskIndex} of ${taskTotal}` : `${Math.round(progress)}% complete`}</span>
          <ProgressBar value={progress} state="focused" size="xs" ariaLabel={`${Math.round(progress)}% complete`} />
        </div>
      </div>
      <button className={styles.resumeBtn} onClick={onResume} aria-label={`Go to ${lessonTitle ?? name}`}>Go <span aria-hidden="true">→</span></button>
    </div>
  </div>
}

export default SessionCard
