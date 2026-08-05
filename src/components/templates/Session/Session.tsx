import type { ReactNode } from 'react'
import type { CognitiveState } from '../../../constants/states'
import { BreadcrumbBar } from '../../molecules'
import styles from './Session.module.css'

interface SessionTemplateProps {
  children: ReactNode
  backPath?: string
  onBack?: () => void
  className_name?: string
  state?: CognitiveState | null
  signalStrength?: 0 | 1 | 2 | 3 | 4
  isLive?: boolean
  taskIndex?: number
  taskTotal?: number
  footer?: ReactNode
}

function SessionTemplate({
  children,
  backPath,
  onBack,
  className_name,
  state,
  signalStrength,
  isLive,
  taskIndex,
  taskTotal,
  footer,
}: SessionTemplateProps) {
  return (
    <div className={styles.root}>
      <BreadcrumbBar
        backPath={backPath}
        onBack={onBack}
        className_name={className_name}
        state={state}
        signalStrength={signalStrength}
        isLive={isLive}
        taskIndex={taskIndex}
        taskTotal={taskTotal}
      />
      <main className={styles.content}>{children}</main>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}

export default SessionTemplate
