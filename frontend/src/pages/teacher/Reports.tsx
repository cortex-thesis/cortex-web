import { SchoolYearOptions } from './SchoolYearOptions'
import CognitiveStateInfo, { cognitiveDisclaimer } from '../../components/molecules/CognitiveStateInfo'
import { useReportYear, type ReportYearData } from './reportingYears'
import { useEffect, useState } from 'react'
import { Download, LineChart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TeacherDashboardTemplate } from '../../components/templates'
import { CardGridSkeleton, TableSkeleton } from '../../components/molecules'
import { Logo } from '../../components/atoms'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from '../prototype/Prototype.module.css'

type RangeKey = 'week' | 'month' | 'term'
interface ReportData extends ReportYearData {
  classes: Array<{ id: number; name: string }>
  students: Array<{ id: number; name: string }>
  selected_class_id: number | null
  selected_student_id: number | null
  selected_student_name: string | null
  class_name: string | null
  school_year: string
  range: RangeKey
  start_date: string | null
  end_date: string
  prepared_by: string
  summary: { sessions: number; participating_students: number; average_focus_percentage: number; focused_duration_seconds: number; total_duration_seconds: number; mode_changes: number; tasks_completed: number }
  state_distribution: Record<'focused' | 'relaxed' | 'distracted' | 'overstimulated', number>
  sessions: Array<{ id: string; date: string; student: { name: string }; duration_seconds: number; focus_percentage: number; tasks_completed: number; mode_changes: number }>
}

function durationLabel(seconds: number) {
  const minutes = Math.round(seconds / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}

function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : 'Beginning of term'
}

export default function Reports() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)!
  const [range, setRange] = useState<RangeKey>('month')
  const { schoolYear, setSchoolYear, yearQuery } = useReportYear()
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const query = new URLSearchParams({ range })
    if (classId) query.set('class_id', classId)
    if (studentId) query.set('student_id', studentId)
    if (schoolYear) query.set('school_year', schoolYear)
    let cancelled = false
    void api<ReportData>(`/teacher/reports/?${query}`)
      .then((payload) => { if (cancelled) return; setData(payload); if (!schoolYear) setSchoolYear(payload.selected_school_year); if (!classId && payload.selected_class_id) setClassId(String(payload.selected_class_id)) })
      .catch((reason: Error) => { if (!cancelled) setError(reason.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [classId, range, studentId, schoolYear, setSchoolYear])

  const states = data ? [
    ['Focused', data.state_distribution.focused, 'var(--state-focused)'],
    ['Relaxed', data.state_distribution.relaxed, 'var(--state-relaxed)'],
    ['Distracted', data.state_distribution.distracted, 'var(--state-distracted)'],
    ['Overstimulated', data.state_distribution.overstimulated, 'var(--state-overstimulated)'],
  ] as const : []

  return <TeacherDashboardTemplate user={user}>
    <div className={styles.page}>
      <div className={styles.header}><div><span className={styles.eyebrow}>Reporting</span><h1 className={styles.title}>Class engagement report</h1><p className={styles.subtitle}>A print-ready summary calculated from completed learning sessions.</p></div><div className={styles.actions}>
        <select aria-label="School year" className={styles.select} value={schoolYear || data?.selected_school_year || 'all'} onChange={event => { setClassId(''); setStudentId(''); setLoading(true); setError(''); setSchoolYear(event.target.value) }}><SchoolYearOptions years={data?.school_years} /></select><select aria-label="Class" className={styles.select} value={classId} onChange={(event) => { setLoading(true); setError(''); setStudentId(''); setClassId(event.target.value) }} disabled={!data?.classes.length}>{data?.classes.length ? data.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : <option>No classes</option>}</select>
        <select aria-label="Student" className={styles.select} value={studentId} onChange={(event) => { setLoading(true); setError(''); setStudentId(event.target.value) }} disabled={!data?.students.length}><option value="">All students</option>{data?.students.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select aria-label="Report period" className={styles.select} value={range} onChange={(event) => { setLoading(true); setError(''); setRange(event.target.value as RangeKey) }}><option value="week">This week</option><option value="month">This month</option><option value="term">Current term</option></select>
        <button className={styles.secondary} onClick={() => navigate(`/teacher/reports/advanced${yearQuery}`)}><LineChart size={14} /> Advanced reports</button><button className={styles.primary} onClick={() => window.print()} disabled={!data?.class_name}><Download size={14} /> Print / Save PDF</button>
      </div></div>
      {error && <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">{error}</div>}
      {loading && <div className={styles.card}><CardGridSkeleton count={4} /><div className={styles.section}><TableSkeleton rows={6} columns={6} /></div></div>}
      {!loading && !error && data && !data.class_name && <div className={styles.card}><h2 className={styles.cardTitle}>No classes for this school year</h2><p className={styles.cardSub}>No classes are assigned to the selected school year. Choose another year or assign a year when creating a class.</p></div>}
      {!loading && !error && data?.class_name && <div className={styles.card}>
        <div className={styles.sectionHead}><div><h2 className={styles.cardTitle}>{data.selected_student_name ? `${data.selected_student_name} · ${data.class_name}` : data.class_name}</h2><p className={styles.cardSub}>{dateLabel(data.start_date)} – {dateLabel(data.end_date)} · Prepared for {data.prepared_by}</p></div><Logo variant="icon" size="sm" /></div>
        <div className={styles.divider} />
        <div className={styles.grid4}>{[[String(data.summary.sessions), 'Completed sessions'], [`${data.summary.average_focus_percentage}%`, 'Average focus'], [durationLabel(data.summary.focused_duration_seconds), 'Focused duration'], [String(data.summary.mode_changes), 'Mode changes']].map(([value, label]) => <div key={label}><span className={styles.statValue}>{value}</span><span className={styles.statLabel}>{label}</span></div>)}</div>
        <div className={styles.section}><h3 className={styles.sectionTitle}>Cognitive-state distribution</h3><p className={styles.muted}>{cognitiveDisclaimer}</p><div className={styles.list} style={{ marginTop: 12 }}>{states.map(([name, value, color]) => <div className={styles.listItem} key={name}><strong style={{ flex: '0 0 140px', fontSize: 11 }}>{name}<CognitiveStateInfo state={name.toLowerCase() as keyof ReportData['state_distribution']} /></strong><div className={styles.progress} style={{ flex: 1, minWidth: 0 }}><div className={styles.progressFill} style={{ width: `${value}%`, background: color }} /></div><strong>{value}%</strong></div>)}</div></div>
        <div className={`${styles.grid4} ${styles.section}`}>{[[String(data.summary.participating_students), 'Students'], [String(data.summary.tasks_completed), 'Tasks completed'], [durationLabel(data.summary.total_duration_seconds), 'Learning time'], [data.school_year || '—', 'School year']].map(([value, label]) => <div key={label}><span className={styles.statValue}>{value}</span><span className={styles.statLabel}>{label}</span></div>)}</div>
        <div className={styles.section}><h3 className={styles.sectionTitle}>Session details</h3>{data.sessions.length === 0 ? <p className={styles.muted}>No completed sessions were recorded during this period.</p> : <div className={styles.tableWrap} style={{ marginTop: 12 }}><table className={styles.table}><thead><tr><th>Date</th><th>Student</th><th>Duration</th><th>Focus</th><th>Tasks</th><th>Mode changes</th></tr></thead><tbody>{data.sessions.map((session) => <tr key={session.id}><td>{dateLabel(session.date)}</td><td>{session.student.name}</td><td>{durationLabel(session.duration_seconds)}</td><td>{session.focus_percentage}%</td><td>{session.tasks_completed}</td><td>{session.mode_changes}</td></tr>)}</tbody></table></div>}</div>
      </div>}
    </div>
  </TeacherDashboardTemplate>
}
