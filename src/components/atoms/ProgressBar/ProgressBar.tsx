import type { CognitiveState } from '../../../constants/states'
import { COGNITIVE_STATES } from '../../../constants/states'
import styles from './ProgressBar.module.css'
import clsx from 'clsx'

type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg'
type ProgressBarColor = 'state' | 'purple' | 'coral' | string

interface ProgressBarProps {
  value: number
  size?: ProgressBarSize
  state?: CognitiveState
  color?: ProgressBarColor
  showLabel?: boolean
  className?: string
  ariaLabel?: string
}

function resolveColor(
  state?: CognitiveState,
  color?: ProgressBarColor
): string {
  if (state) return COGNITIVE_STATES[state].color
  if (color === 'purple') return '#534AB7'
  if (color === 'coral') return '#D4537E'
  if (color) return color
  return '#534AB7'
}

function ProgressBar({
  value,
  size = 'sm',
  state,
  color,
  showLabel = false,
  className,
  ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const fillColor = resolveColor(state, color)

  return (
    <div
      className={clsx(styles.wrapper, className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `Progress: ${clamped}%`}
    >
      <div className={clsx(styles.track, styles[size])}>
        <div
          className={clsx(styles.fill, styles[size])}
          style={{
            width: `${clamped}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      {showLabel && (
        <span className={styles.label}>{Math.round(clamped)}%</span>
      )}
    </div>
  )
}

export default ProgressBar
