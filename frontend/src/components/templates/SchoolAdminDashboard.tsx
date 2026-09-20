import { useNotifications } from '../../hooks/useNotifications'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Settings, UserRound } from 'lucide-react'
import clsx from 'clsx'
import type { User } from '../../types'
import { useAuthStore } from '../../store/authStore'
import { Logo } from '../atoms'
import navStyles from '../molecules/NavBar/NavBarTeacher.module.css'
import shellStyles from './TeacherDashboard/TeacherDashboard.module.css'

const links = [
  { label: 'Dashboard', path: '/school-admin/dashboard' },
  { label: 'Classes', path: '/school-admin/classes' },
  { label: 'Teachers', path: '/school-admin/teachers' },
  { label: 'Students', path: '/school-admin/students' },
]

export default function SchoolAdminDashboard({ user, children }: { user: Pick<User, 'name' | 'avatar'>; children: ReactNode }) {
  const { unread_count } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return <div className={shellStyles.root}>
    <nav className={navStyles.nav} aria-label="School administrator navigation">
      <div className={navStyles.left}>
        <Logo variant="horizontal" height={28} onClick={() => navigate('/school-admin/dashboard')} />
        <div className={navStyles.links}>{links.map((link) => {
          const active = location.pathname.startsWith(link.path)
          return <button key={link.path} className={clsx(navStyles.link, active && navStyles.linkActive)} onClick={() => navigate(link.path)} aria-current={active ? 'page' : undefined}>{link.label}</button>
        })}</div>
      </div>
      <div className={navStyles.right}>
        <button className={navStyles.notifBtn} aria-label={`Notifications, ${unread_count} unread`} onClick={() => navigate('/school-admin/notifications')}><Bell size={18} />{unread_count > 0 && <span className={navStyles.notifDot} />}</button>
        <div className={navStyles.accountMenu} ref={menuRef}>
          <button className={navStyles.avatarBtn} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">
            {user.avatar ? <img src={user.avatar} alt={user.name} className={navStyles.avatarImg} /> : <span className={navStyles.avatarInitials}>{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>}
          </button>
          {open && <div className={navStyles.accountPopover} role="menu">
            <div className={navStyles.accountSummary}><strong>{user.name}</strong><span>School administrator</span></div>
            <div className={navStyles.menuDivider} />
            <button className={navStyles.accountMenuItem} role="menuitem" disabled><UserRound size={16} /> School profile</button>
            <button className={navStyles.accountMenuItem} role="menuitem" disabled><Settings size={16} /> Settings</button>
            <button className={navStyles.accountMenuItem} role="menuitem" onClick={() => void logout().then(() => navigate('/', { replace: true }))}><LogOut size={16} /> Log out</button>
          </div>}
        </div>
      </div>
    </nav>
    <main className={`${shellStyles.content} ${shellStyles.pageContent}`}>{children}</main>
  </div>
}
