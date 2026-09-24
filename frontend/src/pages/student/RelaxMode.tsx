import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionTemplate } from '../../components/templates'
import { BreathingGuide, AlertBanner } from '../../components/molecules'
import { useEEG } from '../../hooks/useEEG'
import { getDeliveryConfig, getDeliveryMode } from '../../constants/delivery'
import DevEEGPanel from '../../components/dev/DevEEGPanel/DevEEGPanel'
import styles from './RelaxMode.module.css'
import ModeBgm from '../../components/molecules/ModeBgm/ModeBgm'

export default function RelaxMode() {
  const navigate = useNavigate()
  const {
    eegData,
    connectionStatus,
    isManualOverride,
    setMockState,
    resumeAutoCycle,
  } = useEEG('session-001')

  const isLive = connectionStatus === 'connected'
  const signalStrength = eegData.signalStrength ?? 0
  const currentState = eegData.state ?? 'relaxed'

  // Relax Mode is reserved for sensory cooldown during overstimulation.
  // Once the classifier reports a non-overstimulated state, the learner
  // returns through the gentle Focus-mode re-entry path.
  const deliveryConfig = getDeliveryConfig(currentState)
  const isElevated = deliveryConfig.strategy === 'sensory_cooldown'

  // All non-overstimulated states route back to instructional delivery.
  useEffect(() => {
    if (eegData.state && getDeliveryMode(eegData.state) === 'focus') {
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
      <ModeBgm mode="relax" />
    </div>
  )

  return (
    <>
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
              message="Let’s pause and take one slow breath at a time."
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
      <DevEEGPanel
        currentState={eegData.state}
        isManualOverride={isManualOverride}
        onSetState={setMockState}
        onResumeAuto={resumeAutoCycle}
      />
    </>
  )
}
