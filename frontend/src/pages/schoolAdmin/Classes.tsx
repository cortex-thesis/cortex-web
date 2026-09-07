import { useEffect, useState } from 'react'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { getTeacherClasses, type TeacherClass } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

export default function Classes() {
  const user = useAuthStore((state) => state.user)!
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { getTeacherClasses().then((data) => setClasses(data.classes)).catch((reason: Error) => setError(reason.message)) }, [])
  const shown = classes.filter((item) => `${item.name} ${item.teacher.name} ${item.code}`.toLowerCase().includes(query.toLowerCase()))
  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School academics</span><h1 className={styles.title}>All classes</h1><p className={styles.subtitle}>View every class, assigned teacher, and enrollment total.</p></div></header>
    <div className={styles.toolbar}><input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search classes or teachers…" /></div>
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.card}><table className={styles.table}><thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Code</th><th>Status</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td className={styles.name}>{item.name}</td><td>{item.teacher.name}</td><td>{item.student_count}</td><td>{item.code}</td><td><span className={styles.badge}>{item.status}</span></td></tr>)}</tbody></table>{shown.length === 0 && <p className={styles.meta}>No matching classes found.</p>}</div>
  </div></SchoolAdminDashboard>
}
