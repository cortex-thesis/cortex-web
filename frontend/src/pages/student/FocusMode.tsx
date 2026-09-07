import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionTemplate } from '../../components/templates'
import { TaskCard, AlertBanner } from '../../components/molecules'
import { useEEG } from '../../hooks/useEEG'
import DevEEGPanel from '../../components/dev/DevEEGPanel/DevEEGPanel'
import { getDeliveryConfig, getDeliveryMode } from '../../constants/delivery'
import { ACTIVITY_TEMPLATE_BY_ID, TASK_TEMPLATE_BY_ID } from '../../constants/activityTemplates'

// Note: Un-comment useSession if/when needed in your page logic
// import { useSession } from '../../hooks/useSession'

import { mockCareLessons, mockTasks } from '../../mocks'
import type { CognitiveState } from '../../constants/states'
import styles from './FocusMode.module.css'

const NUDGE_MESSAGES = [
  'Focus music playing softly. Keep going!',
  "You're doing great. Stay with it!",
  'Almost there. Take your time.',
  'Great effort. Keep it up!',
]

interface FocusModeProps {
  preview?: boolean
}

export function FocusMode({ preview = false }: FocusModeProps) {
  const navigate = useNavigate()

  // In dev — use mock data. Replace with real API call later.
  const [taskPosition, setTaskPosition] = useState(0)
  const [previewLessonIndex, setPreviewLessonIndex] = useState(0)
  const [nudgeIndex, setNudgeIndex] = useState(0)
  const [showModeAlert, setShowModeAlert] = useState(false)

  // EEG hook - reads from mock stream in dev, real WebSocket in prod
  const {
    eegData,
    connectionStatus,
    isManualOverride,
    setMockState,
    resumeAutoCycle,
  } = useEEG('session-001')

  const currentState: CognitiveState = preview ? 'focused' : (eegData.state ?? 'focused')
  const isLive = connectionStatus === 'connected'
  const signalStrength = eegData.signalStrength ?? 0

  // How hard Focus Mode should lean into its adaptations right now.
  // 'focused' -> normal, 'distracted' -> elevated. Nothing here reads
  // the raw state string directly — it all comes from the config, so
  // tuning nudge frequency or adding a new adaptation is a one-file
  // change in constants/delivery.ts, not a page-by-page edit.
  const deliveryConfig = getDeliveryConfig(currentState)
  const isElevated = deliveryConfig.intensity === 'elevated'
  const isRegulating = deliveryConfig.strategy === 'sensory_cooldown'
  const previewTasks = mockCareLessons[previewLessonIndex].tasks
  const activeTasks: readonly typeof mockTasks[number][] = preview ? previewTasks : mockTasks
  const safeTaskPosition = Math.min(taskPosition, activeTasks.length - 1)
  const task = {
    ...activeTasks[safeTaskPosition],
    index: taskPosition + 1,
    total: activeTasks.length,
  }
  const deliveredTask = {
    ...task,
    ...(deliveryConfig.strategy === 'attention_reengagement' || deliveryConfig.strategy === 'gentle_reactivation'
      ? task.deliveryVariants?.[deliveryConfig.strategy]
      : undefined),
  }

  // Rotate nudge messages — interval speeds up under elevated
  // intensity (distracted) instead of staying fixed at 30s.
  useEffect(() => {
    const id = setInterval(() => {
      setNudgeIndex((i) => (i + 1) % NUDGE_MESSAGES.length)
    }, deliveryConfig.nudgeIntervalMs)
    return () => clearInterval(id)
  }, [deliveryConfig.nudgeIntervalMs])

  // Show a re-engagement banner while distracted (elevated intensity,
  // still in Focus Mode). This does NOT cover overstimulated — that
  // state belongs to Relax Mode, and is handled by the effect below
  // instead of a banner.
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
    if (!preview && getDeliveryMode(eegData.state) === 'relax') {
      const id = setTimeout(() => {
        navigate('/student/switching', {
          state: { from: 'focus', to: 'relax' },
        })
      }, 300)
      return () => clearTimeout(id)
    }
  }, [eegData.state, navigate, preview])

  function handleAnswered(correct: boolean) {
    if (correct && taskPosition < activeTasks.length - 1) {
      // Advance to next task
      setTimeout(() => {
        setTaskPosition((position) => position + 1)
      }, 1200)
    } else if (correct) {
      navigate('/student/session-summary')
    }
  }

  // Under normal intensity, the nudge lives quietly in the footer.
  // Under elevated intensity (distracted), TaskCard shows it inline
  // instead — closer to the content, more likely to land — so the
  // footer version is suppressed rather than duplicated.
  const nudgeFooter = isElevated ? undefined : (
    <div className={styles.nudge}>
      <span className={styles.nudgeDot} aria-hidden="true" />
      <span className={styles.nudgeText}>{NUDGE_MESSAGES[nudgeIndex]}</span>
    </div>
  )

  return (
    <>
      <SessionTemplate
        className_name={preview ? `${mockCareLessons[previewLessonIndex].id} · ${mockCareLessons[previewLessonIndex].title}` : 'Life Skills'}
        state={currentState}
        signalStrength={signalStrength}
        isLive={isLive}
        taskIndex={task.index}
        taskTotal={task.total}
        onBack={() => navigate(preview ? '/' : '/student/home', { replace: true })}
        footer={nudgeFooter}
      >
        {showModeAlert && currentState === 'distracted' && isElevated && (
          <AlertBanner
            variant="warning"
            message="Your focus seems to be drifting. Adjusting content..."
            className={styles.alert}
          />
        )}

        {import.meta.env.DEV && (
          <div className={styles.prototypeNav} aria-label="Prototype content preview">
            <span>Lesson</span>
            {mockCareLessons.map((lesson, index) => (
              <button key={lesson.id} className={index === previewLessonIndex ? styles.prototypeActive : ''} onClick={() => { setPreviewLessonIndex(index); setTaskPosition(0) }}>
                {lesson.id}
              </button>
            ))}
            <span>Screen</span>
            {activeTasks.map((item, index) => (
              <button key={item.id} className={index === taskPosition ? styles.prototypeActive : ''} onClick={() => setTaskPosition(index)}>
                {item.taskTemplate ? TASK_TEMPLATE_BY_ID[item.taskTemplate].label : ACTIVITY_TEMPLATE_BY_ID[item.template ?? 'multiple_choice'].label}
              </button>
            ))}
          </div>
        )}

        {!isRegulating && (
          <TaskCard
            key={`${task.id}-${deliveryConfig.strategy}`}
            task={deliveredTask}
            deliveryStrategy={deliveryConfig.strategy}
            showNudge={isElevated}
            nudgeText={NUDGE_MESSAGES[nudgeIndex]}
            onAnswered={handleAnswered}
            className={styles.taskCard}
          />
        )}
      </SessionTemplate>
      {!preview && (
        <DevEEGPanel
          currentState={eegData.state}
          isManualOverride={isManualOverride}
          onSetState={setMockState}
          onResumeAuto={resumeAutoCycle}
        />
      )}
    </>
  )
}
