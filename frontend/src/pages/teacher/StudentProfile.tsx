import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, Download, FileCheck2, Target, TrendingUp } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { Avatar, StateBadge } from '../../components/atoms'
import { getTeacherStudentReport, type TeacherStudentReport } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import type { CognitiveState } from '../../constants/states'
import styles from './StudentProfile.module.css'

const formatDate = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const formatFocus = (value: number | null) => value === null ? 'Not recorded' : `${value}%`

export default function StudentProfile() {
  const navigate = useNavigate()
  const { classId = '', studentId = '' } = useParams()
  const user = useAuthStore((state) => state.user)!
  const [result, setResult] = useState<{ key: string; data: TeacherStudentReport } | null>(null)
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const key = `${classId}/${studentId}/${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    getTeacherStudentReport(classId, studentId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data }) })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Unable to load student profile.' }) })
    return () => controller.abort()
  }, [classId, studentId, key, attempt])
  const student = result?.key === key ? result.data : null
  const error = failure?.key === key ? failure.message : ''
  if (!student) return <TeacherDashboardTemplate user={user}><article className={styles.reportPage}>
    <button className={styles.backButton} onClick={() => navigate(`/teacher/class/${classId}/students`)} aria-label="Back to class students"><ArrowLeft size={17} /></button>
    <p role={error ? 'alert' : 'status'}>{error || 'Loading student profile...'}</p>
    {error && <button className={styles.printButton} onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
  </article></TeacherDashboardTemplate>
  const classData = student.classes.find((item) => String(item.id) === classId)!
  const sessions = student.sessions
  const hasSessions = sessions.length > 0
  const distribution = student.state_distribution
  const recentSessions = sessions.slice(0, 6).reverse()

  return (
    <TeacherDashboardTemplate user={user}>
      <article className={`${styles.reportPage} ${hasSessions ? '' : styles.emptyReport}`}>
        <header className={styles.pageHeader}>
          <div className={styles.identity}>
            <button className={styles.backButton} onClick={() => navigate(`/teacher/class/${classId}/students`)} aria-label="Back to class students">
              <ArrowLeft size={17} />
            </button>
            <Avatar name={student.name} imageUrl={student.avatar} size="lg" />
            <div>
              <span className={styles.eyebrow}>Student learning profile</span>
              <h1>{student.name}</h1>
              <p>{classData.name} · Learner record {student.student_number || student.id}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.generated}>Report date: {formatDate(new Date().toISOString())}</span>
            <button className={styles.printButton} onClick={() => window.print()}>
              <Download size={16} /> Print / Save PDF
            </button>
          </div>
        </header>

        <section className={styles.notice} aria-label="Interpretation notice">
          <FileCheck2 size={18} aria-hidden="true" />
          <p><strong>Educational use only.</strong> EEG-derived states are learning-support signals, not medical diagnoses. Interpret this report alongside teacher observation, task performance, and learner context.</p>
        </section>

        <section className={styles.detailsGrid} aria-label="Student and report details">
          <div><span>Class</span><strong>{classData.name}</strong></div>
          <div><span>Reporting period</span><strong>All completed sessions in this class</strong></div>
          <div><span>Sessions included</span><strong>{student.session_count} recorded</strong></div>
          <div><span>Last recorded session</span><strong>{sessions.length ? formatDate(sessions[0].started_at) : 'No completed sessions'}</strong></div>
        </section>

        <section className={styles.statsGrid} aria-label="Learning summary">
          <div className={styles.statCard}><TrendingUp size={19} /><span><strong>{formatFocus(student.average_focus)}</strong><small>Average focus signal</small></span></div>
          <div className={styles.statCard}><CalendarDays size={19} /><span><strong>{student.session_count}</strong><small>Sessions in report</small></span></div>
          <div className={styles.statCard}><Clock3 size={19} /><span><strong>{student.average_duration_seconds === null ? 'Not recorded' : `${Math.round(student.average_duration_seconds / 60)} min`}</strong><small>Average duration</small></span></div>
          <div className={styles.statCard}><Target size={19} /><span><strong>{student.tasks_completed}/{student.tasks_total}</strong><small>Activities answered / assigned</small></span></div>
        </section>

        <section className={styles.analyticsGrid}>
          <div className={styles.panel}>
            <div className={styles.sectionHeading}><div><span>Historical pattern</span><h2>Focus signal by session</h2></div><small>Six most recent sessions</small></div>
            {hasSessions ? <div className={styles.trendChart} role="img" aria-label={recentSessions.map((session) => `${formatDate(session.started_at)}: ${formatFocus(session.focus)}`).join('; ')}>
              {recentSessions.map((session) => <div className={styles.trendItem} key={session.id}><span>{formatFocus(session.focus)}</span><div>{session.focus !== null && <i style={{ height: `${session.focus}%` }} />}</div><small>{formatDate(session.started_at)}</small></div>)}
            </div> : <p className={styles.emptyMessage}>No completed sessions recorded yet.</p>}
          </div>

          <div className={styles.panel}>
            <div className={styles.sectionHeading}><div><span>Session states</span><h2>Observed distribution</h2></div></div>
            {hasSessions ? <div className={styles.stateList}>
              {distribution ? (Object.entries(distribution) as [CognitiveState, number][]).map(([state, value]) => <div className={styles.stateRow} key={state}><StateBadge state={state} size="sm" /><div className={styles.stateTrack}><i style={{ width: `${value}%`, background: `var(--state-${state})` }} /></div><strong>{value}%</strong></div>) : <p>No EEG state measurements recorded.</p>}
            </div> : <p className={styles.emptyMessage}>No session data recorded yet.</p>}
          </div>
        </section>

        <section className={styles.historySection}>
          <div className={styles.sectionHeading}><div><span>Detailed evidence</span><h2>Session history</h2></div><small>Values are descriptive, not diagnostic</small></div>
          {hasSessions ? <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Date</th><th>Class and activity</th><th>Duration</th><th>Focus signal</th><th>Dominant state</th><th>Mode changes</th><th>Activities answered / assigned</th></tr></thead>
              <tbody>{sessions.map((session) => <tr key={session.id}><td>{formatDate(session.started_at)}</td><td><strong>{session.class_name}</strong><small>{session.activity}</small></td><td>{Math.round(session.duration_seconds / 60)} min</td><td>{formatFocus(session.focus)}</td><td>{session.dominant ? <StateBadge state={session.dominant} size="sm" /> : 'Not recorded'}</td><td>{session.mode_changes}</td><td>{session.tasks_completed}/{session.tasks_total}</td></tr>)}{!sessions.length && <tr><td colSpan={7}>No completed sessions recorded yet.</td></tr>}</tbody>
            </table>
          </div> : <p className={styles.emptyMessage}>No completed sessions recorded yet.</p>}
        </section>

        <section className={styles.reviewSection}>
          <div><span className={styles.eyebrow}>Review context</span><h2>Expert validation and notes</h2><p>Use this area to document whether the presentation, terminology, and descriptive summaries are appropriate for educational review.</p></div>
          <div className={styles.reviewFields}><div><span>Reviewer name and role</span></div><div><span>Organization</span></div><div className={styles.notesField}><span>Findings / recommendations</span></div><div><span>Signature</span></div><div><span>Date reviewed</span></div></div>
        </section>

        <footer className={styles.reportFooter}><span>Cortex student learning profile</span><span>Confidential educational record · Generated for authorized review</span></footer>
      </article>
    </TeacherDashboardTemplate>
  )
}
