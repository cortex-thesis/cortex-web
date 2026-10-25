import CognitiveStateInfo, { cognitiveDisclaimer } from '../../components/molecules/CognitiveStateInfo'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TeacherDashboardTemplate } from '../../components/templates'
import { useAuthStore } from '../../store/authStore'
import { getTeacherClasses, type TeacherClass } from '../../lib/teacherApi'
import { controlClassSession, downloadClassReport, heartbeatClassSession, getClassSessionLessons, listClassSessions, openClassSession, type ClassroomSession, type ClassMode } from '../../lib/classSessionApi'
import styles from './ClassSession.module.css'
import { apiMediaUrl } from '../../lib/api'

const MODES: Array<[ClassMode, string]> = [['adaptive', 'EEG adaptive'], ['focus', 'Focus lesson'], ['refocus', 'Refocusing activities'], ['breathing', 'Breathing break']]

function newerSession(previous: ClassroomSession | null, incoming: ClassroomSession) {
  return previous?.id === incoming.id && previous.updated_at > incoming.updated_at ? previous : incoming
}

export default function TeacherClassSession() {
  const { classId = '', groupId = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)!
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState(classId)
  const [lessons, setLessons] = useState<Array<{ id: number; title: string; package: string }>>([])
  const [selectedLesson, setSelectedLesson] = useState('')
  const [history, setHistory] = useState<ClassroomSession[]>([])
  const [storedSession, setSession] = useState<ClassroomSession | null>(null)
  const session = storedSession?.id === groupId ? storedSession : null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)

  useEffect(() => {
    void getTeacherClasses().then(data => setClasses(data.classes.filter(item => item.status === 'active'))).catch(reason => setError(reason.message))
    void listClassSessions().then(data => setHistory(data.sessions)).catch(reason => setError(reason.message))
  }, [])
  const lessonClass = session ? String(session.class_id) : ''
  useEffect(() => {
    if (!lessonClass) return
    let cancelled = false
    void getClassSessionLessons(lessonClass).then(data => { if (!cancelled) { setLessons(data.lessons); setSelectedLesson('') } }).catch(reason => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true }
  }, [lessonClass])
  useEffect(() => {
    if (!groupId) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let delay = 3000
    const refresh = async () => {
      try { const data = await heartbeatClassSession(groupId); if (!cancelled) { setSession(previous => newerSession(previous, data)); setConnectionError(''); delay = 3000 } }
      catch { if (!cancelled) { setConnectionError('Connection interrupted. Reconnecting automatically…'); delay = Math.min(delay * 2, 15000) } }
      if (!cancelled) timer = setTimeout(() => void refresh(), delay)
    }
    void refresh()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [groupId])

  async function openLobby() {
    setBusy(true); setError('')
    try {
      const data = await openClassSession(Number(selectedClass))
      setSession(data); navigate(`/teacher/class-session/${data.id}`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to open the lobby.') }
    finally { setBusy(false) }
  }
  async function control(action: string, extra: { mode?: ClassMode; lesson_id?: number } = {}) {
    if (!session) return
    setBusy(true); setError('')
    try { const data = await controlClassSession(session.id, action, extra); setSession(previous => newerSession(previous, data)); setConfirmEnd(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The control could not be applied.') }
    finally { setBusy(false) }
  }
  async function download() {
    if (!session) return
    try { await downloadClassReport(session.id) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Download failed.') }
  }
  const ended = session?.status === 'completed' || session?.status === 'cancelled'
  const report = session?.report
  return <TeacherDashboardTemplate user={user}><p style={{ padding: '8px 24px' }}><Link to="/teacher/help#sessions">Learn about this workspace</Link></p><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Live classroom</span><h1>Teacher-led session</h1><p>{session ? `${session.class_name} · ${session.status === 'scheduled' ? 'Lobby open' : session.status}` : 'Choose a class and prepare a lesson. Students are invited when you start.'}</p></div><Link to="/teacher/sessions">All class sessions</Link></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {connectionError && <p className={styles.connection} role="status">{connectionError}</p>}
    {!groupId ? <>
      <section className={styles.panel}><h2>Prepare your classroom</h2><div className={styles.fields}>
        <label>Class<select value={selectedClass} onChange={event => setSelectedClass(event.target.value)}><option value="" disabled>Choose a class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div><button className={styles.primary} disabled={!selectedClass || busy} onClick={() => void openLobby()}>{busy ? 'Opening…' : 'Prepare lobby'}</button><p>Select a lesson, then start it to invite students. Sessions close after 60 seconds without teacher presence.</p></section>
      <section className={styles.panel}><h2>Recent sessions and reports</h2>{history.length ? history.map(item => <Link className={styles.history} key={item.id} to={`/teacher/class-session/${item.id}`}><strong>{item.class_name}</strong><span>{item.lesson_title ?? 'Lesson not selected'}</span><span>{item.status === 'completed' ? 'View overview report' : item.status === 'scheduled' ? 'Reopen lobby' : item.status}</span></Link>) : <p>No teacher-led sessions yet.</p>}</section>
    </> : !session ? <p role="status">Loading classroom…</p> : ended ? <section className={styles.panel}>
      <h2>Session overview</h2>{report ? <><p>{report.participant_count} students joined · {report.answered} activities answered · {report.correct} answered correctly</p><p>Lessons: {report.lessons.map(item => item.title).join(', ') || 'Lobby only'}</p><p>{report.started_at ? new Date(report.started_at).toLocaleString() : 'Lesson was not started'} — {new Date(report.ended_at).toLocaleString()}</p><div className={styles.controls}><button className={styles.primary} onClick={() => void download()}>Download CSV report</button><button onClick={() => window.print()}>Print / Save PDF</button></div>
      <p>{cognitiveDisclaimer}</p><p>{(['focused', 'relaxed', 'distracted', 'overstimulated'] as const).map(state => <span key={state} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 12 }}>{state[0].toUpperCase() + state.slice(1)}<CognitiveStateInfo state={state} /></span>)}</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Student</th><th>Lesson progress</th><th>Answered</th><th>Correct</th><th>Attempts</th><th>Focused</th><th>Relaxed</th><th>Distracted</th><th>Overstimulated</th></tr></thead><tbody>{report.participants.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.completed_steps ?? '—'}/{item.task_total} steps</td><td>{item.answered}</td><td>{item.correct}</td><td>{item.attempts}</td>{(['focused', 'relaxed', 'distracted', 'overstimulated'] as const).map(state => <td key={state}>{item.eeg_samples ? `${item.state_distribution[state]}%` : 'No EEG data'}</td>)}</tr>)}</tbody></table></div><details><summary>Teacher controls used</summary>{report.controls.map((item, index) => <p key={index}>{new Date(item.at).toLocaleTimeString()} · {item.action.replaceAll('_', ' ')}{item.mode ? ` · ${item.mode}` : ''}</p>)}</details></> : <p>Report unavailable.</p>}
    </section> : <>
      <section className={`${styles.panel} ${styles.sessionBar}`}>
        <div><span className={styles.badge} data-status={session.status}>{session.status === 'scheduled' ? 'Lobby open' : session.status === 'paused' ? 'Paused' : 'Live session'}</span><h2>{session.lesson_title ?? 'Select a lesson to get started'}</h2><p>{session.status === 'scheduled' ? 'Prepare your lesson, then start it to invite students.' : session.status === 'paused' ? 'Student activities are paused until you resume.' : 'Your lesson and mode choices apply to the whole class.'}</p></div>
        <button className={styles.primary} disabled={busy || !!connectionError || (session.status === 'scheduled' && !session.lesson_id)} onClick={() => void control(session.status === 'scheduled' ? 'start' : session.status === 'paused' ? 'resume' : 'pause')}>{busy ? 'Updating…' : session.status === 'scheduled' ? 'Start lesson' : session.status === 'paused' ? 'Resume session' : 'Pause session'}</button>
      </section>
      <div className={styles.workspace}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><h2>Students</h2><span className={styles.liveHint}>{connectionError ? 'Reconnecting' : 'Updates every 3 seconds'}</span></div>
          <p>{session.roster?.length ?? 0} students enrolled in this section. Invitations are sent when you start the lesson.</p>
          <button disabled={session.status === 'scheduled' || busy || !!connectionError} onClick={() => void control('invite')}>Invite students who have not joined</button>
          {!!session.roster?.some(item => !item.joined) && <details><summary>Waiting for students</summary>{session.roster.filter(item => !item.joined).map(item => <p key={item.student_id}>{item.name}</p>)}</details>}
          <div className={styles.metrics}><div><strong>{session.participants?.length ?? 0}</strong><span>Joined</span></div><div><strong>{session.participants?.filter(item => item.online).length ?? 0}</strong><span>Online</span></div><div><strong>{session.participants?.filter(item => item.online && item.signal_fresh).length ?? 0}</strong><span>EEG connected</span></div></div>
          {session.participants?.length ? <div className={styles.tableWrap}><table><thead><tr><th>Student</th><th>Status / EEG</th><th>Progress</th></tr></thead><tbody>{session.participants.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td><span className={styles.status}>{item.status === 'completed' ? 'Completed' : !item.online ? 'Offline' : item.status === 'lobby' ? 'In lobby' : item.status === 'paused' ? 'Paused' : 'Learning'}</span><small>{item.state && item.signal_fresh ? `${item.state.charAt(0).toUpperCase()}${item.state.slice(1)} · ${item.signal_channels}/4 clear channels` : 'Waiting for EEG signal'}</small></td><td><strong>{item.lesson_progress_percentage ?? 0}%</strong><small>{item.lesson_completed_steps ?? 0}/{item.lesson_step_total ?? 0} lesson steps complete</small><small>{item.answered} answered · {item.correct} correct</small></td></tr>)}</tbody></table></div> : <div className={styles.empty}><strong>Your classroom is ready</strong><p>Students will appear here when they accept the lobby invitation.</p></div>}
        </section>
        <aside className={`${styles.panel} ${styles.controlPanel}`}>
          <h2>Session controls</h2><label className={styles.lessonField}>Lesson<select value={selectedLesson} disabled={busy || !!connectionError} onChange={event => setSelectedLesson(event.target.value)}><option value="">{session.lesson_title ?? 'Choose a lesson'}</option>{lessons.map(item => <option key={item.id} value={item.id}>{item.package} · {item.title}</option>)}</select></label>
          <button className={styles.apply} disabled={!selectedLesson || Number(selectedLesson) === session.lesson_id || busy || !!connectionError} onClick={() => void control('set_lesson', { lesson_id: Number(selectedLesson) })}>Apply lesson</button>
          {session.lesson && <details><summary>Lesson data and references</summary><p>{session.lesson.title} · {session.lesson.slides.length} steps</p><ol>{session.lesson.slides.map(slide => <li key={slide.id}>{slide.title} <small>({slide.activity.type})</small>{slide.activity.asset_url && <p><a href={apiMediaUrl(slide.activity.asset_url)} target="_blank" rel="noreferrer">Open reference material</a></p>}</li>)}</ol></details>}
          <h3>Class mode</h3><div className={styles.modeOptions}>{MODES.map(([mode, label]) => <button key={mode} disabled={busy || !!connectionError} aria-pressed={session.presentation_mode === mode} onClick={() => void control('set_mode', { mode })}><span>{label}</span><small>{mode === 'adaptive' ? 'Each student follows their own EEG state' : mode === 'focus' ? 'Continue lesson activities' : mode === 'refocus' ? 'A short activity to reset attention' : 'Slow down with guided breathing'}</small></button>)}</div>
          <div className={styles.endArea}>{confirmEnd ? <><p>End for everyone and save the overview report?</p><div className={styles.controls}><button className={styles.end} disabled={busy || !!connectionError} onClick={() => void control('end')}>End and save report</button><button disabled={busy} onClick={() => setConfirmEnd(false)}>Cancel</button></div></> : <button className={styles.endLink} disabled={busy || !!connectionError} onClick={() => setConfirmEnd(true)}>End session</button>}</div>
        </aside>
      </div>
    </>}
  </div></TeacherDashboardTemplate>
}
