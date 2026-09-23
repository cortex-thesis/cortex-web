import InfoTip from './InfoTip'

import type { TeacherDashboardData } from '../../lib/teacherApi'
import { COGNITIVE_STATES, type CognitiveState } from '../../constants/states'
import styles from './Dashboard.module.css'

import { periodRange } from './reportingDates'

const change = (value: number, unit: string) => `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}${unit === '%' ? '' : ' '}${unit}`

export default function DashboardTrends({ data }: { data: TeacherDashboardData }) {
  const previous = data.comparison
  if (!previous) return <p className={styles.statsNote}>Choose a week, month, or year to compare with the previous period.</p>
  const focusChange = data.average_focus != null && previous.average_focus != null ? data.average_focus - previous.average_focus : null
  const sessionsChange = data.total_sessions - previous.total_sessions
  const insights = [
    { label: 'Focused samples', value: focusChange == null ? 'Not comparable' : change(focusChange, '%'), detail: 'vs. previous period' },
    { label: 'Completed sessions', value: data.total_sessions.toLocaleString(), detail: sessionsChange === 0 ? 'Same as previous period' : `${change(sessionsChange, 'sessions')} vs. previous` },
  ]
  return <section className={styles.trends} aria-labelledby="trend-title">
    <div className={styles.trendHeading}><h3 id="trend-title">Period comparison</h3><InfoTip label="About the comparison period" text={`Compared with the previous ${data.reporting.period}: ${periodRange(previous.start, previous.end_exclusive)}. Both periods use the same class filter.`} />
      {data.reporting.is_partial && <span className={styles.partialPeriod}>In progress <InfoTip label="About the partial period" text={`The selected ${data.reporting.period} is still in progress. Its totals so far are compared with the full previous ${data.reporting.period}.`} /></span>}
    </div>
    <div className={styles.trendChartRow}>
    <section className={styles.comparisonCard} aria-label="EEG state comparison chart">
      <div className={styles.stateChartHeader}>
        <div className={styles.trendHeading}><h3>State comparison</h3><InfoTip label="How to read this chart" text="Bars show the share of valid EEG samples in each state on a shared 0–100% scale. Solid bars show the selected period; striped bars show the previous period. Change labels subtract the previous percentage from the selected percentage (for example, 55% minus 40% is +15%). They do not show relative percentage growth. N/A means no valid EEG samples, not zero." /></div>
        <div className={styles.periodLegend}><span><i />Selected</span><span><i className={styles.stripedKey} />Previous</span></div>
      </div>
      <div className={styles.stateChartScroll}>
        <div className={styles.stateChart}>
          <div className={styles.stateChartPlot}>
            <div className={styles.stateChartGrid} aria-hidden="true">{[100, 75, 50, 25, 0].map(tick => <div key={tick} style={{ top: `${100 - tick}%` }}><span>{tick}%</span></div>)}</div>
            <div className={styles.stateChartGroups}>
              {(Object.keys(COGNITIVE_STATES) as CognitiveState[]).map(state => <div className={styles.stateChartPair} key={state}>
                {[{ label: 'Selected', value: data.reporting.sample_count ? data.state_distribution[state] : null }, { label: 'Previous', value: previous.sample_count ? previous.state_distribution[state] : null }].map((item, index) => <div key={item.label} className={styles.stateChartColumn}>
                  <div className={`${styles.stateChartBar} ${index ? styles.stateChartPrevious : ''}`} style={{ height: `${Math.min(100, Math.max(0, item.value ?? 0))}%`, backgroundColor: COGNITIVE_STATES[state].color }}>
                    <span className={styles.stateChartValue} aria-label={`${COGNITIVE_STATES[state].label}, ${item.label}: ${item.value == null ? 'No data' : `${item.value}%`}`}>{item.value == null ? 'N/A' : `${item.value}%`}</span>
                  </div>
                </div>)}
              </div>)}
            </div>
          </div>
          <div className={styles.stateChartLabels}>{(Object.keys(COGNITIVE_STATES) as CognitiveState[]).map(state => <div key={state}>
            <strong><i style={{ background: COGNITIVE_STATES[state].color }} />{COGNITIVE_STATES[state].label}</strong>
            <span>{data.reporting.sample_count && previous.sample_count ? change(data.state_distribution[state] - previous.state_distribution[state], '%') : 'Not comparable'}</span>
          </div>)}</div>
        </div>
      </div>
    </section>
    <aside className={styles.trendInsights} aria-label="Comparison insights">
      <div className={styles.trendHeading}><h3>Insights</h3><InfoTip label="About these insights" text="These describe recorded samples, not performance scores. Differences in students, session lengths, and sample coverage can affect comparisons. Focus requires valid EEG samples in both periods." /></div>
      {insights.map(insight => <div className={styles.insightMetric} key={insight.label}><span>{insight.label}</span><strong>{insight.value}</strong><small>{insight.detail}</small></div>)}
      <div className={styles.trendHeading}><span>Sample coverage</span><InfoTip label="Sample coverage details" text={`Selected: ${data.reporting.sample_count.toLocaleString()} valid samples across ${data.reporting.measured_sessions} measured sessions. Previous: ${previous.sample_count.toLocaleString()} valid samples across ${previous.measured_sessions} measured sessions.`} /></div>
    </aside>
    </div>
    <details className={styles.comparisonDetails}><summary>View exact comparison data</summary><div className={styles.trendTableWrap}><table className={styles.trendTable}>
      <caption>Selected period and reference period</caption>
      <thead><tr><th scope="col">Metric</th><th scope="col">Selected</th><th scope="col">Previous</th><th scope="col">Change</th></tr></thead>
      <tbody>
        <tr><th scope="row">Completed sessions</th><td>{data.total_sessions}</td><td>{previous.total_sessions}</td><td>{change(sessionsChange, 'sessions')}</td></tr>
        <tr><th scope="row">Sessions with valid EEG</th><td>{data.reporting.measured_sessions}</td><td>{previous.measured_sessions}</td><td>{change(data.reporting.measured_sessions - previous.measured_sessions, 'sessions')}</td></tr>
        <tr><th scope="row">Valid EEG samples</th><td>{data.reporting.sample_count.toLocaleString()}</td><td>{previous.sample_count.toLocaleString()}</td><td>{change(data.reporting.sample_count - previous.sample_count, 'samples')}</td></tr>
        {(Object.keys(data.state_distribution) as CognitiveState[]).map(state => <tr key={state}>
          <th scope="row">{COGNITIVE_STATES[state].label} samples</th>
          <td>{data.reporting.sample_count ? `${data.state_distribution[state]}%` : 'No data'}</td>
          <td>{previous.sample_count ? `${previous.state_distribution[state]}%` : 'No data'}</td>
          <td>{data.reporting.sample_count && previous.sample_count ? change(data.state_distribution[state] - previous.state_distribution[state], '%') : '—'}</td>
        </tr>)}
      </tbody>
    </table></div></details>
  </section>
}
