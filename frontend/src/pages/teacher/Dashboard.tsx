import { useState, useEffect } from 'react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { LiveDashboardGrid } from '../../components/organisms/teacher'
import type { StudentLive } from '../../types'
import { COGNITIVE_STATES } from '../../constants/states'
import type { CognitiveState } from '../../constants/states'
import { mockTeacher, mockClasses, mockStudentsLive, createMockEEGStream } from '../../mocks'
import { BookOpen, Clock, TrendingUp, Users } from 'lucide-react'
import styles from './Dashboard.module.css'
import analyticsStyles from './Analytics.module.css'

type AnalyticsView = 'overview' | 'classes' | 'states'

const STATE_DIST: { state: CognitiveState; pct: number }[] = [
  { state: 'focused', pct: 61 },
  { state: 'relaxed', pct: 18 },
  { state: 'distracted', pct: 15 },
  { state: 'overstimulated', pct: 6 },
]

const classes = mockClasses.filter((item) => item.teacherId === mockTeacher.id)

function avgFocusForClass(studentIds: string[]): number {
  const live = mockStudentsLive.filter((student) => studentIds.includes(student.id))
  if (live.length === 0) return 70
  return Math.round(live.reduce((sum, student) => sum + student.focusScore, 0) / live.length)
}

const classComparison = classes.map((item) => ({
  id: item.id,
  name: item.name,
  emoji: item.iconEmoji,
  avgFocus: avgFocusForClass(item.studentIds),
}))

const totalStudents = classes.reduce((sum, item) => sum + item.studentIds.length, 0)
const overallAvgFocus = classComparison.length
  ? Math.round(classComparison.reduce((sum, item) => sum + item.avgFocus, 0) / classComparison.length)
  : 0

export default function Dashboard() {
  const [students, setStudents] = useState<StudentLive[]>(mockStudentsLive)
  const [selectedId, setSelectedId] = useState<string | null>(
    mockStudentsLive[0]?.id ?? null
  )
  const [analyticsView, setAnalyticsView] = useState<AnalyticsView>('overview')

  // Simulate live EEG state updates for all students
  useEffect(() => {
    const stops = mockStudentsLive.map((student) =>
      createMockEEGStream(
        (state: CognitiveState) => {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === student.id ? { ...s, currentState: state } : s
            )
          )
        },
        4000 + Math.random() * 2000
      )
    )
    return () => stops.forEach((stop) => stop())
  }, [])

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.analyticsSection} aria-labelledby="teacher-overview-heading">
            <div className={styles.analyticsHeader}>
              <div>
                <span className={styles.analyticsEyebrow}>Class overview</span>
                <h1 id="teacher-overview-heading" className={styles.analyticsTitle}>Learning statistics</h1>
              </div>
              <div className={styles.analyticsTabs} role="tablist" aria-label="Statistics detail">
                {([['overview', 'Overview'], ['classes', 'By class'], ['states', 'By state']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={analyticsView === value}
                    className={`${styles.analyticsTab} ${analyticsView === value ? styles.analyticsTabActive : ''}`}
                    onClick={() => setAnalyticsView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={analyticsStyles.statsRow}>
              <StatSummaryCard value={classes.length} label="Classes" icon={<BookOpen size={18} color="#534AB7" />} iconBg="var(--color-cool-surface)" />
              <StatSummaryCard value={totalStudents} label="Students" icon={<Users size={18} color="#1D9E75" />} iconBg="var(--color-cool-surface)" />
              <StatSummaryCard value={`${overallAvgFocus}%`} label="Avg focus score" icon={<TrendingUp size={18} color="var(--color-teal)" />} iconBg="var(--color-cool-surface)" sub="Across all classes" subColor="var(--color-teal)" />
              <StatSummaryCard value={18 * Math.max(classes.length, 1)} label="Total sessions" icon={<Clock size={18} color="var(--color-coral)" />} iconBg="var(--color-cream)" sub="This term" />
            </div>

            {analyticsView === 'overview' && (
              <div className={analyticsStyles.chartsRow}>
                <ClassComparison />
                <StateDistribution />
              </div>
            )}
            {analyticsView === 'classes' && <ClassComparison />}
            {analyticsView === 'states' && <StateDetails />}
          </section>

          <section className={styles.liveSection} aria-labelledby="live-session-heading">
            <div className={styles.liveSectionHeader}>
              <div>
                <span className={styles.analyticsEyebrow}>Live classroom</span>
                <h2 id="live-session-heading" className={styles.liveSectionTitle}>Session in progress</h2>
              </div>
              <span className={styles.liveSectionNote}>Select a class for live EEG details</span>
            </div>
            <LiveDashboardGrid
              className={styles.compactLiveGrid}
              compact
              students={students}
              sessionLabel="Life Skills — Session in progress"
              selectedId={selectedId}
              onSelectStudent={setSelectedId}
            />
          </section>
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}

function ClassComparison() {
  return (
    <div className={analyticsStyles.chartCard}>
      <div className={analyticsStyles.chartHeader}>
        <span className={analyticsStyles.chartTitle}>Average focus by class</span>
        <span className={analyticsStyles.chartSub}>Current term</span>
      </div>
      <div className={analyticsStyles.barList}>
        {classComparison.map((item) => (
          <div key={item.id} className={analyticsStyles.barRow}>
            <span className={analyticsStyles.barLabel}><span aria-hidden="true">{item.emoji}</span> {item.name}</span>
            <div className={analyticsStyles.barTrack} role="progressbar" aria-valuenow={item.avgFocus} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.name}: ${item.avgFocus}% average focus`}>
              <div className={analyticsStyles.barFill} style={{ width: `${item.avgFocus}%`, background: item.avgFocus >= 75 ? 'var(--state-focused)' : 'var(--state-distracted)' }} />
            </div>
            <span className={analyticsStyles.barValue}>{item.avgFocus}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StateDistribution() {
  return (
    <div className={analyticsStyles.donutCard}>
      <span className={analyticsStyles.chartTitle}>State distribution</span>
      <div className={analyticsStyles.donutWrap}>
        <div className={analyticsStyles.stackedBar} role="img" aria-label="Overall state distribution">
          {STATE_DIST.map(({ state, pct }) => (
            <span key={state} style={{ width: `${pct}%`, background: `var(--state-${state})` }} />
          ))}
        </div>
        <div className={analyticsStyles.legend}>
          {STATE_DIST.map(({ state, pct }) => (
            <div key={state} className={analyticsStyles.legendItem}>
              <span className={analyticsStyles.legendDot} style={{ background: COGNITIVE_STATES[state].color }} aria-hidden="true" />
              <span className={analyticsStyles.legendLabel}>{COGNITIVE_STATES[state].label}</span>
              <span className={analyticsStyles.legendPct}>{pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StateDetails() {
  return (
    <div className={analyticsStyles.stateCard}>
      <span className={analyticsStyles.chartTitle}>Time in each cognitive state</span>
      <div className={analyticsStyles.stateBars}>
        {STATE_DIST.map(({ state, pct }) => (
          <div key={state} className={analyticsStyles.stateRow}>
            <StateBadge state={state} size="sm" />
            <div className={analyticsStyles.stateTrack} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${COGNITIVE_STATES[state].label}: ${pct}%`}>
              <div className={analyticsStyles.stateFill} style={{ width: `${pct}%`, background: COGNITIVE_STATES[state].color }} />
            </div>
            <span className={analyticsStyles.statePct}>{pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
