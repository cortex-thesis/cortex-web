import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Plus, Trash2, UserPlus, X } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import SchoolAdminDashboard from '../../components/templates/SchoolAdminDashboard'
import { createAccount, deletePendingAccount, getSchoolAccounts, updateAccountStatus, type SchoolAccount } from '../../lib/schoolAdminApi'
import { useAuthStore } from '../../store/authStore'
import styles from './SchoolAdmin.module.css'

const emptyForm = { username: '', name: '', email: '', temporary_password: '' }
export default function Directory() {
  const user = useAuthStore(state => state.user)!
  const role = useLocation().pathname.endsWith('/teachers') ? 'teacher' : 'student'
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || 'all'
  const [accounts, setAccounts] = useState<SchoolAccount[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const request = useRef<AbortController | null>(null)
  const [form, setForm] = useState(emptyForm)
  const load = useCallback(async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    try {
      const data = await getSchoolAccounts(controller.signal)
      if (!controller.signal.aborted) { setAccounts(data.accounts); setLoadError('') }
    } catch (reason) {
      if (!controller.signal.aborted) setLoadError(reason instanceof Error ? reason.message : 'Unable to load accounts.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    let disposed = false
    queueMicrotask(() => { if (!disposed) void load() })
    const refresh = () => { void load() }
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 15000)
    return () => { disposed = true; request.current?.abort(); clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [load])
  const people = accounts.filter(account => account.role === role && (status === 'all' || account.account_status === status) && `${account.name} ${account.email} ${account.username}`.toLowerCase().includes(query.toLowerCase()))
  const pendingCount = accounts.filter(account => account.role === 'teacher' && account.account_status === 'pending').length
  const title = role === 'teacher' ? 'Teachers' : 'Students'
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    pending.current = true; setSaving(true); setError(''); setMessage('')
    try {
      await createAccount({ ...form, role, school_id: '' })
      setForm(emptyForm); setShowForm(false)
      setMessage(`${role === 'teacher' ? 'Teacher' : 'Student'} account created and activated.`)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account.') }
    finally { pending.current = false; setSaving(false) }
  }
  async function changeStatus(person: SchoolAccount, nextStatus: SchoolAccount['account_status']) {
    if (pending.current) return
    if (person.account_status === 'pending' && nextStatus === 'disabled' && !window.confirm(`Reject ${person.name}'s registration? The account will be disabled and records retained.`)) return
    pending.current = true; setSaving(true); setError(''); setMessage('')
    try {
      const updated = await updateAccountStatus(person.id, nextStatus)
      setAccounts(current => current.map(account => account.id === person.id ? { ...account, ...updated } : account))
      setMessage(nextStatus === 'active' && person.account_status === 'pending' ? `${person.name} was approved and can now sign in.` : nextStatus === 'disabled' && person.account_status === 'pending' ? `${person.name}'s registration was rejected. The account is disabled.` : `${person.name}'s account status was updated.`)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update account.') }
    finally { pending.current = false; setSaving(false) }
  }
  async function remove(person: SchoolAccount) {
    if (pending.current || !window.confirm(`Remove access for ${person.name}? Their learning records will be preserved.`)) return
    pending.current = true; setSaving(true); setError(''); setMessage('')
    try { await deletePendingAccount(person.id); setMessage(`${person.name}'s access was removed.`); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to remove account.') }
    finally { pending.current = false; setSaving(false) }
  }
  return <SchoolAdminDashboard user={user}><div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>School directory</span><h1 className={styles.title}>{title}</h1><p className={styles.subtitle}>Create and manage {title.toLowerCase()} in your school only.</p></div><button className={styles.primary} onClick={() => setShowForm(value => !value)}>{showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? 'Close' : `Add ${role}`}</button></header>
    {showForm && <form className={`${styles.card} ${styles.section}`} onSubmit={submit}><h2 className={styles.sectionTitle}>New {role} account</h2><div className={styles.formGrid}>
      <label><span className={styles.meta}>Full name</span><input className={styles.search} required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label><span className={styles.meta}>Username</span><input className={styles.search} required value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} /></label>
      <label><span className={styles.meta}>Email</span><input className={styles.search} required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
      <label><span className={styles.meta}>Temporary password</span><input className={styles.search} required minLength={12} type="password" autoComplete="new-password" value={form.temporary_password} onChange={event => setForm({ ...form, temporary_password: event.target.value })} /></label>
    </div><button className={styles.primary} disabled={saving}><UserPlus size={15} /> {saving ? 'Creating...' : 'Create account'}</button></form>}
    <div className={styles.toolbar}>
      <input className={styles.search} aria-label={`Search ${title.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} />
      <label className={styles.filter}>Account status<select aria-label="Account status" className={styles.search} value={status} onChange={event => setParams(event.target.value === 'all' ? {} : { status: event.target.value })}><option value="all">All accounts</option><option value="pending">Pending approval</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="disabled">Disabled / rejected</option></select></label>
      <button className={styles.secondary} onClick={() => void load()}>Refresh accounts</button>
      {role === 'teacher' && <button className={styles.secondary} onClick={() => setParams({ status: 'pending' })}>{pendingCount} awaiting approval</button>}
    </div>
    {message && <p className={styles.success} role="status">{message}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {loadError && <p className={styles.error} role="alert">{loadError} <button className={styles.secondary} onClick={() => void load()}>Retry</button></p>}
    <div className={styles.card} aria-busy={loading || saving}>
      {loading ? <p role="status">Loading {title.toLowerCase()}...</p> : <>
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${title} directory`}><table className={styles.table}><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>School</th><th>Actions</th></tr></thead><tbody>{people.map(person => <tr key={person.id}>
          <td className={styles.name} data-label="Name">{person.name}</td><td data-label="Email">{person.email}</td>
          <td data-label="Status">{role === 'teacher' && person.account_status === 'pending' ? <span className={`${styles.badge} ${styles.pending}`}>Pending approval</span> : <select aria-label={`Status for ${person.name}`} className={styles.search} disabled={saving} value={person.account_status} onChange={event => void changeStatus(person, event.target.value as SchoolAccount['account_status'])}><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option><option value="disabled">Disabled</option></select>}</td>
          <td data-label="School">{person.school ?? 'Unassigned'}</td><td data-label="Actions"><div className={styles.actions}>
            {role === 'teacher' && person.account_status === 'pending' && <><button className={styles.primary} disabled={saving} aria-label={`Approve ${person.name}`} onClick={() => void changeStatus(person, 'active')}>Approve</button><button className={styles.danger} disabled={saving} aria-label={`Reject ${person.name}`} onClick={() => void changeStatus(person, 'disabled')}>Reject</button></>}
            {role === 'teacher' && <Link className={styles.secondary} aria-label={`View reports for ${person.name}`} to={`/school-admin/teachers/${person.id}/reports`}>View reports</Link>}
            <button className={styles.danger} disabled={saving} aria-label={`Remove ${person.name}`} onClick={() => void remove(person)}><Trash2 size={14} /> Remove</button>
          </div></td>
        </tr>)}</tbody></table></div>
        {!loadError && people.length === 0 && <p className={styles.meta}>No matching {title.toLowerCase()} found.</p>}
      </>}
    </div>
  </div></SchoolAdminDashboard>
}
