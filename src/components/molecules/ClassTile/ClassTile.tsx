import styles from './ClassTile.module.css'
import clsx from 'clsx'

interface ClassTileProps {
  name: string
  iconEmoji: string
  iconBg: string
  studentCount?: number
  unreadCount?: number
  onClick?: () => void
  className?: string
}

function ClassTile({
  name,
  iconEmoji,
  iconBg,
  studentCount,
  unreadCount,
  onClick,
  className,
}: ClassTileProps) {
  return (
    <div className={clsx(styles.wrapper, className)}>
      <button
        className={styles.tile}
        onClick={onClick}
        aria-label={`${name}${unreadCount ? `, ${unreadCount} new notifications` : ''}`}
      >
        <div
          className={styles.iconWrap}
          style={{ background: iconBg }}
          aria-hidden="true"
        >
          <span className={styles.iconEmoji}>{iconEmoji}</span>
        </div>
        <span className={styles.name}>{name}</span>
        {studentCount !== undefined && (
          <span className={styles.count}>
            {studentCount} student{studentCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {unreadCount !== undefined && unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )
}

export default ClassTile
