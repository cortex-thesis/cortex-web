import { TeacherDashboardTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { COGNITIVE_STATES } from '../../constants/states'
import type { CognitiveState } from '../../constants/states'
import { Users, BookOpen, TrendingUp, Clock } from 'lucide-react'
import { mockTeacher, mockClasses, mockStudentsLive } from '../../mocks'
import styles from './Analytics.module.css'

// Aggregate mock — replace with GET /api/analytics/overview/ once the
// backend is up. State distribution mirrors the per-class shape used
// in ClassAnalytics.tsx, just rolled up across every class.
const STATE_DIST: { state: CognitiveState; pct: number }[] = [
  { state: 'focused', pct: 61 },
  { state: 'relaxed', pct: 18 },
  { state: 'distracted', pct: 15 },
  { state: 'overstimulated', pct: 6 },
]

const classes = mockClasses.filter((c) => c.teacherId === mockTeacher.id)

function avgFocusForClass(studentIds: string[]): number {
  const live = mockStudentsLive.filter((s) => studentIds.includes(s.id))
  if (live.length === 0) return 70
  return Math.round(
    live.reduce((sum, s) => sum + s.focusScore, 0) / live.length
  )
}

const CLASS_COMPARISON = classes.map((c) => ({
  id: c.id,
  name: c.name,
  emoji: c.iconEmoji,
  avgFocus: avgFocusForClass(c.studentIds),
}))

const totalStudents = classes.reduce((sum, c) => sum + c.studentIds.length, 0)
const overallAvgFocus = CLASS_COMPARISON.length
  ? Math.round(
      CLASS_COMPARISON.reduce((sum, c) => sum + c.avgFocus, 0) /
        CLASS_COMPARISON.length
    )
  : 0

export default function Analytics() {
  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.content}>
        <h1 className={styles.title}>Analytics</h1>

        <div className={styles.statsRow}>
          <StatSummaryCard
            value={classes.length}
            label="Classes"
            icon={<BookOpen size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="var(--color-cool-surface)"
          />
          <StatSummaryCard
            value={totalStudents}
            label="Students"
            icon={<Users size={18} strokeWidth={1.75} color="#1D9E75" />}
            iconBg="var(--color-cool-surface)"
          />
          <StatSummaryCard
            value={`${overallAvgFocus}%`}
            label="Avg focus score"
            icon={
              <TrendingUp
                size={18}
                strokeWidth={1.75}
                color="var(--color-teal)"
              />
            }
            iconBg="var(--color-cool-surface)"
            sub="Across all classes"
            subColor="var(--color-teal)"
          />
          <StatSummaryCard
            value={18 * Math.max(classes.length, 1)}
            label="Total sessions"
            icon={
              <Clock size={18} strokeWidth={1.75} color="var(--color-coral)" />
            }
            iconBg="var(--color-cream)"
            sub="This term"
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>Average focus by class</span>
              <span className={styles.chartSub}>Current term</span>
            </div>

            <div className={styles.barList}>
              {CLASS_COMPARISON.map((c) => (
                <div key={c.id} className={styles.barRow}>
                  <span className={styles.barLabel}>
                    <span aria-hidden="true">{c.emoji}</span> {c.name}
                  </span>
                  <div
                    className={styles.barTrack}
                    role="progressbar"
                    aria-valuenow={c.avgFocus}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${c.name}: ${c.avgFocus}% average focus`}
                  >
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${c.avgFocus}%`,
                        background:
                          c.avgFocus >= 75
                            ? 'var(--color-teal)'
                            : c.avgFocus >= 50
                              ? 'var(--color-sunflower)'
                              : 'var(--color-coral)',
                      }}
                    />
                  </div>
                  <span className={styles.barValue}>{c.avgFocus}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.donutCard}>
            <span className={styles.chartTitle}>State distribution</span>
            <div className={styles.donutWrap}>
              <div
                className={styles.donut}
                style={{
                  background: `conic-gradient(
                    var(--color-teal) 0deg ${61 * 3.6}deg,
                    var(--color-interface-purple) ${61 * 3.6}deg ${(61 + 18) * 3.6}deg,
                    var(--color-sunflower) ${(61 + 18) * 3.6}deg ${(61 + 18 + 15) * 3.6}deg,
                    var(--color-coral) ${(61 + 18 + 15) * 3.6}deg 360deg
                  )`,
                }}
                role="img"
                aria-label="Overall state distribution: focused 61%, relaxed 18%, distracted 15%, overstimulated 6%"
              >
                <div className={styles.donutHole}>
                  <span className={styles.donutPct}>61%</span>
                  <span className={styles.donutLbl}>focused</span>
                </div>
              </div>

              <div className={styles.legend}>
                {STATE_DIST.map(({ state, pct }) => (
                  <div key={state} className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: COGNITIVE_STATES[state].color }}
                      aria-hidden="true"
                    />
                    <span className={styles.legendLabel}>
                      {COGNITIVE_STATES[state].label}
                    </span>
                    <span className={styles.legendPct}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.stateCard}>
          <span className={styles.chartTitle}>
            Time in each cognitive state
          </span>
          <div className={styles.stateBars}>
            {STATE_DIST.map(({ state, pct }) => (
              <div key={state} className={styles.stateRow}>
                <StateBadge state={state} size="sm" />
                <div
                  className={styles.stateTrack}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${COGNITIVE_STATES[state].label}: ${pct}%`}
                >
                  <div
                    className={styles.stateFill}
                    style={{
                      width: `${pct}%`,
                      background: COGNITIVE_STATES[state].color,
                    }}
                  />
                </div>
                <span className={styles.statePct}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}
