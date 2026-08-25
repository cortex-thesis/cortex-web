import { useState, useEffect, useMemo } from 'react'
import { Music } from 'lucide-react'
import styles from './BreathingGuide.module.css'
import clsx from 'clsx'

type BreathPhase = 'in' | 'hold' | 'out'

interface BreathStep {
  phase: BreathPhase
  label: string
  counts: number
}

const BASE_BREATH_STEPS: BreathStep[] = [
  { phase: 'in', label: 'Breathe in', counts: 4 },
  { phase: 'hold', label: 'Hold', counts: 2 },
  { phase: 'out', label: 'Breathe out', counts: 6 },
]

const SLOW_PACE_MULTIPLIER = 1.5

type BreathingPace = 'normal' | 'slow'

interface BreathingGuideProps {
  audioLabel?: string
  showAudio?: boolean
  pace?: BreathingPace
  onCycleComplete?: () => void
  className?: string
}

function BreathingGuide({
  audioLabel = 'Calming sounds playing softly',
  showAudio = true,
  pace = 'normal',
  onCycleComplete,
  className,
}: BreathingGuideProps) {
  const breathSteps = useMemo(() => {
    if (pace === 'normal') return BASE_BREATH_STEPS
    return BASE_BREATH_STEPS.map((step) => ({
      ...step,
      counts: Math.round(step.counts * SLOW_PACE_MULTIPLIER),
    }))
  }, [pace])

  const [stepIndex, setStepIndex] = useState(0)
  const [count, setCount] = useState(breathSteps[0].counts)

  // If pace changes mid-session (e.g. delivery intensity shifts),
  // restart the count for whichever step is active so it doesn't
  // finish out the old, faster count.
  useEffect(() => {
    const resetId = setTimeout(() => {
      setCount(breathSteps[stepIndex].counts)
    }, 0)

    return () => clearTimeout(resetId)
  }, [breathSteps, stepIndex])

  const currentStep = breathSteps[stepIndex]

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prevCount) => {
        if (prevCount > 1) {
          return prevCount - 1
        }

        // Advance step when countdown reaches zero
        setStepIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % breathSteps.length
          if (nextIndex === 0) {
            onCycleComplete?.()
          }
          return nextIndex
        })

        // Return initial count for the next step
        const nextStepIndex = (stepIndex + 1) % breathSteps.length
        return breathSteps[nextStepIndex].counts
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stepIndex, breathSteps, onCycleComplete])

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div className={styles.circleSection}>
        <div className={styles.circleOuter}>
          <div className={styles.ring1} aria-hidden="true" />
          <div className={styles.ring2} aria-hidden="true" />
          <div
            className={clsx(styles.circle, styles[currentStep.phase])}
            role="status"
            aria-live="polite"
            aria-label={`${currentStep.label}, ${count} counts remaining`}
          >
            <span className={styles.circleLabel}>{currentStep.label}</span>
            <span className={styles.circleCount} aria-hidden="true">
              {count}
            </span>
          </div>
        </div>

        {showAudio && (
          <div className={styles.audioBar}>
            <Music
              size={16}
              strokeWidth={1.75}
              className={styles.audioIcon}
              aria-hidden="true"
            />
            <span className={styles.audioLabel}>{audioLabel}</span>
            <div className={styles.audioWaves} aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={clsx(styles.audioWave, styles[`wave${i}`])}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.steps}>
        {breathSteps.map((step, i) => (
          <div
            key={step.phase}
            className={clsx(styles.step, i === stepIndex && styles.stepActive)}
          >
            <span
              className={clsx(
                styles.stepNum,
                i === stepIndex && styles.stepNumActive
              )}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className={styles.stepInfo}>
              <span
                className={clsx(
                  styles.stepName,
                  i === stepIndex && styles.stepNameActive
                )}
              >
                {step.label}
              </span>
              <span className={styles.stepDur}>{step.counts} counts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BreathingGuide