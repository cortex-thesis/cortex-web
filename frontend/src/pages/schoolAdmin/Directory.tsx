import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { getSchoolAccounts, type SchoolAccount } from '../../lib/schoolAdminApi'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

export default function Directory() {
  const user = useAuthStore((state) => state.user)!
  const role = useLocation().pathname.endsWith('/teachers') ? 'teacher' : 'student'
  const [accounts, setAccounts] = useState<SchoolAccount[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { getSchoolAccounts().then((data) => setAccounts(data.accounts)).catch((reason: Error) => setError(reason.message)) }, [])
  const people = accounts.filter((account) => account.role === role && `${account.name} ${account.email}`.toLowerCase().includes(query.toLowerCase()))
  const title = role === 'teacher' ? 'Teachers' : 'Students'
  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School directory</span><h1 className={styles.title}>{title}</h1><p className={styles.subtitle}>Everyone registered under your school.</p></div></header>
    <div className={styles.toolbar}><input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} /></div>
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.card}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>School</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td className={styles.name}>{person.name}</td><td>{person.email}</td><td><span className={`${styles.badge} ${person.account_status === 'pending' ? styles.pending : ''}`}>{person.account_status}</span></td><td>{person.school ?? '—'}</td></tr>)}</tbody></table>{people.length === 0 && <p className={styles.meta}>No matching {title.toLowerCase()} found.</p>}</div>
  </div></SchoolAdminDashboard>
}
