import styles from './Avatar.module.css'
import clsx from 'clsx'

type AvatarColor = 'purple' | 'teal' | 'coral' | 'amber' | 'blue'
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: AvatarSize
  color?: AvatarColor
  showStatus?: boolean
  isOnline?: boolean
  className?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getColorFromName(name: string): AvatarColor {
  const colors: AvatarColor[] = ['purple', 'teal', 'coral', 'amber', 'blue']
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

function Avatar({
  name,
  imageUrl,
  size = 'md',
  color,
  showStatus = false,
  isOnline = false,
  className,
}: AvatarProps) {
  const resolvedColor = color ?? getColorFromName(name)
  const initials = getInitials(name)

  const avatarEl = (
    <div
      className={clsx(
        styles.avatar,
        styles[size],
        !imageUrl && styles[resolvedColor],
        className
      )}
      aria-label={name}
      role="img"
    >
      {imageUrl ? <img src={imageUrl} alt={name} /> : <span>{initials}</span>}
    </div>
  )

  if (!showStatus) return avatarEl

  return (
    <div className={styles.wrapper}>
      {avatarEl}
      <span
        className={clsx(
          styles.statusDot,
          isOnline ? styles.online : styles.offline
        )}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  )
}

export default Avatar
