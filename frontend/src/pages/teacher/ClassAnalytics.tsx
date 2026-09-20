import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, Target, TrendingUp, Users } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { getClassAnalytics, type ClassAnalyticsData } from '../../lib/teacherApi'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import { useAuthStore } from '../../store/authStore'
import styles from './Analytics.module.css'
import trendStyles from './ClassAnalytics.module.css'

const states: CognitiveState[] = ['overstimulated', 'distracted', 'relaxed', 'focused']
const lineColors = ['#534AB7', '#1D9E75', '#D4537E', '#BA7517', '#185FA5', '#993C1D']

export default function ClassAnalytics() {
  const { classId = '' } = useParams()
  const user = useAuthStore(state => state.user)!
  const [data, setData] = useState<ClassAnalyticsData | null>(null)
  const [lessonId, setLessonId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [error, setError] = useState('')
  const [trendLoading, setTrendLoading] = useState(false)
  const [trendError, setTrendError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setError(''); setData(null); setLessonId(''); setTrendLoading(false); setTrendError('')
    void getClassAnalytics(classId, '', controller.signal).then(setData).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [classId])
  useEffect(() => {
    if (!lessonId) return
    const controller = new AbortController()
    setTrendLoading(true); setTrendError('')
    void getClassAnalytics(classId, lessonId, controller.signal).then(incoming => {
      setData(previous => previous?.class.id === Number(classId) ? { ...previous,
        slides: incoming.slides, timeline: incoming.timeline, selected_lesson_id: incoming.selected_lesson_id } : previous)
    }).catch((reason: Error) => { if (!controller.signal.aborted) setTrendError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setTrendLoading(false) })
    return () => controller.abort()
  }, [classId, lessonId])
  const distribution = data?.state_distribution
  let angle = 0
  const segments = states.map(state => { const start = angle; angle += (distribution?.[state] ?? 0) * 3.6; return `${COGNITIVE_STATES[state].color} ${start}deg ${angle}deg` })
  const x = (index: number) => 150 + index * 100
  const y = (state: CognitiveState) => 190 - states.indexOf(state) * 50
  const width = Math.max(450, 200 + (data?.slides.length ?? 0) * 100)
  return <TeacherTabTemplate user={user} title={`Class · ${data?.class.name ?? ''}`} tabs={[
    { label: 'Overview', path: `/teacher/class/${classId}/overview` },
    { label: 'Students', path: `/teacher/class/${classId}/students` },
    { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
  ]}><div className={styles.content}>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">Loading class analytics…</p>}
    {data && <>
      <p>All-time class performance through {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'the latest refresh'}. Focus and state percentages summarize completed sessions with recorded state data; open sessions are excluded.</p>
      <label>Search students <input type="search" placeholder="Student name" value={studentSearch} onChange={event => setStudentSearch(event.target.value)} /></label>
      <div className={styles.statsRow}>
        <StatSummaryCard value={data.student_count} label="Students" icon={<Users size={18} />} />
        <StatSummaryCard value={data.session_count} label="Total sessions" icon={<Clock size={18} />} sub={`${data.active_sessions} open sessions`} />
        <StatSummaryCard value={data.average_focus == null ? '—' : `${data.average_focus}%`} label="Average focus" icon={<TrendingUp size={18} />} />
        <StatSummaryCard value={data.completion_rate == null ? '—' : `${data.completion_rate}%`} label="Completion rate" icon={<Target size={18} />} />
      </div>
      <div className={styles.chartsRow}>
        <section className={styles.chartCard}><h2 className={styles.chartTitle}>Average focus by student</h2><div className={styles.barList}>{data.students.filter(student => student.name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => <div key={student.id} className={styles.barRow}><span className={styles.barLabel}>{student.name}</span><div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${student.average_focus ?? 0}%`, background: 'var(--color-teal)' }} /></div><span className={styles.barValue}>{student.average_focus == null ? '—' : `${student.average_focus}%`}</span></div>)}{!data.students.length && <p>No enrolled students.</p>}</div></section>
        <section className={styles.donutCard}><h2 className={styles.chartTitle}>State distribution</h2><div className={styles.donutWrap}><div className={styles.donut} style={{ background: angle ? `conic-gradient(${segments.join(', ')})` : 'var(--color-surface-1)' }}><div className={styles.donutHole}><span className={styles.donutPct}>{distribution?.focused ?? 0}%</span><span className={styles.donutLbl}>focused</span></div></div><div className={styles.legend}>{states.map(state => <div key={state} className={styles.legendItem}><span className={styles.legendDot} style={{ background: COGNITIVE_STATES[state].color }} /><span className={styles.legendLabel}>{COGNITIVE_STATES[state].label}</span><span>{distribution?.[state]}%</span></div>)}</div></div></section>
      </div>
      <section className={styles.stateCard}><h2 className={styles.chartTitle}>Average recorded state distribution</h2><div className={styles.stateBars}>{states.map(state => <div key={state} className={styles.stateRow}><StateBadge state={state} size="sm" /><div className={styles.stateTrack}><div className={styles.stateFill} style={{ width: `${distribution?.[state] ?? 0}%`, background: COGNITIVE_STATES[state].color }} /></div><span className={styles.statePct}>{distribution?.[state]}%</span></div>)}</div></section>
      <section className={styles.chartCard}><h2 className={styles.chartTitle}>Student state across lesson steps</h2>
        <label>Lesson <select value={lessonId || String(data.selected_lesson_id ?? '')} onChange={event => setLessonId(event.target.value)}>{data.lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
        <p>Each point shows the most frequent recorded EEG state for that slide. Each line is one student’s session; gaps mean no EEG data.</p>
        {trendLoading ? <p role="status">Loading lesson trend…</p> : trendError ? <p role="alert">{trendError}</p> : !data.timeline.length ? <p>No recorded EEG states for this lesson yet.</p> : <>
          <div className={trendStyles.trendScroll}><svg width={width} height={300} role="img" aria-label="Student cognitive state by lesson slide">
            {states.map(state => <g key={state}><text x={8} y={y(state) + 4} fontSize={11}>{COGNITIVE_STATES[state].label}</text><line x1={140} x2={width - 30} y1={y(state)} y2={y(state)} stroke="#e5e3ef" /></g>)}
            {data.slides.map((slide, index) => <text key={slide.id} x={x(index)} y={235} textAnchor="middle" fontSize={11}><title>{slide.title}</title>Step {index + 1}</text>)}
            {data.timeline.filter(item => item.name.toLowerCase().includes(studentSearch.toLowerCase())).map((line, lineIndex) => <g key={line.session_id} stroke={lineColors[lineIndex % lineColors.length]}>{line.points.map((point, index) => point.state && <g key={point.slide_id}>{index > 0 && line.points[index - 1].state && <line x1={x(index - 1)} y1={y(line.points[index - 1].state!)} x2={x(index)} y2={y(point.state)} strokeWidth={2} />}<circle cx={x(index)} cy={y(point.state)} r={4} fill={lineColors[lineIndex % lineColors.length]}><title>{line.name} · {data.slides[index]?.title}: {COGNITIVE_STATES[point.state].label} ({point.samples} samples)</title></circle></g>)}</g>)}
          </svg></div>
          <div className={trendStyles.trendLegend}>{data.timeline.filter(item => item.name.toLowerCase().includes(studentSearch.toLowerCase())).map((line, index) => <span key={line.session_id} style={{ color: lineColors[index % lineColors.length] }}>● {line.name} · {new Date(line.started_at).toLocaleString()}</span>)}</div>
        </>}
      </section>
    </>}
  </div></TeacherTabTemplate>
}
