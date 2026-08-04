import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './AlertBanner.module.css'
import clsx from 'clsx'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertBannerProps {
  variant?: AlertVariant
  title?: string
  message: string
  dismissible?: boolean
  onDismiss?: () => void
  action?: ReactNode
  className?: string
}

const ICONS: Record<AlertVariant, ReactNode> = {
  success: <CheckCircle size={18} strokeWidth={1.75} />,
  error: <XCircle size={18} strokeWidth={1.75} />,
  warning: <AlertTriangle size={18} strokeWidth={1.75} />,
  info: <Info size={18} strokeWidth={1.75} />,
}

function AlertBanner({
  variant = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className,
}: AlertBannerProps) {
  return (
    <div
      className={clsx(styles.banner, styles[variant], className)}
      role="alert"
      aria-live="polite"
    >
      <span
        className={clsx(styles.icon, styles[`icon_${variant}`])}
        aria-hidden="true"
      >
        {ICONS[variant]}
      </span>

      <div className={styles.body}>
        {title && <span className={styles.title}>{title}</span>}
        <span className={styles.message}>{message}</span>
        {action && <div className={styles.action}>{action}</div>}
      </div>

      {dismissible && onDismiss && (
        <button
          className={styles.closeBtn}
          onClick={onDismiss}
          aria-label="Dismiss alert"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

export default AlertBanner
