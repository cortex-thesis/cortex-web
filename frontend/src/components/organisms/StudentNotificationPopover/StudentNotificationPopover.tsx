import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Bell, BookOpen, GraduationCap, Info, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, type AppNotification } from '../../../hooks/useNotifications'
import styles from './StudentNotificationPopover.module.css'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpen?: () => void
}

function relativeTime(value: string) {
  const date = new Date(value)
  const elapsed = Date.now() - date.getTime()
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  if (hours < 48) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function NotificationIcon({ kind }: { kind: string }) {
  if (kind === 'achievement') return <Award size={17} />
  if (kind === 'class') return <Users size={17} />
  if (kind === 'journal') return <BookOpen size={17} />
  if (kind === 'session') return <GraduationCap size={17} />
  return <Info size={17} />
}

export default function StudentNotificationPopover({ open, onOpenChange, onOpen }: Props) {
  const navigate = useNavigate()
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { notifications, unread_count, loading, error, busy, markRead } = useNotifications()
  const visible = useMemo(() => filter === 'unread' ? notifications.filter(item => !item.read) : notifications, [filter, notifications])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!anchorRef.current?.contains(event.target as Node)) onOpenChange(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
        bellRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus())
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange])

  async function select(item: AppNotification) {
    if (!item.read && !await markRead(item.id)) return
    const destination = item.link.startsWith('/student/') && !item.link.includes('\\') && !item.link.startsWith('//') ? item.link : ''
    onOpenChange(false)
    if (destination) navigate(destination)
  }

  return <div className={styles.anchor} ref={anchorRef}>
    <button
      ref={bellRef}
      className={styles.bellButton}
      aria-label={`Notifications${unread_count ? `, ${unread_count} unread` : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => { onOpen?.(); onOpenChange(!open) }}
    >
      <Bell size={18} strokeWidth={1.75} />
      {unread_count > 0 && <span className={styles.badge}>{unread_count > 99 ? '99+' : unread_count}</span>}
    </button>

    {open && <div className={styles.panel} ref={panelRef} role="dialog" aria-label="Notifications">
      <header className={styles.header}>
        <div><h2>Notifications</h2><p>{unread_count ? `${unread_count} unread` : 'You’re all caught up'}</p></div>
        {unread_count > 0 && <button className={styles.markAll} disabled={busy} onClick={() => void markRead()}>Mark all read</button>}
      </header>
      <div className={styles.filters} role="group" aria-label="Filter notifications">
        <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread</button>
      </div>
      {error && <p className={styles.message} role="alert">{error}</p>}
      <div className={styles.list}>
        {loading ? <p className={styles.message} role="status">Loading notifications…</p> : visible.length === 0 ? <div className={styles.empty}><Bell size={20} /><strong>You’re all caught up.</strong><span>No new notifications right now.</span></div> : visible.map(item => {
          const actionable = item.link.startsWith('/student/')
          return <button key={item.id} className={styles.item} data-unread={!item.read} disabled={busy} onClick={() => void select(item)} aria-label={`${item.title}. ${item.body}. ${relativeTime(item.createdAt)}${!item.read ? '. Unread' : ''}${actionable ? '' : '. Marks as read'}`}>
            <span className={styles.itemIcon} aria-hidden="true"><NotificationIcon kind={item.kind} /></span>
            <span className={styles.itemContent}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <time dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString()}>{relativeTime(item.createdAt)}</time>
            </span>
            {!item.read && <span className={styles.unreadDot} aria-hidden="true" />}
          </button>
        })}
      </div>
    </div>}
  </div>
}
