import { useEffect, useState } from 'react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { BookOpen, Clock, TrendingUp, Users } from 'lucide-react'
import { getTeacherDashboard, type TeacherDashboardData } from '../../lib/teacherApi'
import { cachedApiValue } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from './Dashboard.module.css'
import analyticsStyles from './Analytics.module.css'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)!
  const [data, setData] = useState<TeacherDashboardData | null>(() => cachedApiValue<TeacherDashboardData>('/teacher/dashboard/') ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    getTeacherDashboard().then(setData).catch((reason: Error) => setError(reason.message))
  }, [])

  return (
    <TeacherDashboardTemplate user={data?.teacher ?? user} hasNotification={Boolean(data?.unread_notifications)}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.analyticsSection} aria-labelledby="teacher-overview-heading">
            <div className={styles.analyticsHeader}>
              <div><span className={styles.analyticsEyebrow}>Class overview</span><h1 id="teacher-overview-heading" className={styles.analyticsTitle}>Learning statistics</h1></div>
            </div>
            {error && <p>{error}</p>}
            <div className={analyticsStyles.statsRow}>
              <StatSummaryCard value={data?.class_count ?? 0} label="Classes" icon={<BookOpen size={18} color="#534AB7" />} iconBg="var(--color-cool-surface)" />
              <StatSummaryCard value={data?.student_count ?? 0} label="Students" icon={<Users size={18} color="#1D9E75" />} iconBg="var(--color-cool-surface)" />
              <StatSummaryCard value="—" label="Avg focus score" icon={<TrendingUp size={18} color="var(--color-teal)" />} iconBg="var(--color-cool-surface)" sub="Available after sessions" />
              <StatSummaryCard value={data?.total_sessions ?? 0} label="Total sessions" icon={<Clock size={18} color="var(--color-coral)" />} iconBg="var(--color-cream)" />
            </div>
            <div className={analyticsStyles.chartCard}>
              <div className={analyticsStyles.chartHeader}><span className={analyticsStyles.chartTitle}>Students by class</span><span className={analyticsStyles.chartSub}>Current sections</span></div>
              <div className={analyticsStyles.barList}>
                {(data?.classes ?? []).map((item) => (
                  <div key={item.id} className={analyticsStyles.barRow}>
                    <span className={analyticsStyles.barLabel}>🏫 {item.name}</span>
                    <div className={analyticsStyles.barTrack}><div className={analyticsStyles.barFill} style={{ width: `${Math.min(100, item.student_count * 10)}%` }} /></div>
                    <span className={analyticsStyles.barValue}>{item.student_count}</span>
                  </div>
                ))}
                {data?.classes.length === 0 && <p>No classes yet.</p>}
              </div>
            </div>
          </section>
          <section className={styles.liveSection} aria-labelledby="live-session-heading">
            <div className={styles.liveSectionHeader}>
              <div><span className={styles.analyticsEyebrow}>Live classroom</span><h2 id="live-session-heading" className={styles.liveSectionTitle}>No session in progress</h2></div>
              <span className={styles.liveSectionNote}>Session data will appear when sessions are enabled.</span>
            </div>
          </section>
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}
