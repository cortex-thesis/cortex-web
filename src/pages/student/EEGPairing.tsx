import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  Wifi,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
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
  icon: LucideIcon
}

const STATUS_CONTENT: Record<PairingStatus, StatusConfig> = {
  scanning: {
    title: 'Looking for your headband',
    sub: 'Make sure your Muse headband is powered on and resting comfortably on your head.',
    pulseColor: 'purple',
    pulseActive: true,
    icon: Search,
  },
  found: {
    title: 'Headband found!',
    sub: 'Connecting to your Muse headband. Stay still for a moment.',
    pulseColor: 'teal',
    pulseActive: true,
    icon: Wifi,
  },
  connecting: {
    title: 'Connecting...',
    sub: 'Establishing a secure connection with your headband.',
    pulseColor: 'teal',
    pulseActive: true,
    icon: Wifi,
  },
  connected: {
    title: 'Connected!',
    sub: 'Great signal! Your headband is reading your brainwaves. Ready to start.',
    pulseColor: 'teal',
    pulseActive: false,
    icon: CheckCircle2,
  },
  error: {
    title: 'Could not connect',
    sub: 'We had trouble finding your headband. Try the steps below and try again.',
    pulseColor: 'purple',
    pulseActive: false,
    icon: AlertCircle,
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

const TIPS = [
  'Make sure Bluetooth is turned on',
  'Press the power button on your headband until the light blinks',
  'Place the headband with the sensors touching your forehead',
  'Move away from other Bluetooth devices if the connection fails',
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
  const StatusIcon = content.icon

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
        <div className={styles.pairingSection}>
          <PulseRing
            size="lg"
            color={content.pulseColor}
            active={content.pulseActive}
          />

          <div className={styles.textBlock}>
            <h1 className={styles.title}>
              {content.title}
              {status === 'connected' && (
                <StatusIcon
                  className={styles.successIcon}
                  size={22}
                  aria-hidden="true"
                />
              )}
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
        </div>

        {status === 'error' && (
          <AlertBanner
            variant="error"
            title="Connection failed"
            message="We could not detect your headband. Make sure it is powered on and Bluetooth is enabled."
            className={styles.errorBanner}
          />
        )}

        {(status === 'scanning' || status === 'error') && (
          <ul className={styles.tips} aria-label="Connection tips">
            {TIPS.map((tip, i) => (
              <li key={i} className={styles.tip}>
                <span className={styles.tipDot} aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        )}

        {status === 'connected' && (
          <div className={styles.successMsg}>
            Redirecting to your session...
          </div>
        )}

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
