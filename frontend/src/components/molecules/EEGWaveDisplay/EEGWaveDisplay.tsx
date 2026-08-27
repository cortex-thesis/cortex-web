import type { BandPowers, CognitiveState, HeadsetConnectionStatus, SignalQuality } from '../../../types'
import { StateBadge } from '../../atoms'
import styles from './EEGWaveDisplay.module.css'
import clsx from 'clsx'

interface EEGWaveDisplayProps {
  state?: CognitiveState | null
  bandPowers?: BandPowers | null
  signalQuality?: SignalQuality
  connectionStatus?: HeadsetConnectionStatus
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

export function EEGWaveDisplay({
  state,
  bandPowers,
  signalQuality = 'poor',
  connectionStatus = 'offline',
  className,
}: EEGWaveDisplayProps) {
  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.header}>
        <span className={styles.title}>Brainwaves</span>
        <div className={styles.headerStatus}>
          <span className={`${styles.connection} ${styles[connectionStatus]}`}>{connectionStatus === 'resyncing' ? 'Re-syncing' : connectionStatus === 'connected' ? 'Connected' : 'Offline'}</span>
          {state ? <StateBadge state={state} size="sm" /> : <span className={styles.noData}>No signal</span>}
        </div>
      </div>

      <div className={styles.channels} role="img" aria-label={`EEG channel waveforms - ${state ?? 'no signal'}`}>
        {['F3', 'F4', 'C3', 'C4'].map((channel, channelIndex) => (
          <div className={styles.channel} key={channel}>
            <span>{channel}</span>
            <svg viewBox="0 0 160 20" preserveAspectRatio="none">
              <path d="M0 10 H12 L18 4 L24 16 L30 10 H44 L50 7 L56 13 L62 10 H78 L84 3 L90 17 L96 10 H112 L118 6 L124 14 L130 10 H146 L152 5 L160 10" style={{ transform: `translateY(${channelIndex % 2 ? 1 : 0}px)` }} />
            </svg>
          </div>
        ))}
      </div>

      <div className={styles.quality}><span className={`${styles.qualityDot} ${styles[signalQuality]}`} />Signal quality: <strong>{signalQuality[0].toUpperCase() + signalQuality.slice(1)}</strong><span className={styles.contact}>Electrode contact</span></div>

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
