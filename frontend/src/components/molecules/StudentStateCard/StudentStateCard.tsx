import { useEffect, useState } from 'react'
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
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const stateDuration = student.stateStartedAt
    ? Math.max(0, Math.floor((now - Date.parse(student.stateStartedAt)) / 1000))
    : 0
  const connectionStatus = student.connectionStatus ?? (isConnected ? 'connected' : 'offline')

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

      <div className={styles.contextLine}>
        <span className={`${styles.connectionDot} ${styles[connectionStatus]}`} />
        <span>{connectionStatus === 'resyncing' ? 'Re-syncing' : connectionStatus === 'connected' ? 'Connected' : 'Offline'}</span>
        <span className={styles.engine}>{student.engineMode === 'teacher-override' ? 'Teacher override' : 'Auto engine'}</span>
      </div>

      {isConnected && currentState ? (
        <>

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
            <div className={styles.stat}>
              <span className={styles.statVal}>{formatDuration(stateDuration)}</span>
              <span className={styles.statLabel}>Latest EEG sample</span>
            </div>
          </div>

          <div className={styles.activity}>{student.activeActivity ?? 'Activity unavailable'}</div>
          <div className={styles.footerContext}>
            <span className={`${styles.qualityDot} ${styles[student.signalQuality ?? 'poor']}`} />
            {student.signalQuality ? `${student.signalQuality[0].toUpperCase()}${student.signalQuality.slice(1)} contact` : 'Contact unknown'}
            <span className={styles.transitions}>{(student.stateTransitions ?? []).map((transition) => transition.state).join(' > ')}</span>
          </div>

          {onOverride && <button
            className={styles.overrideBtn}
            onClick={() => onOverride?.(id)}
            aria-label={`Override mode for ${name}`}
          >
            Override mode
          </button>}
        </>
      ) : (
        <div className={styles.offlineMsg}>EEG headband not detected</div>
      )}
    </div>
  )
}

export default StudentStateCard
