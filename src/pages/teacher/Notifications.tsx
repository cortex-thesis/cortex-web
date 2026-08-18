import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldAlert,
  WifiOff,
  BarChart2,
  Bell,
  CheckCheck,
} from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { mockTeacher } from '../../mocks'
import styles from './Notifications.module.css'

type NotificationKind = 'overstim' | 'disconnect' | 'digest' | 'system'

interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
}

// Mock data — replace with GET /api/notifications/?role=teacher once
// the backend is up.
const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    kind: 'overstim',
    title: 'Kyla R. flagged overstimulated',
    body: 'Life Skills session, 11:42 AM. Consider a manual override.',
    createdAt: '2026-08-19T03:42:00Z',
    read: false,
  },
  {
    id: 'n2',
    kind: 'disconnect',
    title: 'Signal lost — Marco T.',
    body: 'Headband disconnected mid-session in Self Care.',
    createdAt: '2026-08-18T14:10:00Z',
    read: false,
  },
  {
    id: 'n3',
    kind: 'digest',
    title: 'Weekly class digest ready',
    body: 'Life Skills averaged 74% focus this week, up 6 points.',
    createdAt: '2026-08-17T08:00:00Z',
    read: true,
  },
  {
    id: 'n4',
    kind: 'system',
    title: 'New content added to library',
    body: 'You uploaded 2 new activities to Self Care.',
    createdAt: '2026-08-15T10:00:00Z',
    read: true,
  },
]

const kindIcon: Record<NotificationKind, React.ReactNode> = {
  overstim: <ShieldAlert size={16} strokeWidth={1.75} />,
  disconnect: <WifiOff size={16} strokeWidth={1.75} />,
  digest: <BarChart2 size={16} strokeWidth={1.75} />,
  system: <Bell size={16} strokeWidth={1.75} />,
}

const kindColor: Record<NotificationKind, string> = {
  overstim: '#D85A30',
  disconnect: '#D4537E',
  digest: '#1D9E75',
  system: '#534AB7',
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
    <TeacherDashboardTemplate
      user={mockTeacher}
      hasNotification={unreadCount > 0}
    >
      <div className={styles.wrap}>
        <button className={styles.backLink} onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back
        </button>

        <div className={styles.header}>
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 && (
            <button className={styles.markAllBtn} onClick={markAllRead}>
              <CheckCheck size={14} strokeWidth={1.75} />
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={28} strokeWidth={1.5} />
            <p>
              No notifications yet. Alerts from your classes will show up here.
            </p>
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
                    style={{ color: kindColor[n.kind] }}
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
    </TeacherDashboardTemplate>
  )
}
