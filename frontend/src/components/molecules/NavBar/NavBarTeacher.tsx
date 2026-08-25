import { useLocation, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import type { User } from '../../../types'
import { Logo } from '../../atoms'
import styles from './NavBarTeacher.module.css'
import clsx from 'clsx'

interface NavLink {
  label: string
  path: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/teacher/dashboard' },
  { label: 'Classes', path: '/teacher/classes' },
  { label: 'Content', path: '/teacher/content' },
  { label: 'Analytics', path: '/teacher/analytics' },
  { label: 'Journals', path: '/teacher/journals' },
  { label: 'Reports', path: '/teacher/reports' },
]

interface NavBarTeacherProps {
  user: Pick<User, 'name' | 'avatar'>
  hasNotification?: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function NavBarTeacher({ user, hasNotification = false }: NavBarTeacherProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className={styles.nav} aria-label="Teacher navigation">
      <div className={styles.left}>
        <Logo
          variant="horizontal"
          height={28}
          onClick={() => navigate('/teacher/dashboard')}
        />

        <div className={styles.links}>
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname.startsWith(link.path)
            return (
              <button
                key={link.path}
                className={clsx(styles.link, isActive && styles.linkActive)}
                onClick={() => navigate(link.path)}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.right}>
        <button
          className={styles.notifBtn}
          onClick={() => navigate('/teacher/notifications')}
          aria-label={
            hasNotification
              ? 'Notifications — you have unread notifications'
              : 'Notifications'
          }
        >
          <Bell
            size={18}
            strokeWidth={1.75}
            fill={hasNotification ? '#D4537E' : 'none'}
            color={hasNotification ? '#D4537E' : '#5F5E5A'}
          />
          {hasNotification && (
            <span className={styles.notifDot} aria-hidden="true" />
          )}
        </button>

        <button
          className={styles.avatarBtn}
          onClick={() => navigate('/teacher/settings')}
          aria-label={`Account settings for ${user.name}`}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className={styles.avatarImg}
            />
          ) : (
            <span className={styles.avatarInitials}>
              {getInitials(user.name)}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}

export default NavBarTeacher
