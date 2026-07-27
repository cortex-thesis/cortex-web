import styles from './Divider.module.css'
import clsx from 'clsx'

interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  label?: string
  className?: string
}

function Divider({
  orientation = 'horizontal',
  label,
  className,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <span
        className={clsx(styles.vertical, className)}
        role="separator"
        aria-orientation="vertical"
      />
    )
  }

  if (label) {
    return (
      <div className={clsx(styles.labelWrapper, className)} role="separator">
        <span className={styles.line} />
        <span className={styles.label}>{label}</span>
        <span className={styles.line} />
      </div>
    )
  }

  return (
    <hr className={clsx(styles.horizontal, className)} aria-hidden="true" />
  )
}

export default Divider
