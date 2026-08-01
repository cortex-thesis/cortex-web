import styles from './Logo.module.css'
import clsx from 'clsx'
import logoHorizontal from '../../../assets/images/logo-horizontal.png'
import logoIcon from '../../../assets/images/logo-icon.png'

type LogoVariant = 'horizontal' | 'icon'

interface LogoProps {
  variant?: LogoVariant
  height?: number
  className?: string
  onClick?: () => void
}

function Logo({
  variant = 'horizontal',
  height = 36,
  className,
  onClick,
}: LogoProps) {
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
          height={height}
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
      height={height}
      className={clsx(styles.img, className)}
      draggable={false}
    />
  )
}

export default Logo
