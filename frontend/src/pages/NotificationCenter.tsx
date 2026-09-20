import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications, type AppNotification } from '../hooks/useNotifications'
import { useAuthStore } from '../store/authStore'
import { TeacherDashboardTemplate, PlayfulZoneTemplate } from '../components/templates'
import SchoolAdminDashboard from '../components/templates/SchoolAdminDashboard'
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
    <h1 className={styles.title}>Notifications</h1>
    <p>{unread_count} unread · Updates every 10 seconds · Showing the latest 100 notifications</p>
    <div className={styles.tools}>
      <label>Search notifications<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title or message" /></label>
      <label>Category<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All categories</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <label><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} /> Unread only</label>
      <button className={styles.markAllBtn} disabled={busy || !unread_count} onClick={() => void markRead()}>Mark all read</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">Loading notifications…</p> : !filtered.length ? <p>No notifications match these filters.</p> : <ul className={styles.list}>{filtered.map(item => <li key={item.id}>
      <button className={styles.item} data-unread={!item.read} disabled={busy} onClick={() => void open(item)}>
        <Bell size={18} /><span className={styles.itemBody}><strong className={styles.itemTitle}>{item.title}</strong><span className={styles.itemText}>{item.body}</span><time className={styles.itemTime} dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></span>{!item.read && <span className={styles.dot} aria-label="Unread" />}
      </button>
    </li>)}</ul>}
  </div>
  if (user.role === 'teacher') return <TeacherDashboardTemplate user={user}>{content}</TeacherDashboardTemplate>
  if (user.role === 'student') return <PlayfulZoneTemplate>{content}</PlayfulZoneTemplate>
  if (user.role === 'school_admin') return <SchoolAdminDashboard user={user}>{content}</SchoolAdminDashboard>
  return <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}><Link to="/admin/dashboard">Back to dashboard</Link>{content}</main>
}
