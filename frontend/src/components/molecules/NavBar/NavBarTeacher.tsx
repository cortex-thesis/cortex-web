import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Settings, UserRound } from 'lucide-react'
import type { User } from '../../../types'
import { Logo } from '../../atoms'
import styles from './NavBarTeacher.module.css'
import clsx from 'clsx'
import { useAuthStore } from '../../../store/authStore'

interface NavLink {
  label: string
  path: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/teacher/dashboard' },
  { label: 'Classes', path: '/teacher/classes' },
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
  const logout = useAuthStore((state) => state.logout)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsMenuOpen(false) }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOnOutsideClick); document.removeEventListener('keydown', closeOnEscape) }
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

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

        <div className={styles.accountMenu} ref={menuRef}>
        <button
          className={styles.avatarBtn}
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={`Open account menu for ${user.name}`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
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
        {isMenuOpen && <div className={styles.accountPopover} role="menu">
          <div className={styles.accountSummary}><strong>{user.name}</strong><span>Teacher account</span></div>
          <div className={styles.menuDivider} />
          <button className={styles.accountMenuItem} role="menuitem" onClick={() => { setIsMenuOpen(false); navigate('/teacher/profile') }}><UserRound size={16} /> Profile</button>
          <button className={styles.accountMenuItem} role="menuitem" onClick={() => { setIsMenuOpen(false); navigate('/teacher/settings') }}><Settings size={16} /> Settings</button>
          <button className={styles.accountMenuItem} role="menuitem" onClick={() => void handleLogout()}><LogOut size={16} /> Log out</button>
        </div>}
        </div>
      </div>
    </nav>
  )
}

export default NavBarTeacher
