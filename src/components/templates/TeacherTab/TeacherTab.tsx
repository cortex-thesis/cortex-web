import type { ReactNode } from 'react'
import type { User } from '../../../types'
import { useLocation, useNavigate } from 'react-router-dom'
import { NavBarTeacher } from '../../molecules'
import styles from './TeacherTab.module.css'
import clsx from 'clsx'

interface Tab {
  label: string
  path: string
}

interface TeacherTabTemplateProps {
  children: ReactNode
  user: Pick<User, 'name' | 'avatar'>
  tabs: Tab[]
  hasNotification?: boolean
  title?: string
}

function TeacherTabTemplate({
  children,
  user,
  tabs,
  hasNotification,
  title,
}: TeacherTabTemplateProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className={styles.root}>
      <NavBarTeacher user={user} hasNotification={hasNotification} />

      <div className={styles.subHeader}>
        {title && <h1 className={styles.title}>{title}</h1>}
        <div className={styles.tabBar} role="tablist">
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.path ||
              location.pathname.endsWith(tab.path.split('/').pop() ?? '')
            return (
              <button
                key={tab.path}
                role="tab"
                aria-selected={isActive}
                className={clsx(styles.tab, isActive && styles.tabActive)}
                onClick={() => navigate(tab.path)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <main className={styles.content} role="tabpanel">
        {children}
      </main>
    </div>
  )
}

export default TeacherTabTemplate
