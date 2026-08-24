import { COGNITIVE_STATES } from '../../../constants/states'
import type { CognitiveState } from '../../../constants/states'
import styles from './DevEEGPanel.module.css'

interface DevEEGPanelProps {
  currentState: CognitiveState | null
  isManualOverride: boolean
  onSetState: (state: CognitiveState) => void
  onResumeAuto: () => void
}

const STATES: CognitiveState[] = [
  'focused',
  'distracted',
  'relaxed',
  'overstimulated',
]

// Manual EEG override for local testing — lets you force a specific
// cognitive state instead of waiting for createMockEEGStream's fixed
// 5s auto-cycle to happen to land on the one you want to check. Only
// meaningful with mock data (IS_MOCK in useEEG.ts), and only renders
// in dev builds — this should never ship to a real deployment.
export default function DevEEGPanel({
  currentState,
  isManualOverride,
  onSetState,
  onResumeAuto,
}: DevEEGPanelProps) {
  if (!import.meta.env.DEV) return null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>EEG Dev Panel</span>
        <span className={styles.mode}>
          {isManualOverride ? 'Manual' : 'Auto-cycling'}
        </span>
      </div>

      <div className={styles.buttonGrid}>
        {STATES.map((state) => (
          <button
            key={state}
            className={styles.stateBtn}
            data-active={currentState === state}
            style={
              {
                '--state-color': COGNITIVE_STATES[state].color,
              } as React.CSSProperties
            }
            onClick={() => onSetState(state)}
          >
            {COGNITIVE_STATES[state].label}
          </button>
        ))}
      </div>

      <button
        className={styles.resumeBtn}
        onClick={onResumeAuto}
        disabled={!isManualOverride}
      >
        Resume auto-cycle
      </button>
    </div>
  )
}
