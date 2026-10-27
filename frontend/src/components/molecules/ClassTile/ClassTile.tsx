import IllustrationIcon from '../../atoms/IllustrationIcon'
import styles from './ClassTile.module.css'
import clsx from 'clsx'

interface ClassTileProps {
  name: string
  illustrationSrc?: string
  layout?: 'vertical' | 'horizontal'
  studentCount?: number
  unreadCount?: number
  onClick?: () => void
  className?: string
}

function ClassTile({
  name,
  illustrationSrc,
  layout = 'vertical',
  studentCount,
  unreadCount,
  onClick,
  className,
}: ClassTileProps) {
  return (
    <div className={clsx(styles.wrapper, className)}>
      <button
        className={clsx(styles.tile, layout === 'horizontal' && styles.horizontal)}
        onClick={onClick}
        aria-label={`${name}${unreadCount ? `, ${unreadCount} new notifications` : ''}`}
      >
        <div className={styles.iconWrap} aria-hidden="true">
          {illustrationSrc ? <img className={styles.illustration} src={illustrationSrc} alt="" /> : <IllustrationIcon name="school-building" size={28} />}
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
