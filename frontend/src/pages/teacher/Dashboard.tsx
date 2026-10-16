import CognitiveStateInfo, { cognitiveDisclaimer } from '../../components/molecules/CognitiveStateInfo'
import StateTrend from './StateTrend'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Clock, NotebookPen, Play, TrendingUp, Users } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { DetailSkeleton, StatSummaryCard } from '../../components/molecules'

import { EEGWaveDisplay } from '../../components/molecules/EEGWaveDisplay/EEGWaveDisplay'
import { LiveDashboardGrid } from '../../components/organisms/teacher'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import { RecentClassActivity } from '../../components/organisms/teacher/RecentClassActivity'
import type { StudentLive } from '../../types'
import { getTeacherDashboard, type TeacherDashboardData } from '../../lib/teacherApi'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from './Dashboard.module.css'
import DashboardTrends from './DashboardTrends'
import { periodRange } from './reportingDates'
import analyticsStyles from './Analytics.module.css'

const states: CognitiveState[] = ['focused', 'relaxed', 'distracted', 'overstimulated']

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)!
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [month, setMonth] = useState(() => { const now = new Date(); return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') })
  const [classId, setClassId] = useState('')
  const [period, setPeriod] = useState('month')
  const [date, setDate] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` })
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    const refresh = async () => {
      try { const result = await getTeacherDashboard(month, classId, { period, date, year }); if (!disposed) { setData(result); setError(''); setReportLoading(false) } }
      catch (reason) { if (!disposed) { setError(reason instanceof Error ? reason.message : 'Unable to refresh dashboard.'); setReportLoading(false) } }
      if (!disposed) timer = setTimeout(() => void refresh(), 4000)
    }
    setReportLoading(true)
    void refresh()
    return () => { disposed = true; clearTimeout(timer) }
  }, [month, classId, period, date, year])
  const live = useMemo(() => (data?.live_sessions ?? []).filter(item => (modeFilter === 'all' || item.control_mode === modeFilter) && (item.student.name + ' ' + item.class_name + ' ' + item.lesson).toLowerCase().includes(search.toLowerCase())), [data, search, modeFilter])
  async function control(id: string, action: string, mode?: string) {
    setBusy(true)
    try {
      await api('/sessions/' + id + '/control/', { method: 'POST', body: JSON.stringify({ action, mode }) })
      setData(await getTeacherDashboard(month, classId, { period, date, year })); setError(''); setSelectedId(id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to control session.') }
    finally { setBusy(false) }
  }
  const liveStudents = useMemo<StudentLive[]>(() => live.map((session) => {
    const latest = session.latest && session.latest.accepted_channels > 0 && Date.parse(data?.reporting.generated_at ?? session.started_at) - Date.parse(session.latest.recorded_at) < 8000 ? session.latest : null
    const accepted = latest?.accepted_channels ?? 0
    const started = Date.parse(session.started_at)
    const beta = latest?.bands.beta ?? 0
    return {
      id: session.id, name: session.student.name, avatar: session.student.avatar, avatar_color: session.student.avatar_color,
      currentState: latest?.state ?? null, signalStrength: accepted as 0 | 1 | 2 | 3 | 4,
      focusScore: session.focus_score,
      sessionDuration: Math.max(0, Math.floor((Date.parse(data?.reporting.generated_at ?? session.started_at) - started) / 1000)),
      isConnected: Boolean(latest),
      bandPowers: latest ? { theta: latest.bands.theta, alpha: latest.bands.alpha, beta, gamma: latest.bands.gamma, tbr: latest.bands.theta / Math.max(beta, .001) } : undefined,
      signalQuality: accepted === 4 ? 'good' : accepted >= 2 ? 'fair' : 'poor',
      connectionStatus: latest ? 'connected' : 'resyncing', stateStartedAt: latest?.recorded_at,
      activeActivity: `${session.class_name} · ${session.lesson}`, engineMode: session.control_mode === 'teacher' ? 'teacher-override' : 'auto',
    }
  }), [live, data?.reporting.generated_at])
  const selectedStudent = liveStudents.find((student) => student.id === selectedId) ?? liveStudents[0]
  const distribution = data?.state_distribution ?? { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0 }
  const hasSamples = Boolean(data?.reporting.sample_count)
  const focused = distribution.focused
  const reportingLabel = data?.reporting.start && data.reporting.end_exclusive ? periodRange(data.reporting.start, data.reporting.end_exclusive) : 'All time'
  const mostRecentClass = data?.classes.find(item => item.latest_session_at)
  let angle = 0
  const segments = states.map((state) => { const start = angle; angle += distribution[state] * 3.6; return `${COGNITIVE_STATES[state].color} ${start}deg ${angle}deg` })

  return <TeacherDashboardTemplate user={data?.teacher ?? user} hasNotification={Boolean(data?.unread_notifications)}>
    <div className={analyticsStyles.content}>
      <h1 className={analyticsStyles.title}>Teacher dashboard</h1>
      <nav className={styles.shortcuts} aria-label="Teacher shortcuts">
        <Link className={styles.shortcut} to="/teacher/sessions"><Play size={17} aria-hidden="true" /><strong>Start session</strong></Link>
        {mostRecentClass && <Link className={styles.shortcut} to={`/teacher/class/${mostRecentClass.id}/overview`}><Clock size={17} aria-hidden="true" /><span>Most recent class<strong>{mostRecentClass.name}</strong></span></Link>}
        <Link className={styles.shortcut} to="/teacher/journals"><NotebookPen size={17} aria-hidden="true" /><strong>Journals</strong></Link>
        <Link className={styles.shortcut} to="/teacher/classes"><Users size={17} aria-hidden="true" /><strong>My classes</strong></Link>
      </nav>
      {error && <p role="alert">{error}</p>}
      {!data ? (!error ? <DetailSkeleton /> : <p className={styles.emptyLive}>Dashboard data could not be loaded. Retrying automatically.</p>) : <>
      {data && <>
        <section className={styles.activityCard} aria-labelledby="dashboard-classes">
          <h2 id="dashboard-classes">My classes</h2>
          <div className={styles.classLinks}>{data.classes.map(item => <Link className={styles.classLink} key={item.id} to={`/teacher/class/${item.id}/overview`}><strong>{item.name}</strong><span>{item.student_count} students</span><small>{item.latest_session_at ? `Latest session ${new Date(item.latest_session_at).toLocaleString()}` : 'No sessions yet'}</small></Link>)}</div>
          {!data.classes.length && <p className={styles.activityNote}>No active classes assigned yet.</p>}
        </section>
        <RecentClassActivity sessions={data.recent_sessions} badges={data.recent_badges} />
      </>}
      <section className={styles.statsPanel} aria-label="Class statistics">
        <div className={styles.statsHeader}>
          <h2>Statistics</h2>
          <div className={styles.filters}>
            <label>Class<select value={classId} onChange={event => setClassId(event.target.value)}><option value="">All my classes</option>{data?.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Period<select value={period} onChange={event => setPeriod(event.target.value)}><option value="week">Weekly</option><option value="month">Monthly</option><option value="year">Yearly</option><option value="all">All time</option></select></label>
            {period === 'month' && <label>Month<input type="month" value={month} onChange={event => { if (event.target.value) setMonth(event.target.value) }} /></label>}
            {period === 'week' && <label>Week containing<input type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value) }} /></label>}
            {period === 'year' && <label>Year<input type="number" min="2" max="9998" value={year} onChange={event => setYear(event.target.value)} /></label>}
          </div>
        </div>
        {reportLoading && <p role="status" className={styles.statsNote}>Updating statistics for the selected filters…</p>}
        {data?.reporting && <p className={styles.statsNote}>Updated {new Date(data.reporting.generated_at).toLocaleString()} · {data.reporting.start ? `${new Date(data.reporting.start).toLocaleDateString()}–${new Date(data.reporting.end_exclusive!).toLocaleDateString()} (end exclusive)` : 'All recorded dates'} · {data.reporting.sample_count.toLocaleString()} valid EEG samples across {data.reporting.measured_sessions} measured sessions.</p>}
      <div className={analyticsStyles.statsRow}>
        <StatSummaryCard value={data?.class_count ?? 0} label="Active classes" icon={<BookOpen size={18} color="#534AB7" />} iconBg="var(--color-cool-surface)" />
        <StatSummaryCard value={data?.student_count ?? 0} label="Enrolled students" icon={<Users size={18} color="#1D9E75" />} iconBg="var(--color-cool-surface)" />
        <StatSummaryCard value={data?.average_focus == null ? '—' : `${data.average_focus}%`} label="Focused EEG samples" icon={<TrendingUp size={18} color="var(--color-teal)" />} iconBg="var(--color-cool-surface)" />
        <StatSummaryCard value={data?.total_sessions ?? 0} label="Completed sessions" icon={<Clock size={18} color="var(--color-coral)" />} iconBg="var(--color-cream)" sub={`${data?.active_sessions ?? 0} active now`} />
      </div>
      {data && !reportLoading && <DashboardTrends data={data} />}
      {!reportLoading && !hasSamples && <p role="status" className={styles.trendNotice}>{!data.classes.length ? 'No active classes are assigned to this teacher account.' : data.total_sessions ? 'Completed sessions exist, but they contain no valid EEG samples for this selection.' : 'No completed sessions for this teacher and the selected filters. Try All time or another class.'} Missing measurements are not 0% focus.</p>}
      <div className={analyticsStyles.chartsRow}>
        <div className={analyticsStyles.chartCard}><div className={analyticsStyles.chartHeader}><span className={analyticsStyles.chartTitle}>Focused EEG samples by class</span><span className={analyticsStyles.chartSub}>Selected reporting period</span></div><div className={analyticsStyles.barList}>
          {(data?.classes ?? []).filter(item => (!classId || String(item.id) === classId)).map((item) => { const score = item.average_focus ?? 0; return <div key={item.id} className={analyticsStyles.barRow}><span className={analyticsStyles.barLabel}>Class · {item.name}</span><div className={analyticsStyles.barTrack} role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}><div className={analyticsStyles.barFill} style={{ width: `${score}%`, background: score >= 75 ? 'var(--color-teal)' : score >= 50 ? 'var(--color-sunflower)' : 'var(--color-coral)' }} /></div><span className={analyticsStyles.barValue}>{item.average_focus == null ? '—' : `${score}%`}</span></div>})}
          {!data?.classes.length && <span className={styles.liveSectionNote}>No classes yet.</span>}
        </div></div>
        <div className={analyticsStyles.donutCard}><div className={analyticsStyles.chartHeader}><span className={analyticsStyles.chartTitle}>State distribution</span><span className={analyticsStyles.chartSub}>{reportingLabel}</span></div><p className={analyticsStyles.chartSub}>{cognitiveDisclaimer}</p><div className={analyticsStyles.donutWrap}><div className={analyticsStyles.donut} style={{ background: focused || angle ? `conic-gradient(${segments.join(', ')})` : 'var(--color-surface-1)' }}><div className={analyticsStyles.donutHole}><span className={analyticsStyles.donutPct}>{hasSamples ? `${focused}%` : '\u2014'}</span><span className={analyticsStyles.donutLbl}>{hasSamples ? 'focused' : 'no data'}</span></div></div><div className={analyticsStyles.legend}>{states.map((state) => <div className={analyticsStyles.legendItem} key={state}><span className={analyticsStyles.legendDot} style={{ background: COGNITIVE_STATES[state].color }} /><span className={analyticsStyles.legendLabel}><span className={styles.distributionLabel}>{COGNITIVE_STATES[state].label}<CognitiveStateInfo state={state} />{!reportLoading && <StateTrend state={state} data={data} />}</span></span><span className={analyticsStyles.legendPct}>{hasSamples ? `${distribution[state]}%` : '\u2014'}</span></div>)}</div></div></div>
      </div>
        <p className={styles.statsNote}>EEG percentages use valid samples from completed sessions.</p>
      </section>
      <section className={styles.liveSection}>
        <div className={styles.filters}><label>Search live sessions<input type="search" placeholder="Student, class, or lesson" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Mode<select value={modeFilter} onChange={event => setModeFilter(event.target.value)}><option value="all">All modes</option><option value="free">Free mode</option><option value="teacher">Teacher controlled</option></select></label></div>
        {live.map(item => <div className={styles.sessionControls} key={item.id}><div><strong>{item.student.name}</strong><p>{item.class_name} | {item.lesson} | {item.control_mode === 'free' ? 'Free mode' : 'Teacher controlled'} | {item.status}</p><small>Started {new Date(item.started_at).toLocaleString()} | Last seen {item.last_seen_at ? new Date(item.last_seen_at).toLocaleTimeString() : 'awaiting heartbeat'}</small></div>{item.class_session_id ? <Link to={'/teacher/class-session/' + item.class_session_id}>Open classroom controls</Link> : item.control_mode === 'free' ? <button disabled={busy} onClick={() => void control(item.id, 'claim')}>Override - take control</button> : item.control_mode === 'teacher' ? <div className={styles.filters}>{(['focus', 'refocus', 'breathing'] as const).map(mode => <button key={mode} disabled={busy} aria-pressed={item.presentation_mode === mode} onClick={() => void control(item.id, 'set_mode', mode)}>{mode === 'focus' ? 'Focus lesson' : mode === 'refocus' ? 'Refocusing' : 'Breathing'}</button>)}<button disabled={busy} onClick={() => void control(item.id, item.status === 'paused' ? 'resume' : 'pause')}>{item.status === 'paused' ? 'Resume' : 'Pause'}</button><button disabled={busy} onClick={() => void control(item.id, 'release')}>Return to free mode</button></div> : null}</div>)}
        <div className={styles.liveSectionHeader}><div><span className={styles.analyticsEyebrow}>Live classroom</span><h2 className={styles.liveSectionTitle}>{live.length ? `${live.length} session${live.length === 1 ? '' : 's'} in progress` : 'No session in progress'}</h2></div><span className={styles.liveSectionNote}>Live updates</span></div>{liveStudents.length ? <div className={styles.monitorLayout}><LiveDashboardGrid compact students={liveStudents} selectedId={selectedStudent?.id} onSelectStudent={setSelectedId} sessionLabel="Recorded lesson sessions" /><EEGWaveDisplay state={selectedStudent?.currentState} bandPowers={selectedStudent?.bandPowers} signalQuality={selectedStudent?.signalQuality} connectionStatus={selectedStudent?.connectionStatus} /></div> : <p className={styles.emptyLive}>No live sessions match your filters.</p>}</section>
      </>}
    </div>
  </TeacherDashboardTemplate>
}
