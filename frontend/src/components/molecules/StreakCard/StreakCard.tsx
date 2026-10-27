import IllustrationIcon from '../../atoms/IllustrationIcon'
import { getFocusPerformance } from '../../../lib/focusPerformance'
import styles from './StreakCard.module.css'
import clsx from 'clsx'

interface StreakCardProps {
  label?: string
  score: number
  className?: string
}

function StreakCard({ score, className, label = "Today's performance" }: StreakCardProps) {
  const { icon, phrase } = getFocusPerformance(score)

  return (
    <div
      className={clsx(styles.card, className)}
      aria-label={`${label}: ${phrase}`}
    >
      <div className={styles.icon} aria-hidden="true">
        <IllustrationIcon name={icon} size={32} />
      </div>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.phrase}>{phrase}</span>
      </div>
    </div>
  )
}

export default StreakCard
