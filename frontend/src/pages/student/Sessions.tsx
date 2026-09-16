import { getFocusPerformance } from '../../lib/focusPerformance'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, CalendarDays, ChevronRight, Clock, Play, Search } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, ListSkeleton } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { getStudentSessions, type StudentSessionsData } from '../../lib/studentApi'
import styles from './Sessions.module.css'

type SessionFilter = 'all' | 'completed' | 'in_progress'



export default function Sessions() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<StudentSessionsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void getStudentSessions().then(setData).catch((reason: Error) => setError(reason.message))
  }, [])

  const sessions = (data?.sessions ?? []).filter((session) => {
    const matchesFilter = filter === 'all' || session.status === filter
    const query = search.trim().toLowerCase()
    return matchesFilter && (!query || session.title.toLowerCase().includes(query) || session.class_name.toLowerCase().includes(query))
  })
  const completed = data?.summary.completed_sessions ?? 0
  const averageFocus = data?.summary.average_focus_score ?? 0
  const totalSeconds = data?.summary.total_duration_seconds ?? 0
  const learningTime = `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`

  return (
    <PlayfulZoneTemplate>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>My learning</span>
            <h1 className={styles.title}>Sessions</h1>
            <p className={styles.subtitle}>Continue a lesson or look back at your learning history.</p>
          </div>
          <button className={styles.startBtn} onClick={() => navigate('/student/classes')}>
            <Play size={16} fill="currentColor" /> New session
          </button>
        </header>

        {!data && !error ? <CardGridSkeleton count={3} /> : <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}><span className={styles.summaryIcon}><CalendarDays size={19}/></span><span><strong>{completed}</strong><small>Sessions completed</small></span></div>
          <div className={styles.summaryCard}><span className={styles.summaryIcon} aria-hidden="true">{getFocusPerformance(averageFocus).emoji}</span><span><strong>{completed ? getFocusPerformance(averageFocus).phrase : 'No sessions yet'}</strong><small>Overall performance</small></span></div>
          <div className={styles.summaryCard}><span className={styles.summaryIcon}><Clock size={19}/></span><span><strong>{learningTime}</strong><small>Learning time</small></span></div>
        </div>}

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon}/>
            <input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sessions..."/>
          </div>
          <div className={styles.filters}>
            {([['all','All'],['in_progress','In progress'],['completed','Completed']] as const).map(([value,label]) => <button key={value} className={`${styles.filterBtn} ${filter === value ? styles.filterActive : ''}`} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
        </div>

        <div className={styles.list}>
          {!data && !error && <ListSkeleton rows={5} />}
          {error && <div className={styles.empty}>{error}</div>}
          {sessions.map((session) => (
            <article className={styles.sessionCard} key={session.id}>
              <div className={styles.sessionIcon}><Brain size={21}/></div>
              <div className={styles.sessionMain}>
                <div className={styles.sessionTop}>
                  <div><span className={styles.className}>{session.class_name}</span><h2>{session.title}</h2></div>
                </div>
                <div className={styles.meta}><span>{new Date(session.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span><span>{Math.max(1, Math.round(session.duration_seconds / 60))} min</span><span>{session.tasks_completed} of {session.tasks_total} tasks</span><span>{getFocusPerformance(session.focus_score, session.state_distribution).emoji} {getFocusPerformance(session.focus_score, session.state_distribution).phrase}</span></div>
              </div>
              {session.status === 'in_progress' ? <span className={`${styles.inProgress} ${styles.sessionStatus}`}>Keep going</span> : <StateBadge state={session.state} size="sm" className={styles.sessionStatus}/>} 
              <button className={styles.openBtn} onClick={() => navigate(session.status === 'in_progress' ? session.class_session_id ? '/student/class-session/' + session.class_session_id : '/student/eeg-pairing' : '/student/session-summary', session.status === 'completed' ? { state: { summary: { sessionId: session.id, duration: session.duration_seconds, focusScore: session.focus_score, stateDistribution: session.state_distribution, taskCompleted: session.tasks_completed, taskTotal: session.tasks_total } } } : { state: { classId: session.class_id, lessonId: session.lesson_id ?? undefined, sessionId: session.id } })} aria-label={`Open ${session.title}`}><ChevronRight size={18}/></button>
            </article>
          ))}
          {data && sessions.length === 0 && <div className={styles.empty}>No sessions match your search.</div>}
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
