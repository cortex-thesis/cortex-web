import styles from './Dot.module.css'
import clsx from 'clsx'

type DotSize = 'xs' | 'sm' | 'md' | 'lg'
type DotColor =
  | 'active'
  | 'inactive'
  | 'focused'
  | 'relaxed'
  | 'distracted'
  | 'overstimulated'
  | 'online'
  | 'offline'

interface DotProps {
  size?: DotSize
  color?: DotColor
  className?: string
}

function Dot({ size = 'sm', color = 'active', className }: DotProps) {
  return (
    <span
      className={clsx(styles.dot, styles[size], styles[color], className)}
      aria-hidden="true"
    />
  )
}

export default Dot
