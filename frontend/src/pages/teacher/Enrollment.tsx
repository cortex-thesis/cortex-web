import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TeacherDashboardTemplate } from '../../components/templates'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import { enrollStudent, getTeacherClass, removeStudent, type RosterStudent, type TeacherClass } from '../../lib/teacherApi'
import styles from '../prototype/Prototype.module.css'

export default function Enrollment() {
  const { classId = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)!
  const [schoolClass, setSchoolClass] = useState<TeacherClass | null>(null)
  const [students, setStudents] = useState<RosterStudent[]>([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    let cancelled = false
    setSchoolClass(null); setError('')
    void Promise.all([getTeacherClass(classId), api<{ students: RosterStudent[] }>('/teacher/students/', { cache: 'no-store' })])
      .then(([section, directory]) => { if (!cancelled) { setSchoolClass(section); setStudents(directory.students) } })
      .catch(reason => { if (!cancelled) setError(reason.message) })
    return () => { cancelled = true }
  }, [classId])
  async function toggle(student: RosterStudent, enrolled: boolean) {
    setBusy(true); setError(''); setMessage('')
    try {
      await (enrolled ? removeStudent(classId, student.id) : enrollStudent(classId, student.id))
      setSchoolClass(await getTeacherClass(classId))
      setMessage(`${student.name} ${enrolled ? 'removed from' : 'enrolled in'} this section.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update enrollment.') }
    finally { setBusy(false) }
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(schoolClass!.code); setMessage('Class code copied.') }
    catch { setMessage(`Class code: ${schoolClass!.code}`) }
  }
  return <TeacherDashboardTemplate user={user}><div className={styles.page}>
    <div className={styles.header}><div><h1 className={styles.title}>Enroll students</h1><p className={styles.subtitle}>{schoolClass?.name ?? 'Loading section…'}</p></div><button className={styles.secondary} onClick={() => navigate(`/teacher/class/${classId}/students`)}>View roster</button></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {schoolClass && <div className={styles.grid2}>
      <section className={styles.card}><h2 className={styles.cardTitle}>Class invitation</h2><p>Students can enter this code from Join Class.</p><p><strong>{schoolClass.code}</strong></p><button className={styles.secondary} onClick={() => void copyCode()}>Copy class code</button><p>{schoolClass.student_count} students enrolled. Enrollment changes save immediately.</p><button className={styles.primary} onClick={() => navigate(`/teacher/class/${classId}/session`)}>Open teacher-led session</button></section>
      <section className={styles.card}><label className={styles.field}>Find students<input className={styles.input} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or student number" /></label><div className={styles.list}>{students.filter(student => `${student.name} ${student.student_number}`.toLowerCase().includes(search.toLowerCase())).map(student => {
        const enrolled = schoolClass.students?.some(item => item.id === student.id) ?? false
        return <div className={styles.listItem} key={student.id}><span>{student.name}<small> {student.student_number || 'Not assigned'}</small></span><button className={styles.secondary} disabled={busy || schoolClass.status !== 'active'} onClick={() => void toggle(student, enrolled)}>{enrolled ? 'Remove from section' : 'Enroll student'}</button></div>
      })}</div>{!students.length && <p>No students available. Students can register and join using the class code.</p>}</section>
    </div>}
  </div></TeacherDashboardTemplate>
}
