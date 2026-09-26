import type { ReactNode } from 'react'
import { NavBarStudent } from '../../molecules'
import StudentHeader from '../../organisms/StudentHeader'
import styles from './PlayfulZone.module.css'

interface PlayfulZoneTemplateProps {
  children: ReactNode
  showNav?: boolean
  showHeader?: boolean
  calm?: boolean
  spotlight?: boolean
  quietNav?: boolean
  cool?: boolean
}

export function PlayfulZoneTemplate({
  children,
  showNav = true,
  showHeader = showNav,
  calm = false,
  spotlight = false,
  quietNav = false,
  cool = false,
}: PlayfulZoneTemplateProps) {
  return (
    <div className={`${styles.root} ${calm ? styles.calm : ''} ${cool ? styles.cool : ''} ${spotlight ? styles.spotlight : ''} ${quietNav ? styles.quietNav : ''}`}>
      <div className={styles.blob1} aria-hidden="true" />
      <div className={styles.blob2} aria-hidden="true" />
      {showHeader && <StudentHeader />}
      <main className={styles.content}>{children}</main>
      {showNav && <NavBarStudent />}
    </div>
  )
}
