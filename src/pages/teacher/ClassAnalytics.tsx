import { useParams } from 'react-router-dom'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { StateBadge } from '../../components/atoms'
import { COGNITIVE_STATES } from '../../constants/states'
import type { CognitiveState } from '../../constants/states'
import { TrendingUp, Clock, Target, Award } from 'lucide-react'
import { mockTeacher, mockClasses } from '../../mocks'
import styles from './ClassAnalytics.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Content', path: `/teacher/class/${classId}/content` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

const SESSIONS = [
  { label: 'S1', score: 55 },
  { label: 'S2', score: 68 },
  { label: 'S3', score: 45 },
  { label: 'S4', score: 78 },
  { label: 'S5', score: 82 },
  { label: 'S6', score: 71 },
]

const STATE_DIST: { state: CognitiveState; pct: number }[] = [
  { state: 'focused', pct: 68 },
  { state: 'relaxed', pct: 20 },
  { state: 'distracted', pct: 12 },
  { state: 'overstimulated', pct: 0 },
]

const MAX_SCORE = 100

export default function ClassAnalytics() {
  const { classId = 'class-001' } = useParams()

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const avgFocus = Math.round(
    SESSIONS.reduce((s, x) => s + x.score, 0) / SESSIONS.length
  )

  return (
    <TeacherTabTemplate
      user={mockTeacher}
      tabs={CLASS_TABS(classId)}
      title={`${classData.iconEmoji} ${classData.name}`}
    >
      <div className={styles.content}>
        <div className={styles.statsRow}>
          <StatSummaryCard
            value={`${avgFocus}%`}
            label="Avg focus score"
            icon={<TrendingUp size={18} strokeWidth={1.75} color="#1D9E75" />}
            iconBg="#E1F5EE"
            sub="Across all sessions"
            subColor="#1D9E75"
          />
          <StatSummaryCard
            value={18}
            label="Total sessions"
            icon={<Clock size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
            sub="This term"
            subColor="#534AB7"
          />
          <StatSummaryCard
            value="24:10"
            label="Avg session time"
            icon={<Target size={18} strokeWidth={1.75} color="#D4537E" />}
            iconBg="#FBEAF0"
          />
          <StatSummaryCard
            value="82%"
            label="Best session"
            icon={<Award size={18} strokeWidth={1.75} color="#EF9F27" />}
            iconBg="#FAEEDA"
            sub="Session 5"
            subColor="#EF9F27"
          />
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard}>
            <span className={styles.chartTitle}>
              Focus score across sessions
            </span>
            <div
              className={styles.barChart}
              role="img"
              aria-label="Focus score bar chart"
            >
              {SESSIONS.map(({ label, score }) => (
                <div key={label} className={styles.barGroup}>
                  <span className={styles.barScore}>{score}%</span>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${(score / MAX_SCORE) * 100}%`,
                      background:
                        score >= 75
                          ? '#1D9E75'
                          : score >= 50
                            ? '#EF9F27'
                            : '#D85A30',
                    }}
                    role="presentation"
                  />
                  <span className={styles.barLabel}>{label}</span>
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
                    #1D9E75 0deg ${68 * 3.6}deg,
                    #378ADD ${68 * 3.6}deg ${(68 + 20) * 3.6}deg,
                    #EF9F27 ${(68 + 20) * 3.6}deg ${(68 + 20 + 12) * 3.6}deg,
                    #E4E4EE ${(68 + 20 + 12) * 3.6}deg 360deg
                  )`,
                }}
                role="img"
                aria-label={`State distribution: focused 68%, relaxed 20%, distracted 12%`}
              >
                <div className={styles.donutHole}>
                  <span className={styles.donutPct}>68%</span>
                  <span className={styles.donutLbl}>focused</span>
                </div>
              </div>

              <div className={styles.legend}>
                {STATE_DIST.filter((s) => s.pct > 0).map(({ state, pct }) => (
                  <div key={state} className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{
                        background: COGNITIVE_STATES[state].color,
                      }}
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
    </TeacherTabTemplate>
  )
}
