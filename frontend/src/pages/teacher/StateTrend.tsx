import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { TeacherDashboardData } from '../../lib/teacherApi'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import styles from './Dashboard.module.css'

export default function StateTrend({ state, data }: { state: CognitiveState; data: TeacherDashboardData | null }) {
  if (!data?.reporting.sample_count || !data.comparison?.sample_count) return null
  const difference = Number((data.state_distribution[state] - data.comparison.state_distribution[state]).toFixed(1))
  const Icon = difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : Minus
  const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'unchanged'
  const description = `${COGNITIVE_STATES[state].label}: ${difference === 0 ? 'unchanged' : `${direction} ${Math.abs(difference)} percentage points`} compared with the previous ${data.reporting.period}${data.reporting.is_partial ? ' (selected period still in progress)' : ''}`
  return <span className={styles.distributionTrend} data-direction={direction} title={description} role="img" aria-label={description} tabIndex={0}><Icon size={15} aria-hidden="true" /></span>
}
