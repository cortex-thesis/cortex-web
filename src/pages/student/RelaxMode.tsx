import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionTemplate } from '../../components/templates'
import { BreathingGuide } from '../../components/molecules'
import { useEEG } from '../../hooks/useEEG'
import styles from './RelaxMode.module.css'

export default function RelaxMode() {
  const navigate = useNavigate()
  const { eegData, connectionStatus } = useEEG('session-001')

  const isLive = connectionStatus === 'connected'
  const signalStrength = eegData.signalStrength ?? 0

  // If EEG detects student has returned to focused state,
  // transition back to Focus Mode after a grace period
  useEffect(() => {
    if (eegData.state === 'focused') {
      const id = setTimeout(() => {
        navigate('/student/switching', {
          state: { from: 'relax', to: 'focus' },
        })
      }, 5000)
      return () => clearTimeout(id)
    }
  }, [eegData.state, navigate])

  const footer = (
    <div className={styles.footer}>
      <span className={styles.footerDot} aria-hidden="true" />
      <span className={styles.footerText}>
        Calming sounds playing softly. Take your time.
      </span>
    </div>
  )

  return (
    <SessionTemplate
      className_name="Life Skills"
      state="relaxed"
      signalStrength={signalStrength}
      isLive={isLive}
      onBack={() => navigate('/student/home')}
      footer={footer}
    >
      <div className={styles.content}>
        <BreathingGuide
          showAudio
          audioLabel="Calming sounds playing softly"
          onCycleComplete={() => {
            console.log('Breathing cycle complete')
          }}
        />
      </div>
    </SessionTemplate>
  )
}
