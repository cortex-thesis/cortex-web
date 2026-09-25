import { Zap } from 'lucide-react'
import { ProgressBar } from '../../atoms'
import styles from './SessionCard.module.css'
import clsx from 'clsx'

export interface ActiveSession {
  classId: string
  className: string
  lessonTitle?: string
  icon?: React.ReactNode
  iconEmoji?: string
  iconBg: string
  taskIndex: number
  taskTotal: number
  progress: number
}

interface SessionCardProps {
  session?: ActiveSession | null
  onResume?: () => void
  onStart?: () => void
  className?: string
}

function SessionCard({ session, onResume, onStart, className }: SessionCardProps) {
  if (!session) {
    return <div className={clsx(styles.empty, className)}>
      <div className={styles.emptyIcon} aria-hidden="true"><Zap size={28} strokeWidth={1.75} color="#B4B2A9" /></div>
      <span className={styles.emptyTitle}>Ready for your next lesson?</span>
      <span className={styles.emptySub}>Choose a class and pick up a lesson when you are ready.</span>
      <button className={styles.startBtn} onClick={onStart} aria-label="Start a new session">Browse classes <span aria-hidden="true">→</span></button>
    </div>
  }

  const { className: name, lessonTitle, icon, iconEmoji, iconBg, taskIndex, taskTotal, progress } = session
  return <div className={clsx(styles.card, className)}>
    <span className={styles.label}>Continue where you left off</span>
    <div className={styles.bodyRow}>
      <div className={styles.iconWrap} style={{ background: iconBg }} aria-hidden="true">{icon ?? <span className={styles.iconEmoji}>{iconEmoji}</span>}</div>
      <div className={styles.info}><span className={styles.className}>{name}</span>{lessonTitle && <span className={styles.title}>{lessonTitle}</span>}</div>
    </div>
    <div className={styles.footerRow}>
      <div className={styles.progRow}>
        <ProgressBar value={progress} state="focused" size="xs" ariaLabel={`${Math.round(progress)}% complete`} />
        <span className={styles.progPct}>{taskTotal > 0 ? `Task ${taskIndex} of ${taskTotal}` : `${Math.round(progress)}% complete`}</span>
      </div>
      <button className={styles.resumeBtn} onClick={onResume} aria-label={`Go to ${lessonTitle ?? name}`}>Go <span aria-hidden="true">→</span></button>
    </div>
  </div>
}

export default SessionCard
