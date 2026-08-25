import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Trophy,
  BookOpen,
  Users,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import styles from './Notifications.module.css'

type NotificationKind = 'achievement' | 'journal' | 'class' | 'system'

interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
}

// Mock data — replace with a GET /api/notifications/ call once the
// backend is up. Shape mirrors what that endpoint should return.
const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'achievement',
    title: 'New badge earned',
    body: 'You kept a 7-day streak. Keep it going!',
    createdAt: '2026-08-17T09:12:00Z',
    read: false,
  },
  {
    id: 'n2',
    kind: 'class',
    title: 'Ms. Santos added new content',
    body: '"Getting Ready for School" now has 2 new tasks.',
    createdAt: '2026-08-16T14:30:00Z',
    read: false,
  },
  {
    id: 'n3',
    kind: 'journal',
    title: 'Journal reminder',
    body: "You haven't logged how today's session went yet.",
    createdAt: '2026-08-16T10:05:00Z',
    read: true,
  },
  {
    id: 'n4',
    kind: 'system',
    title: 'Headband paired',
    body: 'Your Muse 2 connected successfully for your last session.',
    createdAt: '2026-08-14T08:00:00Z',
    read: true,
  },
]

const kindIcon: Record<NotificationKind, React.ReactNode> = {
  achievement: <Trophy size={16} strokeWidth={1.75} />,
  journal: <BookOpen size={16} strokeWidth={1.75} />,
  class: <Users size={16} strokeWidth={1.75} />,
  system: <Bell size={16} strokeWidth={1.75} />,
}

const kindBg: Record<NotificationKind, string> = {
  achievement: '#FAEEDA',
  journal: '#FBEAF0',
  class: '#EEEDFE',
  system: '#E1F5EE',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className={styles.title}>Notifications</h1>
        {unreadCount > 0 ? (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            <CheckCheck size={14} strokeWidth={1.75} />
            Mark all read
          </button>
        ) : (
          <span className={styles.spacer} />
        )}
      </div>

      <div className={styles.body}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={28} strokeWidth={1.5} />
            <p>You're all caught up. New updates will show up here.</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  className={styles.item}
                  data-unread={!n.read}
                  onClick={() => markRead(n.id)}
                >
                  <span
                    className={styles.icon}
                    style={{ background: kindBg[n.kind] }}
                  >
                    {kindIcon[n.kind]}
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitle}>{n.title}</span>
                    <span className={styles.itemText}>{n.body}</span>
                    <span className={styles.itemTime}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {!n.read && <span className={styles.dot} aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PlayfulZoneTemplate>
  )
}
