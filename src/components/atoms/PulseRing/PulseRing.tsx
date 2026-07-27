import styles from './PulseRing.module.css'
import clsx from 'clsx'

type PulseRingSize = 'sm' | 'md' | 'lg'
type PulseRingColor = 'teal' | 'purple'

interface PulseRingProps {
  active?: boolean
  size?: PulseRingSize
  color?: PulseRingColor
  className?: string
}

function PulseRing({
  active = true,
  size = 'md',
  color = 'teal',
  className,
}: PulseRingProps) {
  return (
    <div
      className={clsx(styles.wrapper, styles[size], className)}
      role="status"
      aria-label={active ? 'Connecting to EEG headset' : 'Not connected'}
    >
      {active && (
        <>
          <span className={clsx(styles.ring, styles.ring1, styles[color])} />
          <span className={clsx(styles.ring, styles.ring2, styles[color])} />
          <span className={clsx(styles.ring, styles.ring3, styles[color])} />
        </>
      )}
      <span
        className={clsx(styles.core, active ? styles[color] : styles.inactive)}
      />
    </div>
  )
}

export default PulseRing
