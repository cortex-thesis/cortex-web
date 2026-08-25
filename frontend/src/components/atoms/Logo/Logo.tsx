import styles from './Logo.module.css'
import clsx from 'clsx'
import logoHorizontal from '../../../assets/images/logo-horizontal.png'
import logoIcon from '../../../assets/images/logo-icon.png'

type LogoVariant = 'horizontal' | 'icon'

interface LogoProps {
  variant?: LogoVariant
  height?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

function Logo({
  variant = 'horizontal',
  height = 36,
  size,
  className,
  onClick,
}: LogoProps) {
  const resolvedHeight = size ? { sm: 32, md: 36, lg: 44 }[size] : height
  const src = variant === 'horizontal' ? logoHorizontal : logoIcon
  const alt = variant === 'horizontal' ? 'Cortex' : 'Cortex logo'

  if (onClick) {
    return (
      <button
        className={clsx(styles.btn, className)}
        onClick={onClick}
        aria-label="Go to home"
      >
        <img
          src={src}
          alt={alt}
          height={resolvedHeight}
          className={styles.img}
          draggable={false}
        />
      </button>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      height={resolvedHeight}
      className={clsx(styles.img, className)}
      draggable={false}
    />
  )
}

export default Logo
