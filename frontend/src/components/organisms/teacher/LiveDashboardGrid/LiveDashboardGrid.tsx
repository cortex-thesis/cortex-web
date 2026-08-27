import type { StudentLive } from '../../../../types'
import type { CognitiveState } from '../../../../constants/states'
import { StudentStateCard } from '../../../molecules'
import styles from './LiveDashboardGrid.module.css'

type StateCount = Record<CognitiveState | 'offline', number>

function countStates(students: StudentLive[]): StateCount {
  return students.reduce(
    (acc, s) => {
      if (!s.isConnected || !s.currentState) acc.offline += 1
      else acc[s.currentState] += 1
      return acc
    },
    { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0, offline: 0 }
  )
}

const SUMMARY_STATES: {
  key: CognitiveState | 'offline'
  label: string
}[] = [
  { key: 'focused', label: 'Focused' },
  { key: 'distracted', label: 'Distracted' },
  { key: 'relaxed', label: 'Relaxed' },
  { key: 'overstimulated', label: 'Overstimulated' },
  { key: 'offline', label: 'Offline' },
]

interface LiveDashboardGridProps {
  students: StudentLive[]
  sessionLabel?: string
  selectedId?: string | null
  onSelectStudent?: (id: string) => void
  onOverride?: (id: string) => void
  compact?: boolean
  className?: string
}

export function LiveDashboardGrid({
  students,
  sessionLabel = 'Session in progress',
  selectedId,
  onSelectStudent,
  onOverride,
  compact = false,
  className,
}: LiveDashboardGridProps) {
  const counts = countStates(students)

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compact : ''} ${className ?? ''}`}>
      <div className={styles.waveform} aria-hidden="true">
        <svg viewBox="0 0 800 28" preserveAspectRatio="none">
          <path d="M0 14 H80 L90 14 L98 4 L106 24 L114 14 H190 L200 14 L208 8 L216 20 L224 14 H310 L320 14 L328 2 L336 26 L344 14 H430 L440 14 L448 7 L456 21 L464 14 H550 L560 14 L568 5 L576 23 L584 14 H670 L680 14 L688 9 L696 19 L704 14 H800" />
        </svg>
      </div>
      <div className={styles.summaryBar}>
        {SUMMARY_STATES.map(({ key, label }) => (
          <div key={key} className={`${styles.summaryCard} ${styles[key]}`}>
            <span className={styles.summaryDot} aria-hidden="true" />
            <div className={styles.summaryInfo}>
              <span className={styles.summaryNum}>
                {counts[key as keyof StateCount]}
              </span>
              <span className={styles.summaryLabel}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{sessionLabel}</span>
        <span className={styles.livePill}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>
      </div>

      <div className={styles.grid}>
        {students.map((student) => (
          <div
            key={student.id}
            onClick={() => onSelectStudent?.(student.id)}
            className={selectedId === student.id ? styles.cardSelected : ''}
          >
            <StudentStateCard student={student} onOverride={onOverride} compact={compact} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default LiveDashboardGrid
