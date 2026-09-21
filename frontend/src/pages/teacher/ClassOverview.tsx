import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClipboardList, Flame, Users, Zap } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { getTeacherClass, getTeacherClassLive, getClassAnalytics, type ClassAnalyticsData, type LiveSession, type TeacherClass } from '../../lib/teacherApi'
import { RecentClassActivity } from '../../components/organisms/teacher/RecentClassActivity'
import buttonStyles from '../prototype/Prototype.module.css'
import { useAuthStore } from '../../store/authStore'
import styles from './ClassOverview.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

export default function ClassOverview() {
  const { classId = '' } = useParams()
  const user = useAuthStore((state) => state.user)!
  const [classData, setClassData] = useState<TeacherClass | null>(null)
  const [live, setLive] = useState<LiveSession[]>([])
  const [error, setError] = useState('')
  const [activity, setActivity] = useState<ClassAnalyticsData | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void getClassAnalytics(classId, '', controller.signal).then(setActivity).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [classId])

  useEffect(() => { void getTeacherClass(classId).then(setClassData).catch((reason: Error) => setError(reason.message)) }, [classId])
  useEffect(() => {
    const refresh = () => void getTeacherClassLive(classId).then((data) => setLive(data.active_sessions)).catch((reason: Error) => setError(reason.message))
    refresh(); const timer = window.setInterval(refresh, 4000)
    return () => window.clearInterval(timer)
  }, [classId])

  return <TeacherTabTemplate user={user} tabs={CLASS_TABS(classId)} title={`Class · ${classData?.name ?? ''}`}>
    <div className={styles.content}>
      <Link className={buttonStyles.primary} to={`/teacher/class/${classId}/session`}>Start a teacher-led session</Link>
      {error && <p>{error}</p>}
      <div className={styles.statsRow}>
        <StatSummaryCard value={classData?.student_count ?? 0} label="Students" icon={<Users size={18} color="#534AB7" />} iconBg="#EEEDFE" />
        <StatSummaryCard value={live.length} label="Active now" icon={<Zap size={18} color="#534AB7" />} iconBg="#EEEDFE" sub={live.length ? 'Receiving live data' : 'No session'} />
        <StatSummaryCard value={live.filter((item) => item.latest?.state === 'focused').length} label="Focused now" icon={<Flame size={18} color="#D4537E" />} iconBg="#FBEAF0" sub="Latest Muse window" />
        <StatSummaryCard value={live.filter((item) => item.latest).length} label="Streaming EEG" icon={<ClipboardList size={18} color="#5F5E5A" />} iconBg="#F8F8FC" />
      </div>
      <RecentClassActivity sessions={activity?.recent_sessions.slice(0, 3)} badges={activity?.recent_badges.slice(0, 3)} classId={classId} />
      <div className={styles.liveLayout}>
        <section className={styles.contextPanel}>
          <div><span>Class code</span><strong>{classData?.code ?? '—'}</strong></div>
          <div><span>Curriculum</span><strong>Assigned learning packages</strong></div>
          <div><span>School year</span><strong>{classData?.school_year || 'Not set'}</strong></div>
          <div><span>Status</span><strong>{classData?.status ?? 'active'}</strong></div>
        </section>
        <aside className={styles.eegSidebar}><span className={styles.sidebarTitle}>Live Muse 2 sessions</span>{live.length === 0 ? <span className={styles.noSelection}>No students are currently in a recorded lesson session.</span> : live.map((item) => <article className={styles.liveStudent} key={item.id}><strong>{item.student.name}</strong><span>{item.lesson}</span>{item.latest ? <><b>{item.latest.state}</b><div className={styles.liveBands}>{Object.entries(item.latest.bands).map(([band, value]) => <span key={band}>{band}<strong>{value.toFixed(2)}</strong></span>)}</div><small>{item.latest.accepted_channels}/4 clean channels · {item.latest.battery_level ?? '—'}% battery</small></> : <small>Waiting for calibrated Muse readings…</small>}</article>)}</aside>
      </div>
    </div>
  </TeacherTabTemplate>
}
