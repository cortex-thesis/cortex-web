import clsx from 'clsx'
import styles from './StudentFlowerAvatar.module.css'

export const FLOWER_COLORS = ['pink', 'blue', 'yellow', 'green', 'purple'] as const
export type FlowerColor = typeof FLOWER_COLORS[number]
export type FlowerAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface StudentFlowerAvatarProps {
  name: string
  color?: FlowerColor
  size?: FlowerAvatarSize
  showStatus?: boolean
  isOnline?: boolean
  className?: string
}

export default function StudentFlowerAvatar({
  name,
  color = 'pink',
  size = 'md',
  showStatus = false,
  isOnline = false,
  className,
}: StudentFlowerAvatarProps) {
  const flower = (
    <span className={clsx(styles.avatar, styles[size], styles[color], className)} role="img" aria-label={`${name}'s ${color} flower`}>
      <img src={`/assets/profile-flowers/flower-${color}.svg`} alt="" aria-hidden="true" />
    </span>
  )

  if (!showStatus) return flower
  return <span className={styles.wrapper}>{flower}<span className={clsx(styles.statusDot, isOnline ? styles.online : styles.offline)} aria-label={isOnline ? 'Online' : 'Offline'} /></span>
}
