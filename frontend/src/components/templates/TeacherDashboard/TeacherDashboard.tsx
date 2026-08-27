import type { ReactNode } from 'react'
import type { User } from '../../../types'
import { NavBarTeacher } from '../../molecules'
import styles from './TeacherDashboard.module.css'

interface TeacherDashboardTemplateProps {
  children: ReactNode
  user: Pick<User, 'name' | 'avatar'>
  hasNotification?: boolean
}

function TeacherDashboardTemplate({
  children,
  user,
  hasNotification,
}: TeacherDashboardTemplateProps) {
  return (
    <div className={styles.root}>
      <NavBarTeacher user={user} hasNotification={hasNotification} />
      <main className={`${styles.content} ${styles.pageContent}`}>{children}</main>
    </div>
  )
}

export default TeacherDashboardTemplate
