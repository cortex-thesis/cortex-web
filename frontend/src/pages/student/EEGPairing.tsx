import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Wifi,
  CheckCircle2,
  Power,
} from 'lucide-react'
import { CalmZoneTemplate } from '../../components/templates'
import { PulseRing, SignalBar } from '../../components/atoms'
import { AlertBanner } from '../../components/molecules'
import styles from './EEGPairing.module.css'

type PairingStatus = 'scanning' | 'found' | 'connecting' | 'connected' | 'error'

interface StatusConfig {
  title: string
  sub: string
  pulseColor: 'teal' | 'purple'
  pulseActive: boolean
}

const STATUS_CONTENT: Record<PairingStatus, StatusConfig> = {
  scanning: {
    title: 'Finding your headband',
    sub: 'Turn it on and wear it snugly.',
    pulseColor: 'purple',
    pulseActive: true,
  },
  found: {
    title: 'Headband found',
    sub: 'Stay still for a moment.',
    pulseColor: 'teal',
    pulseActive: true,
  },
  connecting: {
    title: 'Connecting',
    sub: 'This will only take a moment.',
    pulseColor: 'teal',
    pulseActive: true,
  },
  connected: {
    title: 'You’re connected!',
    sub: 'Your headband is ready.',
    pulseColor: 'teal',
    pulseActive: false,
  },
  error: {
    title: 'Could not connect',
    sub: 'Check your headband and try again.',
    pulseColor: 'purple',
    pulseActive: false,
  },
}

const SIGNAL_LABEL: Record<PairingStatus, string> = {
  scanning: 'Searching...',
  found: 'Found',
  connecting: 'Connecting...',
  connected: 'Strong signal',
  error: 'No signal',
}

const SIGNAL_STRENGTH: Record<PairingStatus, 0 | 1 | 2 | 3 | 4> = {
  scanning: 0,
  found: 1,
  connecting: 2,
  connected: 4,
  error: 0,
}

const PAIRING_STEPS = [
  { label: 'Search', icon: Power },
  { label: 'Found', icon: Search },
  { label: 'Connect', icon: Wifi },
  { label: 'Ready', icon: CheckCircle2 },
]

const STATUS_STEP: Record<PairingStatus, number> = {
  scanning: 1,
  found: 2,
  connecting: 3,
  connected: 4,
  error: 1,
}

const TIPS = [
  'Check that Bluetooth is on',
  'Make sure the headband light is blinking',
]

export default function EEGPairing() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<PairingStatus>('scanning')

  // Simulate pairing flow in dev — swap for real BLE logic in production
  useEffect(() => {
    const IS_MOCK = true

    if (!IS_MOCK) return

    const t1 = setTimeout(() => setStatus('found'), 2000)
    const t2 = setTimeout(() => setStatus('connecting'), 3500)
    const t3 = setTimeout(() => setStatus('connected'), 5000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  // Navigate to mode select once connected
  useEffect(() => {
    if (status !== 'connected') return
    const id = setTimeout(() => {
      navigate('/student/mode-select')
    }, 2000)
    return () => clearTimeout(id)
  }, [status, navigate])

  function handleRetry() {
    setStatus('scanning')
  }

  const content = STATUS_CONTENT[status]
  const signalStrength = SIGNAL_STRENGTH[status]
  const signalLabel = SIGNAL_LABEL[status]
  const currentStep = STATUS_STEP[status]
  const progress = ((currentStep - 1) / (PAIRING_STEPS.length - 1)) * 100

  return (
    <CalmZoneTemplate showNav={false}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <span className={styles.topBarTitle}>Connect your headband</span>
      </div>

      <div className={styles.content}>
        <div className={`${styles.pairingSection} ${status === 'connected' ? styles.connectedState : ''}`}>
          <div className={styles.stepIntro} aria-live="polite">
            <span className={styles.stepCount}>Step {currentStep} of {PAIRING_STEPS.length}</span>
            <span className={styles.stepName}>{PAIRING_STEPS[currentStep - 1].label}</span>
          </div>

          <div className={styles.visualSlot}>
            {status === 'connected' ? (
              <div className={styles.successMark} role="img" aria-label="Headband connected">
                <CheckCircle2 size={48} strokeWidth={2.25} aria-hidden="true" />
              </div>
            ) : (
              <PulseRing
                size="lg"
                color={content.pulseColor}
                active={content.pulseActive}
              />
            )}
          </div>

          <div className={styles.textBlock}>
            <h1 className={`${styles.title} ${status === 'connected' ? styles.successTitle : ''}`}>
              {content.title}
            </h1>
            <p className={styles.sub}>{content.sub}</p>
          </div>

          <div
            className={styles.signalRow}
            aria-label={`Signal: ${signalLabel}`}
          >
            <SignalBar strength={signalStrength} size="sm" />
            <span className={styles.signalLabel}>{signalLabel}</span>
          </div>

          <div
            className={styles.waveProgress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={PAIRING_STEPS.length}
            aria-valuenow={currentStep}
            aria-label={`Headband pairing: step ${currentStep} of ${PAIRING_STEPS.length}, ${PAIRING_STEPS[currentStep - 1].label}`}
          >
            <svg className={styles.waveLine} viewBox="4 0 292 44" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.waveTrack} pathLength="100" d="M4 22 C22 22 22 8 40 8 S58 36 76 36 S94 14 112 14 S130 30 148 30 S166 8 184 8 S202 36 220 36 S238 14 256 14 S274 22 296 22" />
              <path className={`${styles.waveFill} ${status === 'connected' ? styles.waveSuccess : ''}`} pathLength="100" strokeDasharray={`${progress} 100`} d="M4 22 C22 22 22 8 40 8 S58 36 76 36 S94 14 112 14 S130 30 148 30 S166 8 184 8 S202 36 220 36 S238 14 256 14 S274 22 296 22" />
            </svg>
            <div className={styles.stepNodes} aria-hidden="true">
              {PAIRING_STEPS.map((step, index) => {
                const StepIcon = step.icon
                const stepNumber = index + 1
                return (
                  <span
                    className={`${styles.stepNode} ${stepNumber < currentStep ? styles.stepComplete : ''} ${stepNumber === currentStep ? styles.stepActive : ''}`}
                    key={step.label}
                  >
                    <StepIcon size={14} strokeWidth={2} />
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {status === 'error' && (
          <AlertBanner
            variant="error"
            title="Connection failed"
            message="We could not detect your headband. Make sure it is powered on and Bluetooth is enabled."
            className={styles.errorBanner}
          />
        )}

        {status === 'error' && (
          <ul className={styles.tips} aria-label="Connection tips">
            {TIPS.map((tip, i) => (
              <li key={i} className={styles.tip}>
                <span className={styles.tipDot} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        <div className={styles.statusSlot} aria-live="polite">
        {status === 'connected' && (
          <div className={styles.successMsg}>
            Starting your session…
          </div>
        )}
        </div>

        <div className={styles.actions}>
          {(status === 'scanning' || status === 'error') && (
            <button className={styles.retryBtn} onClick={handleRetry}>
              {status === 'error' ? 'Try again' : 'Cancel'}
            </button>
          )}
          {status === 'connected' && (
            <button
              className={styles.startBtn}
              onClick={() => navigate('/student/mode-select')}
            >
              Start session
            </button>
          )}
        </div>
      </div>
    </CalmZoneTemplate>
  )
}
