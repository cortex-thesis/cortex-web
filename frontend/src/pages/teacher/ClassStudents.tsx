import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { TableSkeleton } from '../../components/molecules'
import { Avatar } from '../../components/atoms'
import { getTeacherClass, type TeacherClass } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import styles from './ClassStudents.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

export default function ClassStudents() {
  const navigate = useNavigate()
  const { classId = '' } = useParams()
  const user = useAuthStore((state) => state.user)!
  const [classData, setClassData] = useState<TeacherClass | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getTeacherClass(classId).then(setClassData).catch((reason: Error) => setError(reason.message))
  }, [classId])

  const students = useMemo(() => (classData?.students ?? []).filter((student) => student.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [classData, search])

  return (
    <TeacherTabTemplate user={user} tabs={CLASS_TABS(classId)} title={`🏫 ${classData?.name ?? 'Class'}`}>
      <button onClick={() => navigate(`/teacher/class/${classId}/enroll`)}>Manage enrollment</button>
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}><Search size={14} strokeWidth={1.75} className={styles.searchIcon} /><input className={styles.searchInput} placeholder="Search students..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search students" /></div>
        </div>
        {error && <p>{error}</p>}
        {!classData && !error ? <TableSkeleton rows={7} columns={6} /> : <div className={styles.table}>
          <div className={styles.tableHeader}><span className={styles.th}>Student</span><span className={styles.th}>Student number</span><span className={styles.th}>Sessions</span><span className={styles.th}>Last state</span><span className={styles.th}>Journal entries</span><span className={styles.th}></span></div>
          {students.map((student) => (
            <div key={student.id} className={styles.tableRow}>
              <div className={styles.studentInfo}><Avatar name={student.name} imageUrl={student.avatar} size="sm" /><span className={styles.studentName}>{student.name}</span></div>
              <span className={styles.tdMuted}>{student.student_number || 'Not assigned'}</span><span className={styles.tdMuted}>{student.session_count ?? 0}</span><span className={styles.tdMuted}>{student.last_state ? student.last_state.charAt(0).toUpperCase() + student.last_state.slice(1) : 'No sessions'}</span><span className={styles.tdMuted}>{student.journal_count ?? 0} {(student.journal_count ?? 0) === 1 ? 'entry' : 'entries'}</span>
              <div><button className={styles.viewBtn} onClick={() => navigate(`/teacher/class/${classId}/student/${student.id}`)}>View profile</button></div>
            </div>
          ))}
          {!error && students.length === 0 && <div className={styles.tableRow}><span className={styles.tdMuted}>No students enrolled in this section.</span></div>}
        </div>}
      </div>
    </TeacherTabTemplate>
  )
}
