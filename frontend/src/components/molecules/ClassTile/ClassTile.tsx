import styles from './ClassTile.module.css'
import clsx from 'clsx'
import { School } from 'lucide-react'

interface ClassTileProps {
  name: string
  illustrationSrc?: string
  studentCount?: number
  unreadCount?: number
  onClick?: () => void
  className?: string
}

function ClassTile({
  name,
  illustrationSrc,
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
        <div className={styles.iconWrap} aria-hidden="true">
          {illustrationSrc ? <img className={styles.illustration} src={illustrationSrc} alt="" /> : <School size={22} strokeWidth={1.75} />}
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
