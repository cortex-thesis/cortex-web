import type { ReactNode } from 'react'
import { NavBarStudent } from '../../molecules'
import styles from './PlayfulZone.module.css'

interface PlayfulZoneTemplateProps {
  children: ReactNode
  showNav?: boolean
  calm?: boolean
}

export function PlayfulZoneTemplate({
  children,
  showNav = true,
  calm = false,
}: PlayfulZoneTemplateProps) {
  return (
    <div className={`${styles.root} ${calm ? styles.calm : ''}`}>
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
      <main className={styles.content}>{children}</main>
      {showNav && <NavBarStudent />}
    </div>
  )
}
