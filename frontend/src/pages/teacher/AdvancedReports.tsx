import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TeacherDashboardTemplate } from '../../components/templates'
import { CardGridSkeleton, TableSkeleton } from '../../components/molecules'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from '../prototype/Prototype.module.css'

type StateName = 'focused' | 'relaxed' | 'distracted' | 'overstimulated'
type StateScores = Record<StateName, { samples: number; percentage: number; average_confidence: number }>
interface SlideReport { slide_id?: number; id?: number; position: number; title: string; content_title: string; entered_at?: string; exited_at?: string; duration_seconds?: number; exposures?: number; states: StateScores }
interface SessionReport { id: string; lesson_title: string; started_at: string; ended_at: string; states: StateScores; slides: SlideReport[] }
interface AdvancedData {
  generated_at: string
  classes: Array<{ id: number; name: string }>; selected_class_id: number | null; class_name: string | null
  overall: { session_count: number; sample_count: number; first_sample_at: string | null; last_sample_at: string | null; states: StateScores }
  lessons: Array<{ id: number; title: string; session_count: number; student_count: number; states: StateScores; slides: SlideReport[] }>
  students: Array<{ student: { id: number; name: string }; states: StateScores; sessions: SessionReport[] }>
}
const STATE_NAMES: StateName[] = ['focused', 'relaxed', 'distracted', 'overstimulated']
const title = (value: string) => value[0].toUpperCase() + value.slice(1)

export default function AdvancedReports() {
  const user = useAuthStore((state) => state.user)!
  const navigate = useNavigate()
  const [classId, setClassId] = useState('')
  const [range, setRange] = useState('month')
  const [data, setData] = useState<AdvancedData | null>(null)
  const [studentFilter, setStudentFilter] = useState('')
  const [lessonFilter, setLessonFilter] = useState('')
  const [stateFilter, setStateFilter] = useState<StateName | 'all'>('all')
  const [error, setError] = useState('')
  useEffect(() => {
    const query = new URLSearchParams({ range }); if (classId) query.set('class_id', classId)
    void api<AdvancedData>(`/teacher/reports/advanced/?${query}`).then((payload) => { setData(payload); if (!classId && payload.selected_class_id) setClassId(String(payload.selected_class_id)) }).catch((reason: Error) => setError(reason.message))
  }, [classId, range])
  const visibleLessons = data?.lessons.filter((lesson) => !lessonFilter || String(lesson.id) === lessonFilter) ?? []
  const visibleStudents = data?.students.filter((student) => !studentFilter || String(student.student.id) === studentFilter) ?? []
  const visibleStates = stateFilter === 'all' ? STATE_NAMES : [stateFilter]
  const stamp = (value: string | null) => value ? new Date(value).toLocaleString() : 'No EEG samples'
  return <TeacherDashboardTemplate user={user}><div className={styles.page}>
    <div className={styles.header}><div><button className={styles.ghost} onClick={() => navigate('/teacher/reports')}><ArrowLeft size={13} /> General report</button><span className={styles.eyebrow}>EEG analytics</span><h1 className={styles.title}>Advanced reports</h1><p className={styles.subtitle}>Drill down from class and lesson statistics to each student, session, slide, and content item.</p></div><div className={styles.actions}><select aria-label="Class" className={styles.select} value={classId} onChange={(event) => { setClassId(event.target.value); setStudentFilter(''); setLessonFilter('') }}>{data?.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Period" className={styles.select} value={range} onChange={(event) => setRange(event.target.value)}><option value="week">This week</option><option value="month">This month</option><option value="term">Current term</option></select></div></div>
    {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}
    {!data && !error && <><CardGridSkeleton count={4} /><section className={styles.section}><TableSkeleton rows={7} columns={5} /></section></>}
    {data && <><div className={styles.actions}><select className={styles.select} aria-label="Student filter" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}><option value="">All students</option>{data.students.map(x => <option key={x.student.id} value={x.student.id}>{x.student.name}</option>)}</select><select className={styles.select} aria-label="Lesson filter" value={lessonFilter} onChange={e => setLessonFilter(e.target.value)}><option value="">All lessons</option>{data.lessons.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select><select className={styles.select} aria-label="State filter" value={stateFilter} onChange={e => setStateFilter(e.target.value as StateName | 'all')}><option value="all">All cognitive states</option>{STATE_NAMES.map(x => <option key={x} value={x}>{title(x)}</option>)}</select></div><p className={styles.subtitle}>Report generated {stamp(data.generated_at)} · EEG window {stamp(data.overall.first_sample_at)} to {stamp(data.overall.last_sample_at)} · {data.overall.sample_count} processed samples</p><div className={styles.grid4}>{visibleStates.map((state) => <div className={styles.card} key={state}><span className={styles.statValue}>{data.overall.states[state].percentage}%</span><span className={styles.statLabel}>Overall {state} · {data.overall.states[state].samples} EEG samples · {Math.round(data.overall.states[state].average_confidence * 100)}% avg confidence</span></div>)}</div>
      <section className={styles.section}><h2 className={styles.sectionTitle}>Lesson and class statistics</h2><div className={styles.list} style={{ marginTop: 12 }}>{visibleLessons.length === 0 && <div className={styles.card}>No slide telemetry matches these filters.</div>}{visibleLessons.map((lesson) => <details className={styles.card} key={lesson.id}><summary><strong>{lesson.title}</strong> · {lesson.session_count} sessions · {lesson.student_count} students</summary><div className={styles.tableWrap} style={{ marginTop: 14 }}><table className={styles.table}><thead><tr><th>Slide / content</th>{visibleStates.map((state) => <th key={state}>{title(state)}</th>)}</tr></thead><tbody>{lesson.slides.map((slide) => <tr key={slide.id}><td><strong>{slide.position}. {slide.title}</strong><span className={styles.listMeta}>{slide.content_title} · {slide.exposures} views</span></td>{visibleStates.map(state => <td key={state}><strong>{slide.states[state].percentage}%</strong><span className={styles.listMeta}>{slide.states[state].samples} samples · {Math.round(slide.states[state].average_confidence * 100)}% confidence</span></td>)}</tr>)}</tbody></table></div></details>)}</div></section>
      <section className={styles.section}><h2 className={styles.sectionTitle}>Individual student and session reports</h2><div className={styles.list} style={{ marginTop: 12 }}>{visibleStudents.map((student) => <details className={styles.card} key={student.student.id}><summary><strong>{student.student.name}</strong> · {student.sessions.length} completed sessions</summary>{student.sessions.filter(session => !lessonFilter || data.lessons.find(x => String(x.id) === lessonFilter)?.title === session.lesson_title).map((session) => <details className={styles.card} style={{ marginTop: 12 }} key={session.id}><summary>{session.lesson_title} · {stamp(session.started_at)} to {stamp(session.ended_at)}</summary><div className={styles.tableWrap} style={{ marginTop: 12 }}><table className={styles.table}><thead><tr><th>Slide / content and timestamp</th>{visibleStates.map((state) => <th key={state}>{title(state)}</th>)}</tr></thead><tbody>{session.slides.map((slide) => <tr key={slide.slide_id}><td><strong>{slide.position}. {slide.title}</strong><span className={styles.listMeta}>{slide.content_title} · {slide.duration_seconds ?? 0}s · {stamp((slide as SlideReport & { entered_at?: string }).entered_at ?? null)}</span></td>{visibleStates.map(state => <td key={state}><strong>{slide.states[state].percentage}%</strong><span className={styles.listMeta}>{slide.states[state].samples} samples · {Math.round(slide.states[state].average_confidence * 100)}% confidence</span></td>)}</tr>)}</tbody></table></div></details>)}</details>)}</div></section>
    </>}
  </div></TeacherDashboardTemplate>
}
