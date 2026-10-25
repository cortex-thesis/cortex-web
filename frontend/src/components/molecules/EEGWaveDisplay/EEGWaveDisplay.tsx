import RecordedWaveforms from './RecordedWaveforms'
import { useEffect, useState } from 'react'
import type { BandPowers, CognitiveState, HeadsetConnectionStatus, SignalQuality } from '../../../types'
import { StateBadge } from '../../atoms'
import styles from './EEGWaveDisplay.module.css'
import clsx from 'clsx'

interface EEGWaveDisplayProps {
  sessionId?: string
  recordedAt?: string
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
  { key: 'theta', label: 'Theta', colorClass: styles.theta, max: 2.5 },
  { key: 'alpha', label: 'Alpha', colorClass: styles.alpha, max: 2.5 },
  { key: 'beta', label: 'Beta', colorClass: styles.beta, max: 2.5 },
  { key: 'gamma', label: 'Gamma', colorClass: styles.gamma, max: 2.5 },
]

const TBR_LABELS: Partial<Record<CognitiveState, string>> = {
  focused: 'Low (Focused)',
  relaxed: 'Low-Mid (Relaxed)',
  distracted: 'High (Distracted)',
  overstimulated: 'Elevated (Overstimulated)',
}

export function EEGWaveDisplay({
  state,
  recordedAt,
  sessionId,
  bandPowers,
  signalQuality = 'poor',
  connectionStatus = 'offline',
  className,
}: EEGWaveDisplayProps) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const stale = !recordedAt || !Number.isFinite(Date.parse(recordedAt)) || now - Date.parse(recordedAt) > 8000
  return (
    <div className={clsx(styles.card, className)}>
      <div className={styles.header}>
        <span className={styles.title}>Brainwaves</span>
        <div className={styles.headerStatus}>
          <span className={`${styles.connection} ${styles[connectionStatus]}`}>{connectionStatus === 'resyncing' ? 'Re-syncing' : connectionStatus === 'connected' ? 'Connected' : 'Offline'}</span>
          {state ? <StateBadge state={state} size="sm" /> : <span className={styles.noData}>No signal</span>}
        </div>
      </div>

      <p role="status">Live channel waveforms are unavailable in this summary.</p>
      {sessionId && <details><summary>Review recorded EEG</summary><RecordedWaveforms key={sessionId} sessionId={sessionId} /></details>}
      <p>Band values: baseline-normalized scores (unitless).</p>
      <p role="status">{connectionStatus !== 'connected' ? 'Disconnected - last recorded values' : stale ? 'Stale recorded data' : 'Latest recorded data'}{recordedAt && Number.isFinite(Date.parse(recordedAt)) ? <> / <time dateTime={recordedAt}>{new Date(recordedAt).toLocaleString()}</time></> : ' / Update time unavailable'}</p>
      <div className={styles.quality}><span className={`${styles.qualityDot} ${styles[signalQuality]}`} />Signal quality: <strong>{signalQuality[0].toUpperCase() + signalQuality.slice(1)}</strong><span className={styles.contact}>Electrode contact</span></div>

      {bandPowers ? (
        <>
          <div className={styles.bands}>
            {BANDS.map(({ key, label, colorClass, max }) => {
              const val = bandPowers[key]
              if (!Number.isFinite(val)) return <div key={key}>{label}: unavailable</div>
              const pct = Math.max(0, Math.min(100, (val / max) * 100))
              return (
                <div key={key} className={styles.band}>
                  <span className={styles.bandLabel}>{label}</span>
                  <div
                    className={styles.bandTrack}
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label} baseline-normalized score`}
                  >
                    <div
                      className={clsx(styles.bandFill, colorClass)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={styles.bandVal}>{val.toFixed(2)} x baseline</span>
                </div>
              )
            })}
          </div>

          {Number.isFinite(bandPowers.tbr) && state && TBR_LABELS[state] && (
            <div className={styles.tbrRow}>
              <span className={styles.tbrLabel}>Theta/beta score ratio</span>
              <span className={styles.tbrVal}>{bandPowers.tbr?.toFixed(2)}</span>

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
