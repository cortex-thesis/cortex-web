import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, CalendarDays, ChevronRight, Clock, Play, Search } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { StateBadge } from '../../components/atoms'
import type { CognitiveState } from '../../constants/states'
import styles from './Sessions.module.css'

type SessionFilter = 'all' | 'completed' | 'in_progress'

const MOCK_SESSIONS = [
  { id: 'session-001', title: 'Getting Ready for School', className: 'Life Skills', date: 'Today, 9:15 AM', duration: '24 min', focus: 78, state: 'focused' as CognitiveState, status: 'in_progress' as const, tasks: '3 of 5 tasks' },
  { id: 'session-002', title: 'Packing My School Bag', className: 'Independent Living Skills', date: 'August 25, 2026', duration: '31 min', focus: 74, state: 'focused' as CognitiveState, status: 'completed' as const, tasks: '5 of 5 tasks' },
  { id: 'session-003', title: 'Four-count Breathing', className: 'Self-Regulation', date: 'August 22, 2026', duration: '18 min', focus: 67, state: 'relaxed' as CognitiveState, status: 'completed' as const, tasks: '4 of 4 activities' },
  { id: 'session-004', title: 'Reading a Bus Schedule', className: 'Functional Academics', date: 'August 19, 2026', duration: '28 min', focus: 69, state: 'distracted' as CognitiveState, status: 'completed' as const, tasks: '4 of 5 tasks' },
]

function getFocusDescription(score: number) {
  if (score >= 80) return 'Excellent focus'
  if (score >= 70) return 'Steady focus'
  if (score >= 60) return 'Growing focus'
  return 'Finding your rhythm'
}

function getFocusEmoji(score: number) {
  if (score >= 80) return '🌟'
  if (score >= 70) return '💪'
  if (score >= 60) return '🌱'
  return '✨'
}

export default function Sessions() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [search, setSearch] = useState('')

  const sessions = MOCK_SESSIONS.filter((session) => {
    const matchesFilter = filter === 'all' || session.status === filter
    const query = search.trim().toLowerCase()
    return matchesFilter && (!query || session.title.toLowerCase().includes(query) || session.className.toLowerCase().includes(query))
  })

  return (
    <PlayfulZoneTemplate>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>My learning</span>
            <h1 className={styles.title}>Sessions</h1>
            <p className={styles.subtitle}>Continue a lesson or look back at your learning history.</p>
          </div>
          <button className={styles.startBtn} onClick={() => navigate('/student/eeg-pairing')}>
            <Play size={16} fill="currentColor" /> New session
          </button>
        </header>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}><span className={styles.summaryIcon}><CalendarDays size={19}/></span><span><strong>24</strong><small>Sessions completed</small></span></div>
          <div className={styles.summaryCard}><span className={styles.summaryIcon} aria-hidden="true">{getFocusEmoji(74)}</span><span><strong>{getFocusDescription(74)}</strong><small>Overall performance</small></span></div>
          <div className={styles.summaryCard}><span className={styles.summaryIcon}><Clock size={19}/></span><span><strong>11h 42m</strong><small>Learning time</small></span></div>
        </div>

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
          {sessions.map((session) => (
            <article className={styles.sessionCard} key={session.id}>
              <div className={styles.sessionIcon}><Brain size={21}/></div>
              <div className={styles.sessionMain}>
                <div className={styles.sessionTop}>
                  <div><span className={styles.className}>{session.className}</span><h2>{session.title}</h2></div>
                </div>
                <div className={styles.meta}><span>{session.date}</span><span>{session.duration}</span><span>{session.tasks}</span><span>{getFocusEmoji(session.focus)} {getFocusDescription(session.focus)}</span></div>
              </div>
              {session.status === 'in_progress' ? <span className={`${styles.inProgress} ${styles.sessionStatus}`}>Keep going</span> : <StateBadge state={session.state} size="sm" className={styles.sessionStatus}/>} 
              <button className={styles.openBtn} onClick={() => navigate(session.status === 'in_progress' ? '/student/eeg-pairing' : '/student/session-summary')} aria-label={`Open ${session.title}`}><ChevronRight size={18}/></button>
            </article>
          ))}
          {sessions.length === 0 && <div className={styles.empty}>No sessions match your search.</div>}
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
