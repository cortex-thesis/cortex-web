import { Link } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Clock, TrendingUp, Users } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { DetailSkeleton, StatSummaryCard } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { EEGWaveDisplay } from '../../components/molecules/EEGWaveDisplay/EEGWaveDisplay'
import { LiveDashboardGrid } from '../../components/organisms/teacher'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import type { StudentLive } from '../../types'
import { getTeacherDashboard, type TeacherDashboardData } from '../../lib/teacherApi'
import { cachedApiValue } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from './Dashboard.module.css'
import analyticsStyles from './Analytics.module.css'

const states: CognitiveState[] = ['focused', 'relaxed', 'distracted', 'overstimulated']

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)!
  const [data, setData] = useState<TeacherDashboardData | null>(() => cachedApiValue<TeacherDashboardData>('/teacher/dashboard/') ?? null)
  const hadBootstrapData = useRef(data !== null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => void getTeacherDashboard().then(setData).catch((reason: Error) => setError(reason.message))
    if (!hadBootstrapData.current) refresh()
    const timer = window.setInterval(refresh, 4000)
    return () => window.clearInterval(timer)
  }, [])
  const live = useMemo(() => data?.live_sessions ?? [], [data])
  const liveStudents = useMemo<StudentLive[]>(() => live.map((session) => {
    const latest = session.latest
    const accepted = latest?.accepted_channels ?? 0
    const started = Date.parse(session.started_at)
    const beta = latest?.bands.beta ?? 0
    return {
      id: session.id, name: session.student.name, avatar: session.student.avatar,
      currentState: latest?.state ?? null, signalStrength: accepted as 0 | 1 | 2 | 3 | 4,
      focusScore: session.focus_score,
      sessionDuration: Math.max(0, Math.floor((Date.parse(latest?.recorded_at ?? session.started_at) - started) / 1000)),
      isConnected: Boolean(latest),
      bandPowers: latest ? { theta: latest.bands.theta, alpha: latest.bands.alpha, beta, gamma: latest.bands.gamma, tbr: latest.bands.theta / Math.max(beta, .001) } : undefined,
      signalQuality: accepted === 4 ? 'good' : accepted >= 2 ? 'fair' : 'poor',
      connectionStatus: latest ? 'connected' : 'resyncing', stateStartedAt: latest?.recorded_at,
      activeActivity: `${session.class_name} · ${session.lesson}`, engineMode: 'auto',
    }
  }), [live])
  const selectedStudent = liveStudents.find((student) => student.id === selectedId) ?? liveStudents[0]
  const distribution = data?.state_distribution ?? { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0 }
  const focused = distribution.focused
  let angle = 0
  const segments = states.map((state) => { const start = angle; angle += distribution[state] * 3.6; return `${COGNITIVE_STATES[state].color} ${start}deg ${angle}deg` })

  return <TeacherDashboardTemplate user={data?.teacher ?? user} hasNotification={Boolean(data?.unread_notifications)}>
    <div className={analyticsStyles.content}>
      <h1 className={analyticsStyles.title}>Analytics</h1>
      <Link to="/teacher/sessions">Start or manage a teacher-led session</Link>
      {error && <p role="alert">{error}</p>}
      {!data && !error ? <DetailSkeleton /> : <>
      <div className={analyticsStyles.statsRow}>
        <StatSummaryCard value={data?.class_count ?? 0} label="Classes" icon={<BookOpen size={18} color="#534AB7" />} iconBg="var(--color-cool-surface)" />
        <StatSummaryCard value={data?.student_count ?? 0} label="Students" icon={<Users size={18} color="#1D9E75" />} iconBg="var(--color-cool-surface)" />
        <StatSummaryCard value={data?.average_focus == null ? '—' : `${data.average_focus}%`} label="Avg focus score" icon={<TrendingUp size={18} color="var(--color-teal)" />} iconBg="var(--color-cool-surface)" sub="Across all completed sessions" subColor="var(--color-teal)" />
        <StatSummaryCard value={data?.total_sessions ?? 0} label="Total sessions" icon={<Clock size={18} color="var(--color-coral)" />} iconBg="var(--color-cream)" sub={`${data?.active_sessions ?? 0} active now`} />
      </div>
      <div className={analyticsStyles.chartsRow}>
        <div className={analyticsStyles.chartCard}><div className={analyticsStyles.chartHeader}><span className={analyticsStyles.chartTitle}>Average focus by class</span><span className={analyticsStyles.chartSub}>Recorded sessions</span></div><div className={analyticsStyles.barList}>
          {(data?.classes ?? []).map((item) => { const score = item.average_focus ?? 0; return <div key={item.id} className={analyticsStyles.barRow}><span className={analyticsStyles.barLabel}>Class · {item.name}</span><div className={analyticsStyles.barTrack} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><div className={analyticsStyles.barFill} style={{ width: `${score}%`, background: score >= 75 ? 'var(--color-teal)' : score >= 50 ? 'var(--color-sunflower)' : 'var(--color-coral)' }} /></div><span className={analyticsStyles.barValue}>{item.average_focus == null ? '—' : `${score}%`}</span></div>})}
          {!data?.classes.length && <span className={styles.liveSectionNote}>No classes yet.</span>}
        </div></div>
        <div className={analyticsStyles.donutCard}><span className={analyticsStyles.chartTitle}>State distribution</span><div className={analyticsStyles.donutWrap}><div className={analyticsStyles.donut} style={{ background: focused || angle ? `conic-gradient(${segments.join(', ')})` : 'var(--color-surface-1)' }}><div className={analyticsStyles.donutHole}><span className={analyticsStyles.donutPct}>{focused}%</span><span className={analyticsStyles.donutLbl}>focused</span></div></div><div className={analyticsStyles.legend}>{states.map((state) => <div className={analyticsStyles.legendItem} key={state}><span className={analyticsStyles.legendDot} style={{ background: COGNITIVE_STATES[state].color }} /><span className={analyticsStyles.legendLabel}>{COGNITIVE_STATES[state].label}</span><span className={analyticsStyles.legendPct}>{distribution[state]}%</span></div>)}</div></div></div>
      </div>
      <div className={analyticsStyles.stateCard}><span className={analyticsStyles.chartTitle}>Time in each cognitive state</span><div className={analyticsStyles.stateBars}>{states.map((state) => <div className={analyticsStyles.stateRow} key={state}><StateBadge state={state} size="sm" /><div className={analyticsStyles.stateTrack}><div className={analyticsStyles.stateFill} style={{ width: `${distribution[state]}%`, background: COGNITIVE_STATES[state].color }} /></div><span className={analyticsStyles.statePct}>{distribution[state]}%</span></div>)}</div></div>
      <section className={styles.liveSection}><div className={styles.liveSectionHeader}><div><span className={styles.analyticsEyebrow}>Live classroom</span><h2 className={styles.liveSectionTitle}>{live.length ? `${live.length} session${live.length === 1 ? '' : 's'} in progress` : 'No session in progress'}</h2></div><span className={styles.liveSectionNote}>Live database updates every four seconds</span></div>{liveStudents.length ? <div className={styles.monitorLayout}><LiveDashboardGrid compact students={liveStudents} selectedId={selectedStudent?.id} onSelectStudent={setSelectedId} sessionLabel="Recorded lesson sessions" /><EEGWaveDisplay state={selectedStudent?.currentState} bandPowers={selectedStudent?.bandPowers} signalQuality={selectedStudent?.signalQuality} connectionStatus={selectedStudent?.connectionStatus} /></div> : <p className={styles.emptyLive}>A student appears here only while fresh Muse epochs are reaching the database.</p>}</section>
      </>}
    </div>
  </TeacherDashboardTemplate>
}
