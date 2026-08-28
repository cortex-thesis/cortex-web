import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, Download, FileCheck2, Target, TrendingUp } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { Avatar, StateBadge } from '../../components/atoms'
import { mockClasses, mockStudentsLive, mockTeacher } from '../../mocks'
import type { CognitiveState } from '../../constants/states'
import styles from './StudentProfile.module.css'

const SESSION_HISTORY = [
  { date: 'Aug 28, 2026', className: 'Life Skills', activity: 'Morning Routine', duration: 26, focus: 82, dominant: 'focused' as CognitiveState, tasks: '4/4', changes: 1 },
  { date: 'Aug 25, 2026', className: 'Life Skills', activity: 'Packing My Bag', duration: 31, focus: 76, dominant: 'focused' as CognitiveState, tasks: '5/5', changes: 2 },
  { date: 'Aug 22, 2026', className: 'Self Care', activity: 'Four-count Breathing', duration: 18, focus: 67, dominant: 'relaxed' as CognitiveState, tasks: '4/4', changes: 2 },
  { date: 'Aug 19, 2026', className: 'Life Skills', activity: 'Reading a Schedule', duration: 28, focus: 69, dominant: 'distracted' as CognitiveState, tasks: '4/5', changes: 3 },
  { date: 'Aug 15, 2026', className: 'Life Skills', activity: 'Getting Ready', duration: 24, focus: 73, dominant: 'focused' as CognitiveState, tasks: '5/5', changes: 1 },
  { date: 'Aug 12, 2026', className: 'Self Care', activity: 'Calm Break', duration: 20, focus: 64, dominant: 'relaxed' as CognitiveState, tasks: '3/4', changes: 2 },
]

const STATE_SUMMARY: { state: CognitiveState; value: number }[] = [
  { state: 'focused', value: 64 },
  { state: 'relaxed', value: 19 },
  { state: 'distracted', value: 12 },
  { state: 'overstimulated', value: 5 },
]

export default function StudentProfile() {
  const navigate = useNavigate()
  const { classId = 'class-001', studentId = 'student-001' } = useParams()
  const student = mockStudentsLive.find((item) => item.id === studentId) ?? mockStudentsLive[0]
  const classData = mockClasses.find((item) => item.id === classId) ?? mockClasses[0]
  const averageFocus = Math.round(SESSION_HISTORY.reduce((total, item) => total + item.focus, 0) / SESSION_HISTORY.length)
  const averageDuration = Math.round(SESSION_HISTORY.reduce((total, item) => total + item.duration, 0) / SESSION_HISTORY.length)

  return (
    <TeacherDashboardTemplate user={mockTeacher}>
      <article className={styles.reportPage}>
        <header className={styles.pageHeader}>
          <div className={styles.identity}>
            <button className={styles.backButton} onClick={() => navigate(`/teacher/class/${classId}/students`)} aria-label="Back to class students">
              <ArrowLeft size={17} />
            </button>
            <Avatar name={student.name} imageUrl={student.avatar} size="lg" />
            <div>
              <span className={styles.eyebrow}>Student learning profile</span>
              <h1>{student.name}</h1>
              <p>{classData.name} · Learner record {student.id.toUpperCase()}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.generated}>Report date: Aug 29, 2026</span>
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
          <div><span>Reporting period</span><strong>August 2026</strong></div>
          <div><span>Sessions included</span><strong>{SESSION_HISTORY.length} recorded</strong></div>
          <div><span>Last recorded session</span><strong>Aug 28, 2026</strong></div>
        </section>

        <section className={styles.statsGrid} aria-label="Learning summary">
          <div className={styles.statCard}><TrendingUp size={19} /><span><strong>{averageFocus}%</strong><small>Average focus signal</small></span></div>
          <div className={styles.statCard}><CalendarDays size={19} /><span><strong>{SESSION_HISTORY.length}</strong><small>Sessions in report</small></span></div>
          <div className={styles.statCard}><Clock3 size={19} /><span><strong>{averageDuration} min</strong><small>Average duration</small></span></div>
          <div className={styles.statCard}><Target size={19} /><span><strong>25/27</strong><small>Tasks completed</small></span></div>
        </section>

        <section className={styles.analyticsGrid}>
          <div className={styles.panel}>
            <div className={styles.sectionHeading}><div><span>Historical pattern</span><h2>Focus signal by session</h2></div><small>Six most recent sessions</small></div>
            <div className={styles.trendChart} role="img" aria-label="Focus signal scores of 82, 76, 67, 69, 73, and 64 percent">
              {SESSION_HISTORY.slice().reverse().map((session) => <div className={styles.trendItem} key={session.date}><span>{session.focus}%</span><div><i style={{ height: `${session.focus}%` }} /></div><small>{session.date.slice(0, 6)}</small></div>)}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.sectionHeading}><div><span>Session states</span><h2>Observed distribution</h2></div></div>
            <div className={styles.stateList}>
              {STATE_SUMMARY.map(({ state, value }) => <div className={styles.stateRow} key={state}><StateBadge state={state} size="sm" /><div className={styles.stateTrack}><i style={{ width: `${value}%`, background: `var(--state-${state})` }} /></div><strong>{value}%</strong></div>)}
            </div>
          </div>
        </section>

        <section className={styles.historySection}>
          <div className={styles.sectionHeading}><div><span>Detailed evidence</span><h2>Session history</h2></div><small>Values are descriptive, not diagnostic</small></div>
          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Date</th><th>Class and activity</th><th>Duration</th><th>Focus signal</th><th>Dominant state</th><th>Mode changes</th><th>Tasks</th></tr></thead>
              <tbody>{SESSION_HISTORY.map((session) => <tr key={session.date}><td>{session.date}</td><td><strong>{session.className}</strong><small>{session.activity}</small></td><td>{session.duration} min</td><td>{session.focus}%</td><td><StateBadge state={session.dominant} size="sm" /></td><td>{session.changes}</td><td>{session.tasks}</td></tr>)}</tbody>
            </table>
          </div>
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
