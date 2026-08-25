import {
  COGNITIVE_STATES,
  type CognitiveState,
} from '../../../constants/states'
import styles from './StateBadge.module.css'
import clsx from 'clsx'

interface StateBadgeProps {
  state: CognitiveState
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function StateBadge({ state, size = 'md', className }: StateBadgeProps) {
  const config = COGNITIVE_STATES[state]

  return (
    <span
      className={clsx(styles.badge, styles[size], className)}
      style={{
        backgroundColor: config.fill,
        color: config.textColor,
      }}
    >
      <span
        className={styles.dot}
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  )
}

export default StateBadge
