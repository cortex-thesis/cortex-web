import { useState } from 'react'
import { ArrowLeft, Bluetooth, Check, HelpCircle, Radio, Sparkles, Wifi, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { AlertBanner } from '../../components/molecules'
import { MUSE_CHANNELS, useMuseStore } from '../../store/museStore'
import styles from './EEGPairing.module.css'

const STEPS = [
  { label: 'Bluetooth', icon: Bluetooth },
  { label: 'Muse 2', icon: Wifi },
  { label: 'Signal', icon: Radio },
  { label: 'Ready', icon: Radio },
]

export default function EEGPairing() {
  const navigate = useNavigate()
  const location = useLocation()
  const { status, error, deviceName, battery, quality, samples, baselineProgress, connect, disconnect } = useMuseStore()
  const hasSignal = quality.some((value) => value > 0)
  const cleanContacts = quality.filter((value) => value > 0).length
  const contactsReady = cleanContacts === MUSE_CHANNELS.length && samples.every((channel) => channel.length >= 128)
  const ready = status === 'streaming' && contactsReady
  const currentStep = ready ? 4 : status === 'streaming' && hasSignal ? 3 : status === 'streaming' || status === 'connecting' ? 2 : 1
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100
  const busy = status === 'requesting' || status === 'connecting'
  const [showGuide, setShowGuide] = useState(false)

  return <PlayfulZoneTemplate showNav={false}>
    <div className={styles.topBar}><button className={styles.backBtn} onClick={() => { disconnect(); navigate(-1) }}><ArrowLeft size={16} /></button><span className={styles.topBarTitle}>Muse 2 sensor signal check</span>{battery != null && <span className={styles.battery}>Battery {battery}%</span>}</div>
    <div className={styles.content}>
      <div className={styles.pairingSection}>
        <div className={styles.stepIntro}><span className={styles.stepCount}>Step {currentStep} of 4</span><span className={styles.stepName}>{STEPS[currentStep - 1].label}</span></div>
        <div className={styles.sensorCheck} aria-label="Muse 2 electrode contact quality">
          <div className={styles.headbandArc}>
            {MUSE_CHANNELS.map((channel, index) => <div key={channel} className={`${styles.sensor} ${quality[index] === 2 ? styles.sensorGood : quality[index] === 1 ? styles.sensorFair : ''}`}><span>{channel}</span><small>{quality[index] === 2 ? 'Good' : quality[index] === 1 ? 'Adjust' : 'Waiting'}</small></div>)}
          </div>
          <div className={styles.centerStatus}>{ready ? <span aria-hidden="true" /> : <Bluetooth size={42} />}</div>
        </div>
        <div className={styles.textBlock}><h1 className={styles.title}>{ready ? 'Signal check complete' : status === 'streaming' ? 'Adjust the sensor contact' : busy ? 'Connecting to Muse 2' : 'Connect your Muse 2'}</h1><p className={styles.sub}>{ready ? `${deviceName} has a usable signal. You can continue now while Cortex refines the baseline in the background.` : status === 'streaming' ? 'Adjust any highlighted sensor until all four contacts are ready.' : 'Charge and turn on the headband, enable Bluetooth, stay within 1 metre, then choose it from the browser window.'}</p><button className={styles.guideButton} onClick={() => setShowGuide(true)}><HelpCircle size={15} /> How to wear and prepare Muse 2</button></div>
        {status === 'streaming' && <div className={styles.calibration} role="status"><span><b>{cleanContacts}/4</b> sensor contacts ready</span><span><b>{baselineProgress}%</b> background refinement</span></div>}
        <div className={styles.waveProgress} role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={4}><svg className={styles.waveLine} viewBox="4 0 292 44" preserveAspectRatio="none"><path className={styles.waveTrack} pathLength="100" d="M4 22 C22 22 22 8 40 8 S58 36 76 36 S94 14 112 14 S130 30 148 30 S166 8 184 8 S202 36 220 36 S238 14 256 14 S274 22 296 22" /><path className={`${styles.waveFill} ${ready ? styles.waveSuccess : ''}`} pathLength="100" strokeDasharray={`${progress} 100`} d="M4 22 C22 22 22 8 40 8 S58 36 76 36 S94 14 112 14 S130 30 148 30 S166 8 184 8 S202 36 220 36 S238 14 256 14 S274 22 296 22" /></svg><div className={styles.stepNodes}>{STEPS.map((step, index) => { const Icon = step.icon; const number = index + 1; return <span key={step.label} className={`${styles.stepNode} ${number < currentStep ? styles.stepComplete : ''} ${number === currentStep ? styles.stepActive : ''}`}><Icon size={14} /></span> })}</div></div>
      </div>
      {error && <AlertBanner variant="error" title="Muse connection" message={error} className={styles.errorBanner} />}
      <div className={styles.actions}>
        {status !== 'streaming' && <button className={styles.startBtn} disabled={busy} onClick={() => void connect()}>{busy ? 'Connecting…' : 'Choose Muse 2'}</button>}
        {status === 'streaming' && !ready && <button className={styles.retryBtn} onClick={disconnect}>Disconnect</button>}
        {ready && <button className={styles.startBtn} onClick={() => navigate('/student/mode-select', { state: location.state })}>Continue</button>}
        {import.meta.env.DEV && <button className={styles.retryBtn} onClick={() => navigate('/student/mode-select', { state: { ...(location.state ?? {}), devBypass: true } })}>Development: test without a headset</button>}
      </div>
      <p className={styles.compatibility}>Works directly in Chrome/Edge on Windows, macOS, and Android over HTTPS or localhost. Direct browser Bluetooth is unavailable on iPhone/iPad.</p>
    </div>
    {showGuide && <div className={styles.guideOverlay} role="dialog" aria-modal="true" aria-labelledby="guide-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGuide(false) }}>
      <section className={styles.guideCard}>
        <header><div><span>Quick setup</span><h2 id="guide-title">Get a clear Muse 2 signal</h2></div><button aria-label="Close tutorial" onClick={() => setShowGuide(false)}><X size={18} /></button></header>
        <div className={styles.wearVisual} aria-label="Muse sensor placement illustration"><div className={styles.face}><div className={styles.band}><b>AF7</b><strong>MUSE</strong><b>AF8</b></div><span className={styles.leftEar}>TP9</span><span className={styles.rightEar}>TP10</span></div></div>
        <div className={styles.guideSteps}>
          <article><span><Sparkles size={17} /></span><div><b>Clean</b><p>Wipe all four sensors and the forehead contact with a dry, lint-free cloth.</p></div></article>
          <article><span>2</span><div><b>Position</b><p>Center the Muse logo. Keep AF7 and AF8 flat on bare forehead, with TP9 and TP10 behind the ears.</p></div></article>
          <article><span>3</span><div><b>Adjust</b><p>Move hair away and gently press any sensor marked Adjust until all four contacts are usable.</p></div></article>
        </div>
        <aside><Check size={16} /><span>You can continue as soon as all four contacts are usable. Baseline refinement continues quietly during the lesson.</span></aside>
        <button className={styles.guideDone} onClick={() => setShowGuide(false)}>Got it</button>
      </section>
    </div>}
  </PlayfulZoneTemplate>
}
