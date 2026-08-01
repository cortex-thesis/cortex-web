import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Zap, User } from 'lucide-react'
import styles from './NavBarStudent.module.css'
import clsx from 'clsx'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  activeIcon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Home',
    path: '/student/home',
    icon: <Home size={18} strokeWidth={1.75} />,
    activeIcon: (
      <Home size={18} strokeWidth={2} fill="#534AB7" color="#534AB7" />
    ),
  },
  {
    label: 'Sessions',
    path: '/student/sessions',
    icon: <Zap size={18} strokeWidth={1.75} />,
    activeIcon: (
      <Zap size={18} strokeWidth={2} fill="#534AB7" color="#534AB7" />
    ),
  },
  {
    label: 'Profile',
    path: '/student/profile',
    icon: <User size={18} strokeWidth={1.75} />,
    activeIcon: (
      <User size={18} strokeWidth={2} fill="#534AB7" color="#534AB7" />
    ),
  },
]

function NavBarStudent() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className={styles.nav} aria-label="Student navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.path)

        return (
          <button
            key={item.path}
            className={styles.item}
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className={clsx(
                styles.iconWrap,
                isActive && styles.iconWrapActive
              )}
            >
              <span
                className={clsx(
                  styles.icon,
                  isActive ? styles.iconActive : styles.iconInactive
                )}
              >
                {isActive ? item.activeIcon : item.icon}
              </span>
            </span>
            <span
              className={clsx(styles.label, isActive && styles.labelActive)}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default NavBarStudent
