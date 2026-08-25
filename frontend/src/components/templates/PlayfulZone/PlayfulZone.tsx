import type { ReactNode } from 'react'
import { NavBarStudent } from '../../molecules'
import styles from './PlayfulZone.module.css'

interface PlayfulZoneTemplateProps {
  children: ReactNode
  showNav?: boolean
}

export function PlayfulZoneTemplate({
  children,
  showNav = true,
}: PlayfulZoneTemplateProps) {
  return (
    <div className={styles.root}>
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
      <main className={styles.content}>{children}</main>
      {showNav && <NavBarStudent />}
    </div>
  )
}
