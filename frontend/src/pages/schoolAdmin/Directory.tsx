import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { createAccount, deletePendingAccount, getSchoolAccounts, updateAccountStatus, type SchoolAccount } from '../../lib/schoolAdminApi'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

const emptyForm = { username: '', name: '', email: '', temporary_password: '' }

export default function Directory() {
  const user = useAuthStore((state) => state.user)!
  const role = useLocation().pathname.endsWith('/teachers') ? 'teacher' : 'student'
  const [accounts, setAccounts] = useState<SchoolAccount[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const load = () => getSchoolAccounts().then((data) => setAccounts(data.accounts))

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)) }, [])

  const people = accounts.filter((account) => account.role === role && `${account.name} ${account.email}`.toLowerCase().includes(query.toLowerCase()))
  const title = role === 'teacher' ? 'Teachers' : 'Students'

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      await createAccount({ ...form, role, school_id: '' })
      setForm(emptyForm); setShowForm(false)
      setMessage(`${role === 'teacher' ? 'Teacher' : 'Student'} account created and activated.`)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account.') }
    finally { setSaving(false) }
  }

  async function remove(person: SchoolAccount) {
    if (!window.confirm(`Remove access for ${person.name}? Their learning records will be preserved.`)) return
    try { await deletePendingAccount(person.id); setMessage(`${person.name}'s access was removed.`); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to remove account.') }
  }

  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School directory</span><h1 className={styles.title}>{title}</h1><p className={styles.subtitle}>Create and manage {title.toLowerCase()} in your school only.</p></div><button className={styles.primary} onClick={() => setShowForm((value) => !value)}>{showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Close' : `Add ${role}`}</button></header>
    {showForm && <form className={`${styles.card} ${styles.section}`} onSubmit={submit}><h2 className={styles.sectionTitle}>New {role} account</h2><div className={styles.formGrid}><label><span className={styles.meta}>Full name</span><input className={styles.search} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span className={styles.meta}>Username</span><input className={styles.search} required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label><label><span className={styles.meta}>Email</span><input className={styles.search} required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span className={styles.meta}>Temporary password</span><input className={styles.search} required minLength={12} type="password" value={form.temporary_password} onChange={(event) => setForm({ ...form, temporary_password: event.target.value })} /></label></div><button className={styles.primary} disabled={saving}><UserPlus size={15} /> {saving ? 'Creating…' : 'Create account'}</button></form>}
    <div className={styles.toolbar}><input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}…`} /></div>
    {message && <p className={styles.success}>{message}</p>}
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.card}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>School</th><th>Actions</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td className={styles.name}>{person.name}</td><td>{person.email}</td><td><select className={styles.search} value={person.account_status} onChange={(event) => void updateAccountStatus(person.id, event.target.value as SchoolAccount['account_status']).then(load).catch((reason: Error) => setError(reason.message))}><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select></td><td>{person.school ?? '—'}</td><td><button className={styles.danger} onClick={() => void remove(person)}><Trash2 size={14} /> Remove</button></td></tr>)}</tbody></table>{people.length === 0 && <p className={styles.meta}>No matching {title.toLowerCase()} found.</p>}</div>
  </div></SchoolAdminDashboard>
}
