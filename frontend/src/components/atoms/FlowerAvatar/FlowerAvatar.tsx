import clsx from 'clsx'
import styles from './FlowerAvatar.module.css'

export type FlowerAvatarColor = 'pink' | 'blue' | 'purple' | 'yellow' | 'green'

interface FlowerAvatarProps { color?: FlowerAvatarColor; size?: 'sm' | 'md' | 'lg'; className?: string }

export default function FlowerAvatar({ color = 'pink', size = 'md', className }: FlowerAvatarProps) {
  return <span className={clsx(styles.avatar, styles[color], styles[size], className)} role="img" aria-label={`${color} Cortex flower`}><img src={`/assets/profile-flowers/flower-${color}.svg`} alt="" aria-hidden="true" /></span>
}
