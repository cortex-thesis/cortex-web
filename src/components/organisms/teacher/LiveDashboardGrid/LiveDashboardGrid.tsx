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
  color: string
}[] = [
  { key: 'focused', label: 'Focused', color: '#1D9E75' },
  { key: 'distracted', label: 'Distracted', color: '#EF9F27' },
  { key: 'relaxed', label: 'Relaxed', color: '#378ADD' },
  { key: 'overstimulated', label: 'Overstimulated', color: '#D85A30' },
  { key: 'offline', label: 'Offline', color: '#B4B2A9' },
]

interface LiveDashboardGridProps {
  students: StudentLive[]
  sessionLabel?: string
  selectedId?: string | null
  onSelectStudent?: (id: string) => void
  onOverride?: (id: string) => void
  className?: string
}

function LiveDashboardGrid({
  students,
  sessionLabel = 'Session in progress',
  selectedId,
  onSelectStudent,
  onOverride,
  className,
}: LiveDashboardGridProps) {
  const counts = countStates(students)

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <div className={styles.summaryBar}>
        {SUMMARY_STATES.map(({ key, label, color }) => (
          <div key={key} className={styles.summaryCard}>
            <span
              className={styles.summaryDot}
              style={{ background: color }}
              aria-hidden="true"
            />
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
            <StudentStateCard student={student} onOverride={onOverride} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default LiveDashboardGrid
