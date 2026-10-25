import type { ReactNode } from 'react'
import styles from './QuickActionCard.module.css'
import clsx from 'clsx'

interface QuickActionCardProps {
  icon: ReactNode
  iconBg?: string
  label: string
  sub?: string
  onClick?: () => void
  className?: string
  tourId?: string
}

function QuickActionCard({
  icon,
  iconBg = '#EEEDFE',
  label,
  sub,
  onClick,
  className,
  tourId,
}: QuickActionCardProps) {
  return (
    <button
      data-tour={tourId}
      className={clsx(styles.card, className)}
      onClick={onClick}
      aria-label={sub ? `${label} — ${sub}` : label}
    >
      <div
        className={styles.iconWrap}
        style={{ background: iconBg }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <span className={styles.label}>{label}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </button>
  )
}

export default QuickActionCard
