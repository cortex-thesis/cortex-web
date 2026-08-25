import type { ReactNode } from 'react'
import type { CognitiveState } from '../../../constants/states'
import { NavBarStudent, BreadcrumbBar } from '../../molecules'
import styles from './CalmZone.module.css'

interface CalmZoneTemplateProps {
  children: ReactNode
  showNav?: boolean
  showBreadcrumb?: boolean
  backPath?: string
  onBack?: () => void
  className_name?: string
  state?: CognitiveState | null
  signalStrength?: 0 | 1 | 2 | 3 | 4
  isLive?: boolean
  taskIndex?: number
  taskTotal?: number
}

function CalmZoneTemplate({
  children,
  showNav = true,
  showBreadcrumb = false,
  backPath,
  onBack,
  className_name,
  state,
  signalStrength,
  isLive,
  taskIndex,
  taskTotal,
}: CalmZoneTemplateProps) {
  return (
    <div className={styles.root}>
      {showBreadcrumb && (
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
      )}
      <main className={styles.content}>{children}</main>
      {showNav && <NavBarStudent />}
    </div>
  )
}

export default CalmZoneTemplate
