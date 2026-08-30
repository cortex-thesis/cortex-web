import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TeacherTabTemplate } from '../../components/templates'
import { StatSummaryCard } from '../../components/molecules'
import { Users, Zap, Flame, ClipboardList } from 'lucide-react'
import { getTeacherClass, type TeacherClass } from '../../lib/teacherApi'
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
  const [error, setError] = useState('')

  useEffect(() => {
    getTeacherClass(classId).then(setClassData).catch((reason: Error) => setError(reason.message))
  }, [classId])

  return (
    <TeacherTabTemplate user={user} tabs={CLASS_TABS(classId)} title={`🏫 ${classData?.name ?? 'Class'}`}>
      <div className={styles.content}>
        {error && <p>{error}</p>}
        <div className={styles.statsRow}>
          <StatSummaryCard value={classData?.student_count ?? 0} label="Students" icon={<Users size={18} color="#534AB7" />} iconBg="#EEEDFE" />
          <StatSummaryCard value={0} label="Active now" icon={<Zap size={18} color="#534AB7" />} iconBg="#EEEDFE" sub="No session" />
          <StatSummaryCard value="—" label="Avg focus score" icon={<Flame size={18} color="#D4537E" />} iconBg="#FBEAF0" sub="Available after sessions" />
          <StatSummaryCard value={0} label="Total sessions" icon={<ClipboardList size={18} color="#5F5E5A" />} iconBg="#F8F8FC" />
        </div>
        <div className={styles.liveLayout}>
          <section className={styles.contextPanel}>
            <div><span>Class code</span><strong>{classData?.code ?? '—'}</strong></div>
            <div><span>Curriculum</span><strong>All 7 learning packages</strong></div>
            <div><span>School year</span><strong>{classData?.school_year || 'Not set'}</strong></div>
            <div><span>Status</span><strong>{classData?.status ?? 'active'}</strong></div>
          </section>
          <aside className={styles.eegSidebar}><span className={styles.noSelection}>There is no session in progress. Live student and EEG data will appear here after sessions are enabled.</span></aside>
        </div>
      </div>
    </TeacherTabTemplate>
  )
}
