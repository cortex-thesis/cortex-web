import { Flame, Moon } from 'lucide-react'
import styles from './StreakCard.module.css'
import clsx from 'clsx'

interface StreakCardProps {
  count: number
  className?: string
}

function getStreakMeta(count: number): {
  icon: React.ReactNode
  sub: string
  subColor: string
} {
  if (count === 0)
    return {
      icon: <Moon size={28} color="#5F5E5A" />,
      sub: 'Start today!',
      subColor: '#5F5E5A',
    }
  if (count >= 30)
    return {
      icon: <Flame size={28} color="#D4537E" />,
      sub: 'Amazing!',
      subColor: '#D4537E',
    }
  if (count >= 14)
    return {
      icon: <Flame size={28} color="#D4537E" />,
      sub: 'On fire!',
      subColor: '#D4537E',
    }
  if (count >= 7)
    return {
      icon: <Flame size={28} color="#D4537E" />,
      sub: 'Keep it up!',
      subColor: '#993556',
    }
  return {
    icon: <Flame size={28} color="#D4537E" />,
    sub: 'Good start!',
    subColor: '#993556',
  }
}

function StreakCard({ count, className }: StreakCardProps) {
  const { icon, sub, subColor } = getStreakMeta(count)
  const isEmpty = count === 0

  return (
    <div
      className={clsx(styles.card, isEmpty && styles.empty, className)}
      aria-label={`${count} day streak`}
    >
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
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
