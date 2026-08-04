import styles from './StreakCard.module.css'
import clsx from 'clsx'

interface StreakCardProps {
  count: number
  className?: string
}

function getStreakMeta(count: number): {
  icon: string
  sub: string
  subColor: string
} {
  if (count === 0)
    return { icon: '💤', sub: 'Start today!', subColor: '#5F5E5A' }
  if (count >= 30)
    return { icon: '🔥', sub: 'Amazing! 🎉', subColor: '#D4537E' }
  if (count >= 14) return { icon: '🔥', sub: 'On fire!', subColor: '#D4537E' }
  if (count >= 7) return { icon: '🔥', sub: 'Keep it up!', subColor: '#993556' }
  return { icon: '🔥', sub: 'Good start!', subColor: '#993556' }
}

function StreakCard({ count, className }: StreakCardProps) {
  const { icon, sub, subColor } = getStreakMeta(count)
  const isEmpty = count === 0

  return (
    <div
      className={clsx(styles.card, isEmpty && styles.empty, className)}
      aria-label={`${count} day streak`}
    >
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.info}>
        <span
          className={styles.count}
          style={{ color: isEmpty ? '#5F5E5A' : '#D4537E' }}
        >
          {count}
        </span>
        <span
          className={styles.label}
          style={{ color: isEmpty ? '#5F5E5A' : '#993556' }}
        >
          Day streak
        </span>
        <span className={styles.sub} style={{ color: subColor }}>
          {sub}
        </span>
      </div>
    </div>
  )
}

export default StreakCard
