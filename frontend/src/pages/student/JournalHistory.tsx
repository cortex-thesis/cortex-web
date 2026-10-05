import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { apiMediaUrl } from '../../lib/api'
import { getStudentJournalHistory, type StudentJournalHistoryEntry } from '../../lib/studentApi'
import styles from './JournalHistory.module.css'

function localDate(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function JournalHistory() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<StudentJournalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [date, setDate] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void getStudentJournalHistory().then(data => {
      if (active) { setEntries(data.entries); setError(''); setLoading(false) }
    }).catch((reason: unknown) => {
      if (active) { setError(reason instanceof Error ? reason.message : 'Unable to load your journals.'); setLoading(false) }
    })
    return () => { active = false }
  }, [attempt])

  const sessions = [...new Map(entries.map(entry => [entry.session_id, entry])).values()]
  const visible = entries.filter(entry => (!sessionId || entry.session_id === sessionId) && (!date || localDate(entry.session_started_at) === date))

  return <PlayfulZoneTemplate showNav={false} showHeader>
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.button} aria-label="Back to journal" onClick={() => navigate('/student/journal')}><ArrowLeft size={20} /></button>
        <div><h1>My journal history</h1><p>Look back at what you learned and how you felt.</p></div>
      </header>
      <section className={styles.filters} aria-label="Filter journal history">
        <label>Session<select value={sessionId} onChange={event => setSessionId(event.target.value)}>
          <option value="">All sessions</option>
          {sessions.map(entry => <option key={entry.session_id} value={entry.session_id}>{entry.session_title} · {new Date(entry.session_started_at).toLocaleString()}</option>)}
        </select></label>
        <label>Session date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
        <button className={styles.button} onClick={() => { setDate(''); setSessionId('') }}>Clear filters</button>
      </section>
      {loading && <p role="status">Loading your journals...</p>}
      {error && <p role="alert">{error} <button className={styles.button} onClick={() => { setLoading(true); setError(''); setAttempt(value => value + 1) }}>Retry</button></p>}
      {!loading && !error && !visible.length && <p>{entries.length ? 'No journals match these filters.' : 'Your saved journals will appear here after a learning session.'}</p>}
      <div className={styles.entries}>{visible.map(entry => <article className={styles.card} key={entry.id}>
        <h2>{entry.session_title}</h2>
        <p className={styles.meta}>{entry.class_name} · Session: {new Date(entry.session_started_at).toLocaleString()}</p>
        <p className={styles.meta}>Journal saved: {new Date(entry.created_at).toLocaleString()}{entry.mood && ` · Feeling ${entry.mood}`}</p>
        <h3>{entry.prompt}</h3>
        {entry.response_type === 'text' && <p className={styles.response}>{entry.text_response}</p>}
        {entry.response_type === 'drawing' && entry.asset_url && <a href={apiMediaUrl(entry.asset_url)} target="_blank" rel="noreferrer"><img className={styles.drawing} src={apiMediaUrl(entry.asset_url)} alt="Your saved journal drawing" loading="lazy" /></a>}
        {entry.response_type === 'audio' && entry.asset_url && <audio controls preload="none" src={apiMediaUrl(entry.asset_url)} aria-label="Your saved journal recording" />}
        {entry.response_type !== 'text' && !entry.asset_url && <p>The saved media is unavailable.</p>}
      </article>)}</div>
    </div>
  </PlayfulZoneTemplate>
}
