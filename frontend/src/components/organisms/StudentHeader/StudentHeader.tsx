import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo, StudentFlowerAvatar } from '../../atoms'
import { useAuthStore } from '../../../store/authStore'
import StudentNotificationPopover from '../StudentNotificationPopover'
import styles from './StudentHeader.module.css'
import { useNotifications } from '../../../hooks/useNotifications'
import ToastNotification from '../../molecules/ToastNotification'

export default function StudentHeader() {
  const navigate = useNavigate()
  const { notifications, markRead, busy, error } = useNotifications()
  const award = notifications.find(item => item.kind === 'achievement' && !item.read)
  const student = useAuthStore(state => state.user)!
  const logout = useAuthStore(state => state.logout)
  const accountRef = useRef<HTMLDivElement>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    if (!accountOpen) return
    const closeOutside = (event: MouseEvent) => { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false) }
    const closeEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setAccountOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeEscape) }
  }, [accountOpen])

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return <header className={styles.header}>
    {award && <div className={styles.awardNotice}><ToastNotification key={award.id} message={`${award.title}: ${award.body}`} variant="success" duration={6000} onDismiss={() => { if (!busy) void markRead(award.id) }} />{error && <p role="alert">{error} Dismiss again to retry.</p>}</div>}
    <button data-tour="student-home" className={styles.brand} onClick={() => navigate('/student/home')} aria-label="Cortex student home"><Logo variant="icon" height={36} /></button>
    <div className={styles.actions}>
      <StudentNotificationPopover open={notificationsOpen} onOpenChange={setNotificationsOpen} onOpen={() => setAccountOpen(false)} />
      <button data-tour="student-settings" className={styles.iconButton} aria-label="Settings" onClick={() => navigate('/student/settings')}><Settings size={18} strokeWidth={1.75} /></button>
      <div className={styles.account} ref={accountRef}>
        <button className={styles.avatarButton} title="Profile" onClick={() => { setNotificationsOpen(false); setAccountOpen(open => !open) }} aria-label="Open profile menu" aria-expanded={accountOpen} aria-haspopup="menu"><StudentFlowerAvatar className={styles.headerAvatar} name={student.name} color={student.avatar_color} size="sm" /></button>
        {accountOpen && <div className={styles.accountPopover} role="menu">
          <div className={styles.accountSummary}><strong>{student.name}</strong><span>Student account</span></div>
          <div className={styles.divider} />
          <button role="menuitem" onClick={() => { setAccountOpen(false); navigate('/student/profile') }}><UserRound size={16} /> Profile</button>
          <button role="menuitem" onClick={() => { setAccountOpen(false); navigate('/student/settings') }}><Settings size={16} /> Settings</button>
          <button role="menuitem" onClick={() => void handleLogout()}><LogOut size={16} /> Sign out</button>
        </div>}
      </div>
    </div>
  </header>
}
