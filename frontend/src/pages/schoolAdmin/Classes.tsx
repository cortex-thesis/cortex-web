import { useEffect, useState } from 'react'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { TableSkeleton } from '../../components/molecules'
import { getTeacherClasses, type TeacherClass } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

export default function Classes() {
  const user = useAuthStore((state) => state.user)!
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { getTeacherClasses().then((data) => setClasses(data.classes)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)) }, [])
  const shown = classes.filter((item) => `${item.name} ${item.teacher.name} ${item.code}`.toLowerCase().includes(query.toLowerCase()))
  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School academics</span><h1 className={styles.title}>All classes</h1><p className={styles.subtitle}>View every class, assigned teacher, and enrollment total.</p></div></header>
    <div className={styles.toolbar}><input className={styles.search} aria-label="Search classes or teachers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes or teachers…" /></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.card}><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="School classes">{loading ? <TableSkeleton rows={7} columns={5} /> : <><table className={styles.table}><thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Code</th><th>Status</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td data-label="Class" className={styles.name}>{item.name}</td><td data-label="Teacher">{item.teacher.name}</td><td data-label="Students">{item.student_count}</td><td data-label="Code">{item.code}</td><td data-label="Status"><span className={styles.badge}>{item.status}</span></td></tr>)}</tbody></table>{shown.length === 0 && <p className={styles.meta}>No matching classes found.</p>}</>}</div></div>
  </div></SchoolAdminDashboard>
}
