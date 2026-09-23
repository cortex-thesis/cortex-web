import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, Target, TrendingUp, Users } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import DashboardTrends from './DashboardTrends'
import LessonStateChart from './LessonStateChart'
import StateTrend from './StateTrend'
import dashboardStyles from './Dashboard.module.css'
import { getClassAnalytics, getTeacherDashboard, type TeacherDashboardData, type ClassAnalyticsData } from '../../lib/teacherApi'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import { useAuthStore } from '../../store/authStore'
import styles from './Analytics.module.css'
import trendStyles from './ClassAnalytics.module.css'

const states: CognitiveState[] = ['overstimulated', 'distracted', 'relaxed', 'focused']


export default function ClassAnalytics() {
  const { classId = '' } = useParams()
  const user = useAuthStore(state => state.user)!
  const [data, setData] = useState<ClassAnalyticsData | null>(null)
  const [report, setReport] = useState<TeacherDashboardData | null>(null)
  const [reportKey, setReportKey] = useState('')
  const [reportError, setReportError] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [month, setMonth] = useState('all')
  const [error, setError] = useState('')
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setError(''); setData(null); setLessonId(''); setTrendLoading(false); setTrendError('')
    void getClassAnalytics(classId, '', controller.signal, month).then(setData).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [classId, month])
  useEffect(() => {
    if (!lessonId) return
    const controller = new AbortController()
    setTrendLoading(true); setTrendError('')
    void getClassAnalytics(classId, lessonId, controller.signal, month).then(incoming => {
      setData(previous => previous?.class.id === Number(classId) ? { ...previous,
        slides: incoming.slides, timeline: incoming.timeline, selected_lesson_id: incoming.selected_lesson_id } : previous)
    }).catch((reason: Error) => { if (!controller.signal.aborted) setTrendError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setTrendLoading(false) })
    return () => controller.abort()
  }, [classId, lessonId, month])
  useEffect(() => {
    let disposed = false
    void getTeacherDashboard(month, classId, { period: month === 'all' ? 'all' : 'month' }).then(result => {
      if (!disposed) { setReport(result); setReportKey(classId + ':' + month); setReportError('') }
    }).catch((reason: Error) => { if (!disposed) { setReport(null); setReportKey(classId + ':' + month); setReportError(reason.message) } })
    return () => { disposed = true }
  }, [classId, month])
  const currentReport = reportKey === classId + ':' + month ? report : null
  const currentReportError = reportKey === classId + ':' + month ? reportError : ''
  const distribution = currentReport?.state_distribution
  const hasSamples = Boolean(currentReport?.reporting.sample_count)
  let angle = 0
  const segments = states.map(state => { const start = angle; angle += (distribution?.[state] ?? 0) * 3.6; return `${COGNITIVE_STATES[state].color} ${start}deg ${angle}deg` })
  return <TeacherTabTemplate user={user} title={`Class · ${data?.class.name ?? ''}`} tabs={[
    { label: 'Overview', path: `/teacher/class/${classId}/overview` },
    { label: 'Students', path: `/teacher/class/${classId}/students` },
    { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
  ]}><div className={styles.content}>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading class analytics…</p>}
    {data && <>
      <div className={trendStyles.filters}><label>Student <input type="search" placeholder="Search by name" value={studentSearch} onChange={event => setStudentSearch(event.target.value)} /></label><label>Period <select value={month === 'all' ? 'all' : 'month'} onChange={event => setMonth(event.target.value === 'all' ? 'all' : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))}><option value="all">All time</option><option value="month">Monthly</option></select></label>{month !== 'all' && <label>Month <input type="month" value={month} onChange={event => event.target.value && setMonth(event.target.value)} /></label>}</div>
      <div className={styles.statsRow}>
        <StatSummaryCard value={data.student_count} label="Students" icon={<Users size={18} />} />
        <StatSummaryCard value={data.session_count} label="Total sessions" icon={<Clock size={18} />} sub={`${data.active_sessions} open sessions`} />
        <StatSummaryCard value={currentReport?.average_focus == null ? '—' : `${currentReport.average_focus}%`} label="Focused EEG samples" icon={<TrendingUp size={18} />} />
        <StatSummaryCard value={data.completion_rate == null ? '—' : `${data.completion_rate}%`} label="Completion rate" icon={<Target size={18} />} />
      </div>
      {currentReportError && <p role="alert">Comparison unavailable: {currentReportError}</p>}
      {currentReport ? (month === 'all' ? <p className={dashboardStyles.statsNote}>Choose Monthly to compare with the previous period.</p> : <DashboardTrends data={currentReport} />) : !currentReportError && <p role="status">Loading period comparison...</p>}
      <div className={styles.chartsRow}>
        <section className={styles.chartCard}><h2 className={styles.chartTitle}>Average focus by student</h2><div className={styles.barList}>{data.students.filter(student => student.name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => <div key={student.id} className={styles.barRow}><span className={styles.barLabel}>{student.name}</span><div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${student.average_focus ?? 0}%`, background: 'var(--color-teal)' }} /></div><span className={styles.barValue}>{student.average_focus == null ? '—' : `${student.average_focus}%`}</span></div>)}{!data.students.length && <p>No enrolled students.</p>}</div></section>
        <section className={styles.donutCard}><div className={styles.chartHeader}><h2 className={styles.chartTitle}>State distribution</h2><span className={styles.chartSub}>{month === 'all' ? 'All time' : new Date(`${month}-01T00:00:00`).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span></div><div className={styles.donutWrap}><div className={styles.donut} style={{ background: angle ? `conic-gradient(${segments.join(', ')})` : 'var(--color-surface-1)' }}><div className={styles.donutHole}><span className={styles.donutPct}>{hasSamples ? `${distribution?.focused}%` : '\u2014'}</span><span className={styles.donutLbl}>{hasSamples ? 'focused' : 'no data'}</span></div></div><div className={styles.legend}>{states.map(state => <div key={state} className={styles.legendItem}><span className={styles.legendDot} style={{ background: COGNITIVE_STATES[state].color }} /><span className={styles.legendLabel}><span className={dashboardStyles.distributionLabel}>{COGNITIVE_STATES[state].label}<StateTrend state={state} data={currentReport} /></span></span><span>{hasSamples ? `${distribution?.[state]}%` : "\u2014"}</span></div>)}</div></div></section>
      </div>
      <LessonStateChart key={classId + ':' + month + ':' + (lessonId || data.selected_lesson_id) + ':' + studentSearch} data={data} lessonId={lessonId} onLessonChange={setLessonId} studentSearch={studentSearch} loading={trendLoading} error={trendError} />
    </>}
  </div></TeacherTabTemplate>
}
