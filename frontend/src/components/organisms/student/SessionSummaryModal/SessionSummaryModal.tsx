import IllustrationIcon from '../../../atoms/IllustrationIcon'
import { getFocusPerformance } from '../../../../lib/focusPerformance'
import type { SessionSummary } from '../../../../types'
import type { CognitiveState } from '../../../../constants/states'
import { COGNITIVE_STATES } from '../../../../constants/states'
import styles from './SessionSummaryModal.module.css'

interface SessionSummaryModalProps {
  summary: SessionSummary
  className?: string
  onJournal?: () => void
  onHome?: () => void
}

const STATE_ORDER: CognitiveState[] = [
  'focused',
  'relaxed',
  'distracted',
  'overstimulated',
]

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}




function SessionSummaryModal({
  summary,
  onJournal,
  onHome,
  className,
}: SessionSummaryModalProps) {
  const { duration, focusScore, stateDistribution, taskCompleted, taskTotal } =
    summary

  const performance = getFocusPerformance(focusScore, stateDistribution)

  return (
    <div
      className={`${styles.card} ${className ?? ''}`}
      role="dialog"
      aria-label="Session complete"
      aria-modal="true"
    >
      <div className={styles.header}>
        <span className={styles.trophy} aria-hidden="true">
          <IllustrationIcon name="trophy" size={48} />
        </span>
        <h2 className={styles.title}>Session Complete!</h2>
        <p className={styles.sub}>Great work today</p>
      </div>

      <div className={styles.focusStat}>
        <span className={styles.focusEmoji} aria-hidden="true">
          <IllustrationIcon name={performance.icon} size={40} />
        </span>
        <span
          className={styles.statVal}
          style={{ color: performance.color }}
        >
          {performance.phrase}
        </span>
        <span className={styles.statLabel}>Focus performance</span>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statVal}>
            {taskCompleted}/{taskTotal}
          </span>
          <span className={styles.statLabel}>Tasks done</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statVal}>{formatDuration(duration)}</span>
          <span className={styles.statLabel}>Session time</span>
        </div>
      </div>

      <div className={styles.statesSection}>
        <span className={styles.sectionTitle}>Time in each state</span>
        {STATE_ORDER.filter((s) => stateDistribution[s] > 0).map((s) => {
          const config = COGNITIVE_STATES[s]
          const pct = stateDistribution[s]
          return (
            <div key={s} className={styles.stateRow}>
              <span className={styles.stateLabel}>
                <span
                  className={styles.stateDot}
                  style={{ background: config.color }}
                  aria-hidden="true"
                />
                {config.label}
              </span>
              <div
                className={styles.stateTrack}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={styles.stateFill}
                  style={{ width: `${pct}%`, background: config.color }}
                />
              </div>
              <span className={styles.statePct}>{pct}%</span>
            </div>
          )
        })}
      </div>

      <div className={styles.actions}>
        {onJournal && (
          <button className={styles.primaryBtn} onClick={onJournal}>
            Write in journal
          </button>
        )}
        {onHome && (
          <button className={styles.secondaryBtn} onClick={onHome}>
            Go home
          </button>
        )}
      </div>
    </div>
  )
}

export default SessionSummaryModal
