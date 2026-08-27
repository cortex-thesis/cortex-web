import type { StudentLive } from '../../../types'
import type { CognitiveState } from '../../../constants/states'
import { Avatar, StateBadge } from '../../atoms'
import styles from './StudentStateCard.module.css'
import clsx from 'clsx'

interface StudentStateCardProps {
  student: StudentLive
  onOverride?: (studentId: string) => void
  compact?: boolean
  className?: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getFocusScoreColor(score: number): string {
  if (score >= 75) return '#1D9E75'
  if (score >= 50) return '#EF9F27'
  return '#D85A30'
}

function getCardStateClass(
  state: CognitiveState | null,
  isConnected: boolean
): string {
  if (!isConnected || !state) return styles.offline
  return styles[state] ?? ''
}

function StudentStateCard({
  student,
  onOverride,
  compact = false,
  className,
}: StudentStateCardProps) {
  const {
    id,
    name,
    avatar,
    currentState,
    focusScore,
    sessionDuration,
    isConnected,
  } = student

  return (
    <div
      className={clsx(
        styles.card,
        getCardStateClass(currentState, isConnected),
        compact && styles.compact,
        className
      )}
      aria-label={`${name} — ${currentState ?? 'not connected'}`}
    >
      <div className={styles.top}>
        <Avatar name={name} imageUrl={avatar} size="sm" showStatus isOnline={isConnected} />
        <span className={styles.name}>{name}</span>
        {isConnected && currentState && <StateBadge state={currentState} size="sm" />}
      </div>

      {isConnected && currentState ? (
        <>
          <svg className={styles.sparkline} viewBox="0 0 120 20" role="img" preserveAspectRatio="none" aria-label={`${name} focus trend`}>
            <polyline
              points="0,15 15,11 30,13 45,7 60,10 75,5 90,8 105,3 120,6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statVal} style={{ color: getFocusScoreColor(focusScore) }}>
                {focusScore}%
              </span>
              <span className={styles.statLabel}>Focus score</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>{formatDuration(sessionDuration)}</span>
              <span className={styles.statLabel}>Session time</span>
            </div>
          </div>

          <button
            className={styles.overrideBtn}
            onClick={() => onOverride?.(id)}
            aria-label={`Override mode for ${name}`}
          >
            Override mode
          </button>
        </>
      ) : (
        <div className={styles.offlineMsg}>EEG headband not detected</div>
      )}
    </div>
  )
}

export default StudentStateCard
