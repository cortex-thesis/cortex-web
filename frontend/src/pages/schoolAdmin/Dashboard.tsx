import { useEffect, useState } from 'react'
import { BookOpen, Brain, CheckCircle2, Clock, GraduationCap, Users } from 'lucide-react'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { CardGridSkeleton, ListSkeleton } from '../../components/molecules'
import { type SchoolDashboardData } from '../../lib/schoolAdminApi'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)!
  const [data, setData] = useState<SchoolDashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<SchoolDashboardData>(`/admin/dashboard/?refresh=${Date.now()}`).then(setData).catch((reason: Error) => setError(reason.message)) }, [])
  const stats = [[data?.class_count ?? 0, 'Active classes', BookOpen], [data?.teacher_count ?? 0, 'Teachers', GraduationCap], [data?.student_count ?? 0, 'Students', Users], [data?.total_sessions ?? 0, 'Total sessions', Clock]] as const
  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School overview</span><h1 className={styles.title}>{data?.administrator.school ?? 'Your school'}</h1><p className={styles.subtitle}>Overall learning activity, staffing, and enrollment at a glance.</p></div></header>
    {error && <p className={styles.error}>{error}</p>}
    {!data && !error && <><CardGridSkeleton count={4} /><ListSkeleton rows={5} /></>}
    {data && <>
    <div className={styles.stats}>{stats.map(([value, label, Icon]) => <div className={`${styles.card} ${styles.stat}`} key={label}><span className={styles.icon}><Icon size={19} /></span><span><strong className={styles.value}>{value}</strong><span className={styles.label}>{label}</span></span></div>)}</div>
    <section className={styles.performanceGrid} aria-label="School performance summary">
      <div className={`${styles.card} ${styles.performanceCard}`}><span className={styles.performanceIcon}><Brain size={20} /></span><div><span className={styles.meta}>Average focus</span><strong className={styles.performanceValue}>{data?.average_focus ?? 0}%</strong><div className={styles.progress}><span style={{ width: `${data?.average_focus ?? 0}%` }} /></div></div></div>
      <div className={`${styles.card} ${styles.performanceCard}`}><span className={styles.performanceIcon}><CheckCircle2 size={20} /></span><div><span className={styles.meta}>Average session completion</span><strong className={styles.performanceValue}>{data?.average_completion ?? 0}%</strong><div className={styles.progress}><span style={{ width: `${data?.average_completion ?? 0}%` }} /></div></div></div>
    </section>
    <section className={`${styles.card} ${styles.section}`}><h2 className={styles.sectionTitle}>Classes across the school</h2><div className={styles.classList}>{data?.classes.map((item) => <div className={styles.classRow} key={item.id}><span><span className={styles.name}>{item.name}</span><span className={styles.meta}>Code {item.code}</span></span><span><span className={styles.name}>{item.teacher.name}</span><span className={styles.meta}>Teacher</span></span><span><span className={styles.name}>{item.student_count}</span><span className={styles.meta}>Students</span></span><span><span className={styles.name}>{item.school_year || '—'}</span><span className={styles.meta}>School year</span></span></div>)}{data?.classes.length === 0 && <p className={styles.meta}>No active classes yet.</p>}</div></section>
    <section className={`${styles.card} ${styles.section}`}><h2 className={styles.sectionTitle}>Class performance</h2><div className={styles.performanceList}>{data.classes.map((item) => <div className={styles.performanceRow} key={item.id}><div><span className={styles.name}>{item.name}</span><span className={styles.meta}>{item.session_count} sessions · {item.student_count} students</span></div><div><span className={styles.metricLabel}>Focus <strong>{item.average_focus}%</strong></span><div className={styles.progress}><span style={{ width: `${item.average_focus}%` }} /></div></div><div><span className={styles.metricLabel}>Completion <strong>{item.average_completion}%</strong></span><div className={`${styles.progress} ${styles.completion}`}><span style={{ width: `${item.average_completion}%` }} /></div></div></div>)}</div></section>
    </>}
  </div></SchoolAdminDashboard>
}
