import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuthStore } from '../../store/authStore'
import styles from '../../pages/prototype/Prototype.module.css'
import local from './SuperAdminShell.module.css'

export default function SuperAdminShell({ children, active }: { children: ReactNode; active: 'overview' | 'accounts' | 'validation' | 'notifications' }) {
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)
  const { unread_count } = useNotifications()
  const links = [['overview', '/admin/dashboard', 'Overview'], ['accounts', '/admin/accounts', 'Accounts'], ['validation', '/admin/evaluation', 'Validation'], ['notifications', '/admin/notifications', `Notifications${unread_count ? ` (${unread_count})` : ''}`]] as const
  return <div className={`${styles.adminRoot} ${local.root}`}><nav className={`${styles.adminNav} ${local.nav}`} aria-label="Administration"><div className={styles.adminBrand}><ShieldCheck size={20} aria-hidden="true" /> Cortex Admin</div><div className={`${styles.adminLinks} ${local.links}`}>{links.map(([key, path, label]) => <Link key={key} className={`${styles.adminLink} ${key === active ? styles.adminLinkActive : ''}`} aria-current={key === active ? 'page' : undefined} aria-label={key === 'overview' ? '← System overview' : undefined} to={path}>{label}</Link>)}<button className={styles.adminLink} onClick={() => void logout().then(() => navigate('/', { replace: true }))}>Sign out</button></div></nav>{children}</div>
}
