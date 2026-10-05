import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { useNotifications, type AppNotification } from '../hooks/useNotifications'
import { useAuthStore } from '../store/authStore'
import { TeacherDashboardTemplate, PlayfulZoneTemplate } from '../components/templates'
import SchoolAdminDashboard from '../components/templates/SchoolAdminDashboard'
import SuperAdminShell from '../components/templates/SuperAdminShell'
import admin from './prototype/Prototype.module.css'
import styles from './teacher/Notifications.module.css'

export default function NotificationCenter() {
  const user = useAuthStore(state => state.user)!
  const navigate = useNavigate()
  const { notifications, unread_count, loading, error, busy, markRead } = useNotifications()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const kinds = [...new Set(notifications.map(item => item.kind))]
  const filtered = notifications.filter(item => (!unreadOnly || !item.read) && (filter === 'all' || item.kind === filter) && `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase()))
  async function open(item: AppNotification) {
    if (!item.read && !await markRead(item.id)) return
    if (item.link.startsWith('/') && !item.link.startsWith('//') && !item.link.includes('\\')) navigate(item.link)
  }
  const content = <div className={styles.content}>
    <header><h1 className={styles.title}>Notifications</h1><p className={styles.description}>{unread_count} unread · Showing the latest 100 updates</p></header>
    <div className={styles.layout}><aside className={styles.sidebar} aria-label="Notification categories"><h2 className={styles.sidebarTitle}>Inbox</h2><p className={styles.unreadSummary}>{unread_count} unread notifications</p><div className={styles.filterNav}><button className={styles.filterItem} data-active={filter === 'all'} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All notifications</button>{kinds.map(kind => <button key={kind} className={styles.filterItem} data-active={filter === kind} aria-pressed={filter === kind} onClick={() => setFilter(kind)}>{kind.replaceAll('_', ' ')}</button>)}</div><button className={styles.markAllBtn} disabled={busy || !unread_count} onClick={() => void markRead()}><CheckCheck size={15} aria-hidden="true" />Mark all read</button></aside><div className={styles.main}>
    <div className={styles.tools}>
      <label>Search notifications<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title or message" /></label>
      <label><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} /> Unread only</label>
    </div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading notifications…</p> : !filtered.length ? <div className={styles.empty}><Inbox size={28} aria-hidden="true" /><p>{notifications.length ? 'No notifications match these filters.' : 'You’re all caught up. New updates will appear here.'}</p></div> : <ul className={styles.list}>{filtered.map(item => <li key={item.id}>
      <button className={styles.item} data-unread={!item.read} disabled={busy} onClick={() => void open(item)}>
        <span className={styles.icon}><Bell size={18} aria-hidden="true" /></span><span className={styles.itemBody}><strong className={styles.itemTitle}>{item.title}</strong><span className={styles.itemText}>{item.body}</span><time className={styles.itemTime} dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.read && <span className={styles.dot} aria-label="Unread" />}
      </button>
    </li>)}</ul>}</div></div>
  </div>
  if (user.role === 'teacher') return <TeacherDashboardTemplate user={user}>{content}</TeacherDashboardTemplate>
  if (user.role === 'student') return <PlayfulZoneTemplate>{content}</PlayfulZoneTemplate>
  if (user.role === 'school_admin') return <SchoolAdminDashboard user={user}>{content}</SchoolAdminDashboard>
  return <SuperAdminShell active="notifications"><main className={admin.page}>{content}</main></SuperAdminShell>
}
