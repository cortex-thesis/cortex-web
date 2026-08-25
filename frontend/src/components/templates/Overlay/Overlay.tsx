import type { ReactNode } from 'react'
import styles from './Overlay.module.css'

interface OverlayTemplateProps {
  children: ReactNode
  onBackdropClick?: () => void
}

function OverlayTemplate({ children, onBackdropClick }: OverlayTemplateProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div
        className={styles.backdrop}
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div className={styles.content}>{children}</div>
    </div>
  )
}

export default OverlayTemplate
