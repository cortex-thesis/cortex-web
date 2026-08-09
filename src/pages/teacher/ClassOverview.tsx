import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { TeacherTabTemplate } from '../../components/templates'
import { StudentStateCard, StatSummaryCard } from '../../components/molecules'
import { Users, Zap, Flame, ClipboardList } from 'lucide-react'
import type { StudentLive } from '../../types'
import type { CognitiveState } from '../../constants/states'
import {
  mockTeacher,
  mockClasses,
  mockStudentsLive,
  createMockEEGStream,
} from '../../mocks'
import styles from './ClassOverview.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Content', path: `/teacher/class/${classId}/content` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

export default function ClassOverview() {
  const { classId = 'class-001' } = useParams()

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const [students, setStudents] = useState<StudentLive[]>(mockStudentsLive)

  // Live mock EEG updates
  useEffect(() => {
    const stops = mockStudentsLive.map((s) =>
      createMockEEGStream(
        (state: CognitiveState) => {
          setStudents((prev) =>
            prev.map((st) =>
              st.id === s.id ? { ...st, currentState: state } : st
            )
          )
        },
        4000 + Math.random() * 2000
      )
    )
    return () => stops.forEach((stop) => stop())
  }, [])

  const active = students.filter((s) => s.isConnected)
  const avgFocus = active.length
    ? Math.round(
        active.reduce((sum, s) => sum + s.focusScore, 0) / active.length
      )
    : 0

  const tabs = CLASS_TABS(classId)

  return (
    <TeacherTabTemplate
      user={mockTeacher}
      tabs={tabs}
      title={`${classData.iconEmoji} ${classData.name}`}
    >
      <div className={styles.content}>
        <div className={styles.statsRow}>
          <StatSummaryCard
            value={classData.studentIds.length}
            label="Students"
            icon={<Users size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
          />
          <StatSummaryCard
            value={active.length}
            label="Active now"
            icon={<Zap size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
            sub="In session"
            subColor="#534AB7"
          />
          <StatSummaryCard
            value={`${avgFocus}%`}
            label="Avg focus score"
            icon={<Flame size={18} strokeWidth={1.75} color="#D4537E" />}
            iconBg="#FBEAF0"
            sub="This session"
            subColor="#1D9E75"
          />
          <StatSummaryCard
            value={18}
            label="Total sessions"
            icon={
              <ClipboardList size={18} strokeWidth={1.75} color="#5F5E5A" />
            }
            iconBg="#F8F8FC"
          />
        </div>

        <div className={styles.liveSection}>
          <div className={styles.liveHeader}>
            <span className={styles.liveTitle}>Students in session</span>
            <span className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden="true" />
              Live
            </span>
          </div>

          <div className={styles.grid}>
            {students.map((student) => (
              <StudentStateCard
                key={student.id}
                student={student}
                onOverride={(id) => {
                  console.log('Override:', id)
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </TeacherTabTemplate>
  )
}
