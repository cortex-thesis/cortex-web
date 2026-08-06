import { useNavigate, useLocation } from 'react-router-dom'
import { PartyPopper } from 'lucide-react'
import { OverlayTemplate } from '../../components/templates'
import { COGNITIVE_STATES } from '../../constants/states'
import type { CognitiveState } from '../../constants/states'
import type { SessionSummary as SessionSummaryType } from '../../types'
import styles from './SessionSummary.module.css'

const MOCK_SUMMARY: SessionSummaryType = {
  sessionId: 'session-001',
  duration: 1450,
  focusScore: 82,
  stateDistribution: {
    focused: 68,
    relaxed: 20,
    distracted: 12,
    overstimulated: 0,
  },
  taskCompleted: 5,
  taskTotal: 5,
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function getFocusColor(score: number): string {
  if (score >= 75) return '#1D9E75'
  if (score >= 50) return '#EF9F27'
  return '#D85A30'
}

const STATE_ORDER: CognitiveState[] = [
  'focused',
  'relaxed',
  'distracted',
  'overstimulated',
]

export default function SessionSummary() {
  const navigate = useNavigate()
  const location = useLocation()

  const summary: SessionSummaryType =
    (location.state as { summary?: SessionSummaryType })?.summary ??
    MOCK_SUMMARY

  const { duration, focusScore, stateDistribution, taskCompleted, taskTotal } =
    summary

  function handleJournal() {
    navigate('/student/journal', {
      state: {
        sessionId: summary.sessionId,
        tasksDone: Array.from(
          { length: taskCompleted },
          (_, i) => `Task ${i + 1}`
        ),
      },
    })
  }

  return (
    <OverlayTemplate>
      <div
        className={styles.card}
        role="dialog"
        aria-label="Session complete"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div className={styles.trophy} aria-hidden="true">
            <PartyPopper size={36} color="#EF9F27" />
          </div>
          <h2 className={styles.title}>Session Complete!</h2>
          <p className={styles.sub}>Life Skills · Getting Ready for School</p>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span
              className={styles.statVal}
              style={{ color: getFocusColor(focusScore) }}
            >
              {focusScore}%
            </span>
            <span className={styles.statLabel}>Focus score</span>
          </div>
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
                  aria-label={`${config.label}: ${pct}%`}
                >
                  <div
                    className={styles.stateFill}
                    style={{
                      width: `${pct}%`,
                      background: config.color,
                    }}
                  />
                </div>
                <span className={styles.statePct}>{pct}%</span>
              </div>
            )
          })}
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={handleJournal}>
            Write in journal
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => navigate('/student/home', { replace: true })}
          >
            Go home
          </button>
        </div>
      </div>
    </OverlayTemplate>
  )
}
