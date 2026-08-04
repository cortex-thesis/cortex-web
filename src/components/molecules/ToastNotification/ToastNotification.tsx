import { useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import styles from './ToastNotification.module.css'
import clsx from 'clsx'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastNotificationProps {
  message: string
  variant?: ToastVariant
  duration?: number
  onDismiss?: () => void
  className?: string
}

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <Check size={11} strokeWidth={3} />,
  error: <X size={11} strokeWidth={3} />,
  warning: <AlertTriangle size={11} strokeWidth={3} />,
  info: <Info size={11} strokeWidth={3} />,
}

const ARIA_LABELS: Record<ToastVariant, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
}

function ToastNotification({
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
  className,
}: ToastNotificationProps) {
  useEffect(() => {
    if (!duration || !onDismiss) return
    const id = setTimeout(onDismiss, duration)
    return () => clearTimeout(id)
  }, [duration, onDismiss])

  return (
    <div
      className={clsx(styles.toast, styles[variant], className)}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span
        className={clsx(styles.icon, styles[`icon_${variant}`])}
        aria-label={ARIA_LABELS[variant]}
      >
        {ICONS[variant]}
      </span>

      <span className={styles.message}>{message}</span>

      {onDismiss && (
        <button
          className={styles.closeBtn}
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

export default ToastNotification
