import { Zap } from 'lucide-react'
import { ProgressBar } from '../../atoms'
import styles from './SessionCard.module.css'
import clsx from 'clsx'

interface ActiveSession {
  classId: string
  className: string
  iconEmoji: string
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

function SessionCard({
  session,
  onResume,
  onStart,
  className,
}: SessionCardProps) {
  if (!session) {
    return (
      <div className={clsx(styles.empty, className)}>
        <div className={styles.emptyIcon} aria-hidden="true">
          <Zap size={28} strokeWidth={1.75} color="#B4B2A9" />
        </div>
        <span className={styles.emptyTitle}>No active session</span>
        <span className={styles.emptySub}>
          Pair your EEG headband and join a class to start
        </span>
        <button
          className={styles.startBtn}
          onClick={onStart}
          aria-label="Start a new session"
        >
          Start a session
        </button>
      </div>
    )
  }

  const {
    className: name,
    iconEmoji,
    iconBg,
    taskIndex,
    taskTotal,
    progress,
  } = session

  return (
    <div className={clsx(styles.card, className)}>
      <div
        className={styles.iconWrap}
        style={{ background: iconBg }}
        aria-hidden="true"
      >
        <span className={styles.iconEmoji}>{iconEmoji}</span>
      </div>

      <div className={styles.info}>
        <span className={styles.label}>Continue where you left off</span>
        <span className={styles.title}>{name}</span>
        <div className={styles.progRow}>
          <ProgressBar
            value={progress}
            state="focused"
            size="xs"
            ariaLabel={`${Math.round(progress)}% complete`}
          />
          <span className={styles.progPct}>
            {Math.round(progress)}% complete
            {taskTotal > 0 && ` • Task ${taskIndex} of ${taskTotal}`}
          </span>
        </div>
      </div>

      <button
        className={styles.resumeBtn}
        onClick={onResume}
        aria-label={`Resume ${name}`}
      >
        Resume
      </button>
    </div>
  )
}

export default SessionCard
