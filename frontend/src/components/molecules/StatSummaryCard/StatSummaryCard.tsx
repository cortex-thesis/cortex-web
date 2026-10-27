import type { ReactNode } from 'react'
import styles from './StatSummaryCard.module.css'
import clsx from 'clsx'

interface StatSummaryCardProps {
  value: ReactNode
  label: string
  icon: ReactNode
  iconBg?: string
  sub?: string
  subColor?: string
  className?: string
}

function StatSummaryCard({
  value,
  label,
  icon,
  iconBg = 'var(--flower-purple-fill)',
  sub,
  subColor = 'var(--color-teal)',
  className,
}: StatSummaryCardProps) {
  return (
    <div className={clsx(styles.card, className)}>
      <div
        className={styles.iconWrap}
        style={{ background: iconBg }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className={styles.info}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
        {sub && (
          <span className={styles.sub} style={{ color: subColor }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

export default StatSummaryCard
