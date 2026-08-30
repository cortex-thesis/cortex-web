import { useEffect, useMemo, useState } from 'react'
import { BatteryMedium, Bluetooth, CircleHelp, HeartPulse, Radio } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MUSE_CHANNELS, useMuseStore, type BandPowers } from '../../store/museStore'
import styles from './LiveEEG.module.css'

const BANDS: Array<{ key: keyof BandPowers; symbol: string; color: string }> = [
  { key: 'delta', symbol: 'δ', color: '#23c8b7' },
  { key: 'theta', symbol: 'θ', color: '#35bdf0' },
  { key: 'alpha', symbol: 'α', color: '#5d8df5' },
  { key: 'beta', symbol: 'β', color: '#9a63f2' },
  { key: 'gamma', symbol: 'γ', color: '#d09cf5' },
]

function smoothBandPath(history: BandPowers[], key: keyof BandPowers, maximum: number) {
  if (!history.length) return ''
  let filtered = history[0][key]
  const points = history.map((entry, index) => {
    filtered += (entry[key] - filtered) * 0.28
    return { x: history.length === 1 ? 500 : (index / (history.length - 1)) * 1000, y: 350 - (filtered / maximum) * 300 }
  })
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]
    const current = points[index]
    const next = points[index + 1]
    const after = points[Math.min(points.length - 1, index + 2)]
    const control1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 }
    const control2 = { x: next.x - (after.x - current.x) / 6, y: next.y - (after.y - current.y) / 6 }
    path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`
  }
  return path
}

function elapsedLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const remainder = seconds % 60
  return `${hours}h ${minutes}m ${remainder}s`
}

export default function LiveEEG() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, deviceName, battery, quality, bands, bandHistory, baselineProgress, acceptedChannels, connectedAt, disconnect } = useMuseStore()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const elapsed = connectedAt ? Math.max(0, Math.floor((now - connectedAt) / 1000)) : 0
  const mode = (location.state as { mode?: string } | null)?.mode === 'free' ? 'Free mode' : 'Teacher-directed'
  const paths = useMemo(() => {
    const maximum = Math.max(0.05, ...bandHistory.flatMap((entry) => BANDS.map(({ key }) => entry[key])))
    return BANDS.map(({ key }) => smoothBandPath(bandHistory, key, maximum))
  }, [bandHistory])

  if (status !== 'streaming') return <div className={styles.unsupported}><Bluetooth size={44} /><h1>Muse 2 is not connected</h1><p>Reconnect the headset before starting a visualization session.</p><button onClick={() => navigate('/student/eeg-pairing', { replace: true, state: location.state })}>Connect Muse 2</button></div>

  function endSession() { disconnect(); navigate('/student/home', { replace: true }) }

  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Live Muse 2 &middot; {mode}</span><h1>Brainwave visualization</h1></div><div className={styles.device}><Radio size={16} />{deviceName || 'Muse 2'}<span><BatteryMedium size={16} />{battery == null ? 'Unavailable' : `${battery}%`}</span></div></header>
    <section className={styles.sensorStrip}>{MUSE_CHANNELS.map((name, index) => <div key={name} className={quality[index] === 2 ? styles.good : quality[index] === 1 ? styles.fair : styles.poor}><strong>{name}</strong><span>{quality[index] === 2 ? 'Good contact' : quality[index] === 1 ? 'Adjust sensor' : 'No signal'}</span></div>)}</section>
    <div className={styles.processingStatus}><span>{baselineProgress < 100 ? `Personal baseline calibration ${baselineProgress}%` : 'Personal baseline ready'}</span><span className={acceptedChannels ? styles.clean : styles.rejected}>{acceptedChannels ? `${acceptedChannels}/4 artifact-free channels` : 'Movement artifact detected'}</span></div>
    <section className={styles.bandRow}>{BANDS.map(({ key, symbol, color }) => <div key={key}><span style={{ color }}>{symbol} {key}</span><strong style={{ color }}>{bands[key].toFixed(3)}</strong></div>)}</section>
    <section className={styles.chart} aria-label="Live overlapping brainwave band visualization">
      {!bandHistory.length && <p className={styles.chartWaiting}>Collecting enough EEG data to draw the brainwaves…</p>}
      <svg viewBox="0 0 1000 385" preserveAspectRatio="none">
        {[50, 125, 200, 275, 350].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} className={styles.gridLine} />)}
        {paths.map((path, index) => <path key={BANDS[index].key} d={path} fill="none" stroke={BANDS[index].color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className={styles.bandPath} />)}
      </svg>
    </section>
    <footer className={styles.footer}><div className={styles.elapsed}><HeartPulse size={18} /> Time elapsed: <strong>{elapsedLabel(elapsed)}</strong></div><button className={styles.endButton} onClick={endSession}>End session</button><details><summary><CircleHelp size={15} /> What am I seeing?</summary><p>The five lines are baseline-relative scores: 1.0 is your calibration average, values above 1.0 are higher, and values below 1.0 are lower. Processing uses 1–50 Hz band-pass and 60 Hz notch filters, artifact rejection, four-second overlapping windows, Welch power spectra, logarithmic absolute power, relative power, and personal baseline normalization. These are educational signals, not a medical diagnosis.</p></details></footer>
  </main>
}
