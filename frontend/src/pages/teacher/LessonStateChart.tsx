import { useState } from 'react'
import type { ClassAnalyticsData } from '../../lib/teacherApi'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import InfoTip from './InfoTip'
import styles from './Analytics.module.css'
import chart from './ClassAnalytics.module.css'
import dashboard from './Dashboard.module.css'

const states: CognitiveState[] = ['overstimulated', 'distracted', 'relaxed', 'focused']
const colors = ['#534AB7', '#1D9E75', '#D4537E', '#BA7517', '#185FA5', '#993C1D']

export default function LessonStateChart({ data, lessonId, onLessonChange, studentSearch, loading, error }: {
  data: ClassAnalyticsData; lessonId: string; onLessonChange: (id: string) => void
  studentSearch: string; loading: boolean; error: string
}) {
  const [sessionId, setSessionId] = useState('')
  const sessions = data.timeline.filter(item => item.name.toLowerCase().includes(studentSearch.toLowerCase()))
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at) || a.session_id.localeCompare(b.session_id))
  const selected = sessions.some(item => item.session_id === sessionId) ? sessionId : ''
  const visible = selected ? sessions.filter(item => item.session_id === selected) : sessions
  const color = (id: string) => colors[data.timeline.findIndex(item => item.session_id === id) % colors.length]
  const sessionLabel = (session: ClassAnalyticsData['timeline'][number]) => `${session.name} · ${new Date(session.started_at).toLocaleString()} · ${session.session_id.slice(0, 8)}`
  const x = (index: number) => 156 + index * 88
  const y = (state: CognitiveState) => 184 - states.indexOf(state) * 48
  const width = Math.max(440, 200 + data.slides.length * 88)
  const hasTies = visible.some(session => session.points.some(point => !point.state && point.samples > 0))

  return <section className={`${styles.chartCard} ${chart.lessonCard}`}>
    <div className={dashboard.trendHeading}><h2 className={styles.chartTitle}>Student state across lesson steps</h2><InfoTip label="About the lesson-step chart" text="Each point shows the most frequent valid recorded EEG state for a slide. Colors identify sessions; vertical position identifies the state. Lines connect adjacent recorded steps, not continuous measurements. Overlapping points may hide sessions. Gaps mean no valid EEG data; diamonds mark tied states. Select one session to inspect it clearly." /></div>
    <div className={chart.lessonToolbar}>
      <label className={chart.lessonSelect}>Lesson<select value={lessonId || String(data.selected_lesson_id ?? '')} onChange={event => onLessonChange(event.target.value)}>{data.lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</select></label>
      <label className={`${chart.lessonSelect} ${chart.sessionSelect}`}>Session<select disabled={loading || Boolean(error) || !sessions.length} value={selected} onChange={event => setSessionId(event.target.value)}><option value="">All sessions ({sessions.length})</option>{sessions.map(session => <option key={session.session_id} value={session.session_id}>{sessionLabel(session)}</option>)}</select></label>
      {selected && <button type="button" className={chart.resetSessions} onClick={() => setSessionId('')}>Show all</button>}
    </div>
    {loading ? <p role="status">Loading lesson trend…</p> : error ? <p role="alert">{error}</p> : !visible.length ? <p className={chart.emptyTrend}>{studentSearch ? 'No recorded sessions match this student search.' : 'No valid EEG recordings for this lesson yet.'}</p> : <>
      <div className={chart.plotMeta}><span role="status">{selected ? 'Showing 1 session' : `${visible.length} sessions shown`}</span>{hasTies && <span>◇ Tied states</span>}</div>
      <div className={chart.trendScroll}><svg width={width} height={260} role="img" aria-label={selected ? `Recorded states for ${sessionLabel(visible[0])}` : 'Recorded student states by lesson step, all matching sessions'}>
        {states.map(state => <g key={state}><circle cx={12} cy={y(state)} r={4} fill={COGNITIVE_STATES[state].color} /><text x={24} y={y(state) + 4} fontSize={11} fill="var(--color-text-secondary)">{COGNITIVE_STATES[state].label}</text><line x1={142} x2={width - 26} y1={y(state)} y2={y(state)} stroke="var(--color-border)" strokeDasharray="3 5" /></g>)}
        {data.slides.map((slide, index) => <text key={slide.id} x={x(index)} y={234} textAnchor="middle" fontSize={11} fill="var(--color-text-secondary)"><title>{slide.title}</title>Step {index + 1}</text>)}
        {visible.map(session => <g key={session.session_id} stroke={color(session.session_id)}>{session.points.map((point, index) => {
          const previous = session.points[index - 1]
          const title = `${sessionLabel(session)} · ${data.slides[index]?.title}: ${point.state ? COGNITIVE_STATES[point.state].label : 'Tied states'} (${point.samples} valid samples)`
          return point.state ? <g key={point.slide_id}>
            {previous?.state && <line x1={x(index - 1)} y1={y(previous.state)} x2={x(index)} y2={y(point.state)} strokeWidth={2} strokeOpacity={selected ? 1 : .7} />}
            <circle cx={x(index)} cy={y(point.state)} r={selected ? 5 : 4} fill={color(session.session_id)} stroke="var(--color-white)" strokeWidth={1.5}><title>{title}</title></circle>
          </g> : point.samples > 0 ? <path key={point.slide_id} d={`M ${x(index)} 204 l 5 5 l -5 5 l -5 -5 Z`} fill="none" strokeWidth={2}><title>{title}</title></path> : null
        })}</g>)}
      </svg></div>
      <div className={chart.trendLegend} aria-label="Choose a session to isolate">{visible.map(session => <button type="button" key={session.session_id} aria-pressed={selected === session.session_id} onClick={() => setSessionId(selected === session.session_id ? '' : session.session_id)} title={sessionLabel(session)}>
        <i style={{ background: color(session.session_id) }} /><span><strong>{session.name}</strong><small>{new Date(session.started_at).toLocaleString()} · {session.session_id.slice(0, 8)}</small></span>
      </button>)}</div>
    </>}
  </section>
}
