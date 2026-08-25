import styles from './SignalBar.module.css'
import clsx from 'clsx'

type SignalStrength = 0 | 1 | 2 | 3 | 4
type SignalBarSize = 'xs' | 'sm' | 'md'

interface SignalBarProps {
  strength: SignalStrength
  size?: SignalBarSize
  className?: string
}

const STRENGTH_LABELS: Record<SignalStrength, string> = {
  0: 'No signal',
  1: 'Weak signal',
  2: 'Fair signal',
  3: 'Good signal',
  4: 'Strong signal',
}

function SignalBar({ strength, size = 'sm', className }: SignalBarProps) {
  return (
    <div
      className={clsx(styles.signal, styles[size], className)}
      role="img"
      aria-label={STRENGTH_LABELS[strength]}
    >
      {[1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className={clsx(
            styles.bar,
            styles[`bar${level}`],
            level <= strength ? styles.active : styles.inactive
          )}
        />
      ))}
    </div>
  )
}

export default SignalBar
