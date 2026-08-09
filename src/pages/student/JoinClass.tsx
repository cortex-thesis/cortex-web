import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CodeInput, AlertBanner } from '../../components/molecules'
import styles from './JoinClass.module.css'

type JoinStatus = 'idle' | 'loading' | 'error' | 'success'

// Mock valid codes — replace with real API call
const VALID_CODES: Record<string, { className: string; emoji: string }> = {
  K79F: { className: 'Life Skills', emoji: '🍳' },
  B3PQ: { className: 'Self Care', emoji: '🤲' },
}

export default function JoinClass() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<JoinStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [foundClass, setFoundClass] = useState<{
    className: string
    emoji: string
  } | null>(null)

  async function handleComplete(value: string) {
    setStatus('loading')
    setErrorMsg('')

    // Simulate API call — replace with real call when backend ready
    await new Promise((r) => setTimeout(r, 800))

    const match = VALID_CODES[value.toUpperCase()]
    if (match) {
      setFoundClass(match)
      setStatus('success')
      setTimeout(() => {
        navigate('/student/eeg-pairing')
      }, 1500)
    } else {
      setStatus('error')
      setErrorMsg('Class code not found. Please check with your teacher.')
      setCode('')
    }
  }

  function handleChange(value: string) {
    setCode(value)
    if (status === 'error') setStatus('idle')
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <h1 className={styles.title}>Join a class</h1>
      </div>

      <div className={styles.content}>
        <span className={styles.emoji} aria-hidden="true">
          🎓
        </span>

        <div className={styles.textBlock}>
          <h2 className={styles.heading}>Enter your class code</h2>
          <p className={styles.sub}>
            Type the 4-character code your teacher gave you
          </p>
        </div>

        {status === 'error' && (
          <AlertBanner
            variant="error"
            message={errorMsg}
            className={styles.alert}
          />
        )}

        {status === 'success' && foundClass && (
          <AlertBanner
            variant="success"
            title={`Joining ${foundClass.emoji} ${foundClass.className}`}
            message="Taking you to your session..."
            className={styles.alert}
          />
        )}

        <CodeInput
          value={code}
          onChange={handleChange}
          onComplete={handleComplete}
          fieldState={
            status === 'error'
              ? 'error'
              : status === 'success'
                ? 'success'
                : 'default'
          }
          errorText={errorMsg}
          successText={
            foundClass
              ? `Joining ${foundClass.emoji} ${foundClass.className}...`
              : undefined
          }
          hint="Enter the code your teacher gave you"
          disabled={status === 'loading' || status === 'success'}
        />

        {status === 'loading' && (
          <p className={styles.loadingText}>Looking up your class...</p>
        )}

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine} />
        </div>

        <button
          className={styles.qrBtn}
          onClick={() => console.log('QR scan — coming soon')}
          aria-label="Scan QR code"
        >
          <QrCode size={16} strokeWidth={1.75} />
          Scan QR code
        </button>

        <p className={styles.hint}>
          Try code <strong>K79F</strong> or <strong>B3PQ</strong> to test
        </p>
      </div>
    </PlayfulZoneTemplate>
  )
}
