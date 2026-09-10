import styles from './StreakCard.module.css'
import clsx from 'clsx'

interface StreakCardProps {
  label?: string
  score: number
  className?: string
}

function getPerformance(score: number): { emoji: string; phrase: string } {
  if (score >= 80) return { emoji: '🌟', phrase: 'Excellent focus' }
  if (score >= 70) return { emoji: '💪', phrase: 'Steady focus' }
  if (score >= 60) return { emoji: '🌱', phrase: 'Growing focus' }
  return { emoji: '✨', phrase: 'Finding your rhythm' }
}

function StreakCard({ score, className, label = "Today's performance" }: StreakCardProps) {
  const { emoji, phrase } = getPerformance(score)

  return (
    <div
      className={clsx(styles.card, className)}
      aria-label={`${label}: ${phrase}`}
    >
      <div className={styles.icon} aria-hidden="true">
        {emoji}
      </div>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.phrase}>{phrase}</span>
      </div>
    </div>
  )
}

export default StreakCard
