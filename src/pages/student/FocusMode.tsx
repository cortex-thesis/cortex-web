import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionTemplate } from '../../components/templates'
import { TaskCard, AlertBanner } from '../../components/molecules'
import { useEEG } from '../../hooks/useEEG'
import { getDeliveryConfig, getDeliveryMode } from '../../constants/delivery'

// Note: Un-comment useSession if/when needed in your page logic
// import { useSession } from '../../hooks/useSession'

import { mockTask } from '../../mocks'
import type { CognitiveState } from '../../constants/states'
import type { Task } from '../../types'
import styles from './FocusMode.module.css'

const NUDGE_MESSAGES = [
  'Focus music playing softly. Keep going!',
  "You're doing great. Stay with it!",
  'Almost there. Take your time.',
  'Great effort. Keep it up!',
]

export function FocusMode() {
  const navigate = useNavigate()

  // In dev — use mock data. Replace with real API call later.
  const [task, setTask] = useState<Task>(mockTask)
  const [nudgeIndex, setNudgeIndex] = useState(0)
  const [showModeAlert, setShowModeAlert] = useState(false)

  // EEG hook - reads from mock stream in dev, real WebSocket in prod
  const { eegData, connectionStatus } = useEEG('session-001')

  const currentState: CognitiveState = eegData.state ?? 'focused'
  const isLive = connectionStatus === 'connected'
  const signalStrength = eegData.signalStrength ?? 0

  const deliveryConfig = getDeliveryConfig(currentState)
  const isElevated = deliveryConfig.intensity === 'elevated'

  useEffect(() => {
    const id = setInterval(() => {
      setNudgeIndex((i) => (i + 1) % NUDGE_MESSAGES.length)
    }, deliveryConfig.nudgeIntervalMs)
    return () => clearInterval(id)
  }, [deliveryConfig.nudgeIntervalMs])

  // Show a re-engagement banner while distracted
  useEffect(() => {
    if (currentState === 'distracted') {
      const showId = setTimeout(() => setShowModeAlert(true), 0)
      const hideId = setTimeout(() => setShowModeAlert(false), 3000)

      return () => {
        clearTimeout(showId)
        clearTimeout(hideId)
      }
    }
  }, [currentState])

  useEffect(() => {
    if (getDeliveryMode(eegData.state) === 'relax') {
      const id = setTimeout(() => {
        navigate('/student/switching', {
          state: { from: 'focus', to: 'relax' },
        })
      }, 5000)
      return () => clearTimeout(id)
    }
  }, [eegData.state, navigate])

  function handleAnswered(correct: boolean) {
    if (correct && task.index < task.total) {
      // Advance to next task
      setTimeout(() => {
        setTask((prev) => ({ ...prev, index: prev.index + 1 }))
      }, 1200)
    } else if (correct && task.index === task.total) {
      navigate('/student/session-summary')
    }
  }

  const nudgeFooter = isElevated ? undefined : (
    <div className={styles.nudge}>
      <span className={styles.nudgeDot} aria-hidden="true" />
      <span className={styles.nudgeText}>{NUDGE_MESSAGES[nudgeIndex]}</span>
    </div>
  )

  return (
    <SessionTemplate
      className_name="Life Skills"
      state={currentState}
      signalStrength={signalStrength}
      isLive={isLive}
      taskIndex={task.index}
      taskTotal={task.total}
      onBack={() => navigate('/student/home')}
      footer={nudgeFooter}
    >
      {showModeAlert && currentState === 'distracted' && isElevated && (
        <AlertBanner
          variant="warning"
          message="Your focus seems to be drifting. Adjusting content..."
          className={styles.alert}
        />
      )}

      <TaskCard
        task={task}
        showNudge={isElevated}
        nudgeText={NUDGE_MESSAGES[nudgeIndex]}
        onAnswered={handleAnswered}
        className={styles.taskCard}
      />
    </SessionTemplate>
  )
}
