import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { Avatar, StateBadge } from '../../components/atoms'
import type { CognitiveState } from '../../constants/states'
import { mockTeacher, mockClasses, mockStudentsLive } from '../../mocks'
import styles from './ClassStudents.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Content', path: `/teacher/class/${classId}/content` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

function getFocusColor(score: number): string {
  if (score >= 75) return 'var(--state-focused)'
  if (score >= 50) return 'var(--state-distracted)'
  return 'var(--color-coral)'
}

export default function ClassStudents() {
  const { classId = 'class-001' } = useParams()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'focus' | 'sessions'>('name')

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const filtered = mockStudentsLive
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'focus') return b.focusScore - a.focusScore
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      return 0
    })

  return (
    <TeacherTabTemplate
      user={mockTeacher}
      tabs={CLASS_TABS(classId)}
      title={`${classData.iconEmoji} ${classData.name}`}
    >
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search
              size={14}
              strokeWidth={1.75}
              className={styles.searchIcon}
            />
            <input
              className={styles.searchInput}
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students"
            />
          </div>
          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort by</span>
            {(['name', 'focus', 'sessions'] as const).map((s) => (
              <button
                key={s}
                className={`${styles.sortBtn} ${sortBy === s ? styles.sortActive : ''}`}
                onClick={() => setSortBy(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span className={styles.th}>Student</span>
            <span className={styles.th}>Focus score</span>
            <span className={styles.th}>Sessions</span>
            <span className={styles.th}>Last state</span>
            <span className={styles.th}>Journal entries</span>
            <span className={styles.th}></span>
          </div>

          {filtered.map((student) => (
            <div key={student.id} className={styles.tableRow}>
              <div className={styles.studentInfo}>
                <Avatar
                  name={student.name}
                  imageUrl={student.avatar}
                  size="sm"
                  showStatus
                  isOnline={student.isConnected}
                />
                <span className={styles.studentName}>{student.name}</span>
              </div>

              <span
                className={styles.td}
                style={{ color: getFocusColor(student.focusScore) }}
              >
                {student.focusScore}%
              </span>

              <span className={styles.tdMuted}>12</span>

              <div>
                {student.currentState ? (
                  <StateBadge
                    state={student.currentState as CognitiveState}
                    size="sm"
                  />
                ) : (
                  <span className={styles.tdMuted}>Offline</span>
                )}
              </div>

              <span className={styles.tdMuted}>3 entries</span>

              <div>
                <button className={styles.viewBtn}>View profile</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TeacherTabTemplate>
  )
}
