import type { StudentLive } from '../../../types'
import type { CognitiveState } from '../../../constants/states'
import { Avatar, StateBadge, SignalBar } from '../../atoms'
import styles from './StudentStateCard.module.css'
import clsx from 'clsx'

interface StudentStateCardProps {
  student: StudentLive
  onOverride?: (studentId: string) => void
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
  className,
}: StudentStateCardProps) {
  const {
    id,
    name,
    avatar,
    currentState,
    signalStrength,
    focusScore,
    sessionDuration,
    isConnected,
  } = student

  return (
    <div
      className={clsx(
        styles.card,
        getCardStateClass(currentState, isConnected),
        className
      )}
      aria-label={`${name} — ${currentState ?? 'not connected'}`}
    >
      <div className={styles.top}>
        <Avatar
          name={name}
          imageUrl={avatar}
          size="sm"
          showStatus
          isOnline={isConnected}
        />
        <span className={styles.name}>{name}</span>
        <SignalBar strength={isConnected ? signalStrength : 0} size="xs" />
      </div>

      {isConnected && currentState ? (
        <>
          <StateBadge state={currentState} size="sm" />

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span
                className={styles.statVal}
                style={{ color: getFocusScoreColor(focusScore) }}
              >
                {focusScore}%
              </span>
              <span className={styles.statLabel}>Focus score</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>
                {formatDuration(sessionDuration)}
              </span>
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
