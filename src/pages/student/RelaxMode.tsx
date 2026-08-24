import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionTemplate } from '../../components/templates'
import { BreathingGuide, AlertBanner } from '../../components/molecules'
import { useEEG } from '../../hooks/useEEG'
import { getDeliveryConfig, getDeliveryMode } from '../../constants/delivery'
import styles from './RelaxMode.module.css'

export default function RelaxMode() {
  const navigate = useNavigate()
  const { eegData, connectionStatus } = useEEG('session-001')

  const isLive = connectionStatus === 'connected'
  const signalStrength = eegData.signalStrength ?? 0
  const currentState = eegData.state ?? 'relaxed'

  // 'relaxed' -> normal, 'overstimulated' -> elevated. Same config
  // source FocusMode reads from — see constants/delivery.ts.
  const deliveryConfig = getDeliveryConfig(currentState)
  const isElevated = deliveryConfig.intensity === 'elevated'

  // Previously this only checked for the literal 'focused' state. If
  // the EEG classified the student as 'distracted' instead, nothing
  // happened — even though distracted belongs to Focus Mode just as
  // much as focused does. Reading the mode from the config instead of
  // comparing against a single hardcoded state covers both.
  useEffect(() => {
    if (getDeliveryMode(eegData.state) === 'focus') {
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
        {isElevated
          ? "Let's slow things down. Calming sounds are playing."
          : 'Calming sounds playing softly. Take your time.'}
      </span>
    </div>
  )

  return (
    <SessionTemplate
      className_name="Life Skills"
      state={currentState}
      signalStrength={signalStrength}
      isLive={isLive}
      onBack={() => navigate('/student/home')}
      footer={footer}
    >
      <div className={styles.content}>
        {isElevated && (
          <AlertBanner
            variant="info"
            message="Noticed things feel like a lot right now — easing off the pace."
            className={styles.alert}
          />
        )}

        <BreathingGuide
          showAudio
          audioLabel="Calming sounds playing softly"
          pace={isElevated ? 'slow' : 'normal'}
          onCycleComplete={() => {
            console.log('Breathing cycle complete')
          }}
        />
      </div>
    </SessionTemplate>
  )
}
