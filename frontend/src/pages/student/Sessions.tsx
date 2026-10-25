import { getFocusPerformance } from '../../lib/focusPerformance'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, CalendarDays, ChevronRight, Clock, Play, Search } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, ListSkeleton } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { getStudentSessions, resumeStudentSession, type StudentSessionItem, type StudentSessionsData } from '../../lib/studentApi'
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
  const inProgressCount = (data?.sessions ?? []).filter((session) => session.status === 'in_progress').length
  const totalSeconds = data?.summary.total_duration_seconds ?? 0
  const learningTime = `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`
  const emptyMessage = search.trim() ? 'No sessions match your search.' : filter === 'in_progress' ? 'No sessions in progress.' : filter === 'completed' ? 'No completed sessions yet.' : 'No learning sessions yet.'

  async function openSession(session: StudentSessionItem) {
    if (session.status === 'completed') {
      navigate('/student/session-summary', { state: { summary: { sessionId: session.id, duration: session.duration_seconds, focusScore: session.focus_score, stateDistribution: session.state_distribution, taskCompleted: session.tasks_completed, taskTotal: session.tasks_total } } })
      return
    }
    try {
      const resumed = await resumeStudentSession(session.id)
      if (resumed.class_session_id) navigate('/student/class-session/' + resumed.class_session_id)
      else navigate('/student/eeg-pairing', { state: { classId: resumed.class_id, lessonId: resumed.lesson_id ?? undefined, sessionId: resumed.id } })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue this session.')
    }
  }

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
          <div className={styles.summaryCard}><span className={styles.summaryIcon} aria-hidden="true"><Play size={18}/></span><span><strong>{inProgressCount}</strong><small>Sessions in progress</small></span></div>
          <div className={styles.summaryCard}><span className={styles.summaryIcon}><Clock size={19}/></span><span><strong>{learningTime}</strong><small>Learning time</small></span></div>
        </div>}

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon}/>
            <input className={styles.searchInput} value={search} onChange={(event) => setSearch(event.target.value)} data-tour="student-session-search" placeholder="Search sessions..."/>
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
                <div className={styles.meta}><span>{session.status === 'in_progress' ? 'Last opened' : 'Started'} {new Date(session.last_opened_at ?? session.ended_at ?? session.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span><span>{Math.max(1, Math.round(session.duration_seconds / 60))} min</span><span>{session.tasks_completed} of {session.tasks_total} tasks</span><span>{getFocusPerformance(session.focus_score, session.state_distribution).emoji} {getFocusPerformance(session.focus_score, session.state_distribution).phrase}</span></div>
              </div>
              {session.status === 'in_progress' ? <span className={`${styles.inProgress} ${styles.sessionStatus}`}>{session.is_live ? 'Live now' : 'In progress'}</span> : session.state ? <StateBadge state={session.state} size="sm" className={styles.sessionStatus}/> : <span className={styles.sessionStatus}>No EEG data</span>}
              <button className={styles.openBtn} onClick={() => void openSession(session)} aria-label={session.status === 'in_progress' ? `Continue ${session.title}` : `Open ${session.title}`}>{session.status === 'in_progress' ? <><span>Continue</span><ChevronRight size={17}/></> : <ChevronRight size={18}/>}</button>
            </article>
          ))}
          {data && sessions.length === 0 && <div className={styles.empty}>{emptyMessage}</div>}
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
