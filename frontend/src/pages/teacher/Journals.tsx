import { useEffect, useState } from 'react'
import { ChevronRight, Check, FileImage, Headphones } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { api, cachedApiValue } from '../../lib/api'
import type { TeacherClass } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import styles from '../prototype/Prototype.module.css'

interface JournalEntry {
  id: string
  student: { id: number; name: string; avatar: string | null }
  session_id: string
  prompt: string
  response_type: 'text' | 'drawing' | 'audio'
  text_response: string
  mood: string
  asset_url: string | null
  created_at: string
  duration_seconds: number | null
  tasks_completed: number
}

interface JournalPayload { classes: TeacherClass[]; selected_class_id: number | null; entries: JournalEntry[] }

function durationLabel(seconds: number | null) {
  if (seconds == null) return 'Session duration unavailable'
  return `${Math.max(1, Math.round(seconds / 60))} minute session`
}

export default function Journals() {
  const user = useAuthStore((state) => state.user)!
  const cached = cachedApiValue<JournalPayload>('/teacher/journals/')
  const [data, setData] = useState<JournalPayload>(() => cached ?? { classes: [], selected_class_id: null, entries: [] })
  const [classId, setClassId] = useState(() => cached?.selected_class_id ? String(cached.selected_class_id) : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    api<JournalPayload>(`/teacher/journals/${classId ? `?class_id=${classId}` : ''}`)
      .then((payload) => { setData(payload); if (!classId && payload.selected_class_id) setClassId(String(payload.selected_class_id)) })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [classId])

  return <TeacherDashboardTemplate user={user}>
    <div className={styles.page}>
      <div className={styles.header}>
        <div><span className={styles.eyebrow}>Student reflections</span><h1 className={styles.title}>Learning journals</h1><p className={styles.subtitle}>Review post-session reflections, moods, drawings, and audio entries by class.</p></div>
        <label className={styles.field} style={{ width: 230 }}><span className={styles.label}>Class / section</span><select className={styles.select} value={classId} onChange={(event) => { setLoading(true); setError(''); setClassId(event.target.value) }}><option value="" disabled>Select a class</option>{data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}
      {!loading && data.classes.length === 0 && <div className={styles.card}><h2 className={styles.cardTitle}>No classes yet</h2><p className={styles.cardSub}>Create a class and enroll students before reviewing journals.</p></div>}
      {!loading && data.classes.length > 0 && data.entries.length === 0 && <div className={styles.card}><h2 className={styles.cardTitle}>No journal entries for this class</h2><p className={styles.cardSub}>Shared reflections will appear here after students complete a session journal.</p></div>}
      <div className={styles.list}>{data.entries.map((entry) => <article className={`${styles.card} ${styles.journalCard}`} key={entry.id}>
        <div className={styles.sectionHead}><span className={styles.userCell}><span className={styles.avatar}>{entry.student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><span className={styles.listName}>{entry.student.name}</span><span className={styles.listMeta}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(entry.created_at))} · {durationLabel(entry.duration_seconds)}</span></span></span>{entry.mood && <span className={styles.badgePurple}>{entry.mood}</span>}</div>
        <strong style={{ fontSize: 11 }}>{entry.prompt}</strong>
        {entry.response_type === 'text' && <p className={styles.quote}>“{entry.text_response}”</p>}
        {entry.response_type === 'drawing' && entry.asset_url && <a className={styles.ghost} href={entry.asset_url} target="_blank" rel="noreferrer"><FileImage size={14} /> View drawing</a>}
        {entry.response_type === 'audio' && entry.asset_url && <audio controls preload="metadata" src={entry.asset_url}><a href={entry.asset_url}>Open audio reflection</a></audio>}
        <div className={styles.actions} style={{ marginTop: 12 }}><span className={styles.badge}>{entry.response_type === 'audio' && <Headphones size={10} />}{entry.response_type !== 'audio' && <Check size={10} />} {entry.tasks_completed} tasks completed</span><span className={styles.ghost}>Session record <ChevronRight size={12} /></span></div>
      </article>)}</div>
    </div>
  </TeacherDashboardTemplate>
}
