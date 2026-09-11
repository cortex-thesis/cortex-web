import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Trophy, BookOpen, Users, Bell, CheckCheck } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { ListSkeleton } from '../../components/molecules'
import { api, cachedApiValue } from '../../lib/api'
import styles from './Notifications.module.css'

type NotificationKind = 'achievement' | 'journal' | 'class' | 'system'
interface AppNotification { id: string; kind: NotificationKind; title: string; body: string; createdAt: string; read: boolean }
const kindIcon: Record<NotificationKind, React.ReactNode> = { achievement: <Trophy size={16} strokeWidth={1.75} />, journal: <BookOpen size={16} strokeWidth={1.75} />, class: <Users size={16} strokeWidth={1.75} />, system: <Bell size={16} strokeWidth={1.75} /> }
const kindBg: Record<NotificationKind, string> = { achievement: '#FAEEDA', journal: '#FBEAF0', class: '#EEEDFE', system: '#E1F5EE' }

function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function Notifications() {
  const cached = cachedApiValue<{ notifications: AppNotification[] }>('/student/notifications/')
  const navigate = useNavigate(); const [notifications, setNotifications] = useState<AppNotification[]>(() => cached?.notifications ?? []); const [loading, setLoading] = useState(!cached)
  useEffect(() => { void api<{ notifications: AppNotification[] }>('/student/notifications/').then((data) => setNotifications(data.notifications)).finally(() => setLoading(false)) }, [])
  const unreadCount = notifications.filter((item) => !item.read).length
  function markAllRead() { setNotifications((items) => items.map((item) => ({ ...item, read: true }))); void api('/student/notifications/', { method: 'POST', body: '{}' }) }
  function markRead(id: string) { setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item)); void api('/student/notifications/', { method: 'POST', body: JSON.stringify({ notification_id: id }) }) }
  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}><button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back"><ChevronLeft size={18} strokeWidth={1.75} /></button><h1 className={styles.title}>Notifications</h1>{unreadCount ? <button className={styles.markAllBtn} onClick={markAllRead}><CheckCheck size={14} strokeWidth={1.75} />Mark all read</button> : <span className={styles.spacer} />}</div>
      <div className={styles.body}>{loading ? <ListSkeleton rows={6} /> : notifications.length === 0 ? <div className={styles.empty}><Bell size={28} strokeWidth={1.5} /><p>You're all caught up. New updates will show up here.</p></div> : <ul className={styles.list}>{notifications.map((item) => <li key={item.id}><button className={styles.item} data-unread={!item.read} onClick={() => markRead(item.id)}><span className={styles.icon} style={{ background: kindBg[item.kind] }}>{kindIcon[item.kind]}</span><span className={styles.itemBody}><span className={styles.itemTitle}>{item.title}</span><span className={styles.itemText}>{item.body}</span><span className={styles.itemTime}>{timeAgo(item.createdAt)}</span></span>{!item.read && <span className={styles.dot} aria-hidden />}</button></li>)}</ul>}</div>
    </PlayfulZoneTemplate>
  )
}
