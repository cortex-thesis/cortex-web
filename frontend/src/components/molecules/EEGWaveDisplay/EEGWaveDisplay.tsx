import type { BandPowers, CognitiveState } from '../../../types'
import { COGNITIVE_STATES } from '../../../constants/states'
import { StateBadge } from '../../atoms'
import styles from './EEGWaveDisplay.module.css'
import clsx from 'clsx'

interface EEGWaveDisplayProps {
  state?: CognitiveState | null
  bandPowers?: BandPowers | null
  className?: string
}

const BANDS: {
  key: keyof Omit<BandPowers, 'tbr'>
  label: string
  colorClass: string
  max: number
}[] = [
  { key: 'theta', label: 'Theta', colorClass: styles.theta, max: 15 },
  { key: 'alpha', label: 'Alpha', colorClass: styles.alpha, max: 15 },
  { key: 'beta', label: 'Beta', colorClass: styles.beta, max: 15 },
  { key: 'gamma', label: 'Gamma', colorClass: styles.gamma, max: 10 },
]

const TBR_LABELS: Partial<Record<CognitiveState, string>> = {
  focused: 'Low (Focused)',
  relaxed: 'Low-Mid (Relaxed)',
  distracted: 'High (Distracted)',
  overstimulated: 'Elevated (Overstimulated)',
}

const BAR_COUNT = 12

export function EEGWaveDisplay({
  state,
  bandPowers,
  className,
}: EEGWaveDisplayProps) {
  // Safe lookup for state color in case state is null, undefined, or missing from COGNITIVE_STATES
  const stateColor =
    state && COGNITIVE_STATES[state]?.color
      ? COGNITIVE_STATES[state].color
      : '#534AB7'

  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.header}>
        <span className={styles.title}>Brainwaves</span>
        {state ? (
          <StateBadge state={state} size="sm" />
        ) : (
          <span className={styles.noData}>No signal</span>
        )}
      </div>

      <div
        className={styles.waveBars}
        role="img"
        aria-label={`EEG waveform — ${state ?? 'no signal'}`}
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            className={styles.waveBar}
            style={{
              backgroundColor: stateColor,
              animationDelay: `${i * 0.08}s`,
              animationDuration:
                state === 'distracted' || state === 'overstimulated'
                  ? '0.65s'
                  : '1.1s',
            }}
            aria-hidden="true"
          />
        ))}
      </div>

      {bandPowers ? (
        <>
          <div className={styles.bands}>
            {BANDS.map(({ key, label, colorClass, max }) => {
              const val = bandPowers[key] ?? 0
              const pct = Math.min(100, (val / max) * 100)
              return (
                <div key={key} className={styles.band}>
                  <span className={styles.bandLabel}>{label}</span>
                  <div
                    className={styles.bandTrack}
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label} power`}
                  >
                    <div
                      className={clsx(styles.bandFill, colorClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.bandVal}>{val.toFixed(1)} μV</span>
                </div>
              )
            })}
          </div>

          {bandPowers.tbr !== undefined && state && TBR_LABELS[state] && (
            <div className={styles.tbrRow}>
              <span className={styles.tbrLabel}>TBR</span>
              <span className={styles.tbrVal}>{bandPowers.tbr.toFixed(2)}</span>
              <span className={styles.tbrDesc}>— {TBR_LABELS[state]}</span>
            </div>
          )}
        </>
      ) : (
        <div className={styles.noDataMsg}>Waiting for EEG data...</div>
      )}
    </div>
  )
}

export default EEGWaveDisplay
