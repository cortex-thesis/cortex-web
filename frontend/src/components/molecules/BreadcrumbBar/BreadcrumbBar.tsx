import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { CognitiveState } from '../../../constants/states'
import { StateBadge, SignalBar } from '../../atoms'
import styles from './BreadcrumbBar.module.css'
import clsx from 'clsx'

type SignalStrength = 0 | 1 | 2 | 3 | 4

interface BreadcrumbBarProps {
  className?: string
  backPath?: string
  onBack?: () => void
  className_name?: string
  state?: CognitiveState | null
  signalStrength?: SignalStrength
  isLive?: boolean
  taskIndex?: number
  taskTotal?: number
}

function BreadcrumbBar({
  className,
  backPath,
  onBack,
  className_name,
  state,
  signalStrength = 0,
  isLive = false,
  taskIndex,
  taskTotal,
}: BreadcrumbBarProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
    } else if (backPath) {
      navigate(backPath)
    } else {
      navigate(-1)
    }
  }

  const showTaskInfo = taskIndex !== undefined && taskTotal !== undefined

  const isOffline = isLive && signalStrength === 0

  return (
    <div
      className={clsx(styles.bar, className)}
      role="navigation"
      aria-label="Session navigation"
    >
      <button
        className={styles.backBtn}
        onClick={handleBack}
        aria-label="Go back"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
      </button>

      {className_name && (
        <span className={styles.className}>{className_name}</span>
      )}

      <div className={styles.spacer} />

      {state && !isOffline && <StateBadge state={state} size="sm" />}

      {isOffline ? (
        <span className={styles.noSignal}>No signal</span>
      ) : (
        <SignalBar strength={signalStrength} size="xs" />
      )}

      <div
        className={clsx(styles.livePill, isOffline && styles.livePillOffline)}
        aria-label={isOffline ? 'EEG offline' : 'EEG live'}
      >
        <span
          className={clsx(
            styles.liveDot,
            isOffline ? styles.liveDotOffline : styles.liveDotActive
          )}
          aria-hidden="true"
        />
        <span>{isOffline ? 'Offline' : 'Live'}</span>
      </div>

      {showTaskInfo && !isOffline && (
        <div className={styles.taskProgress} aria-live="polite">
          <span className={styles.taskInfo}>Step {taskIndex} of {taskTotal}</span>
          <div className={styles.progressTrack} role="progressbar" aria-label="Lesson progress" aria-valuemin={1} aria-valuemax={taskTotal} aria-valuenow={taskIndex}>
            <span className={styles.progressFill} style={{ width: `${Math.min(100, (taskIndex / taskTotal) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default BreadcrumbBar
