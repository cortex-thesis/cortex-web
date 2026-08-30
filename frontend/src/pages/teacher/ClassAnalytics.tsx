import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { TrendingUp, Clock, Target, Award } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from './ClassAnalytics.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

interface AnalyticsData { class: { name: string }; student_count: number; session_count: number; average_focus: number | null; completion_rate: number | null; message: string }

export default function ClassAnalytics() {
  const { classId = '' } = useParams()
  const user = useAuthStore((state) => state.user)!
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<AnalyticsData>(`/teacher/classes/${classId}/analytics/`).then(setData).catch((reason: Error) => setError(reason.message)) }, [classId])
  return (
    <TeacherTabTemplate user={user} tabs={CLASS_TABS(classId)} title={`🏫 ${data?.class.name ?? 'Class'}`}>
      <div className={styles.content}>
        {error && <p>{error}</p>}
        <div className={styles.statsRow}>
          <StatSummaryCard value={data?.average_focus == null ? '—' : `${data.average_focus}%`} label="Avg focus score" icon={<TrendingUp size={18} color="var(--color-teal)" />} iconBg="var(--color-cool-surface)" />
          <StatSummaryCard value={data?.session_count ?? 0} label="Total sessions" icon={<Clock size={18} color="var(--color-interface-purple)" />} iconBg="var(--color-cool-surface)" />
          <StatSummaryCard value={data?.completion_rate == null ? '—' : `${data.completion_rate}%`} label="Completion rate" icon={<Target size={18} color="var(--color-coral)" />} iconBg="var(--color-cream)" />
          <StatSummaryCard value={data?.student_count ?? 0} label="Students" icon={<Award size={18} color="#534AB7" />} iconBg="#EEEDFE" />
        </div>
        <section className={styles.chartCard}><h2>Class analytics</h2><p>{data?.message ?? 'Loading analytics…'}</p></section>
      </div>
    </TeacherTabTemplate>
  )
}
