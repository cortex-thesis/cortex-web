import { useEffect, useState, type FormEvent } from 'react'
import { Plus, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createAccount, createSchool, getSchoolAccounts, getSchools, type School, type SchoolAccount } from '../../lib/schoolAdminApi'
import { useAuthStore } from '../../store/authStore'
import styles from '../prototype/Prototype.module.css'

function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  return <div className={styles.adminRoot}><nav className={styles.adminNav}><div className={styles.adminBrand}><ShieldCheck size={20} /> Cortex Admin</div><div className={styles.adminLinks}><button className={styles.adminLink} onClick={() => navigate('/admin/dashboard')}>Overview</button><button className={`${styles.adminLink} ${styles.adminLinkActive}`}>Accounts</button><button className={styles.adminLink} onClick={() => navigate('/admin/evaluation')}>Validation</button><button className={styles.adminLink} onClick={() => void logout().then(() => navigate('/', { replace: true }))}>Sign out</button></div></nav>{children}</div>
}

const emptyForm = { username: '', name: '', email: '', temporary_password: '', role: 'student' as const, school_id: '' }

export default function Accounts() {
  const [accounts, setAccounts] = useState<SchoolAccount[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [form, setForm] = useState<{ username: string; name: string; email: string; temporary_password: string; role: 'admin' | 'teacher' | 'student'; school_id: string }>(emptyForm)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', contact_email: '', contact_number: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [accountData, schoolData] = await Promise.all([getSchoolAccounts(), getSchools()])
    setAccounts(accountData.accounts); setSchools(schoolData.schools)
    setForm((value) => ({ ...value, school_id: value.school_id || schoolData.schools[0]?.id || '' }))
  }
  useEffect(() => {
    void Promise.all([getSchoolAccounts(), getSchools()]).then(([accountData, schoolData]) => {
      setAccounts(accountData.accounts)
      setSchools(schoolData.schools)
      setForm((value) => ({ ...value, school_id: value.school_id || schoolData.schools[0]?.id || '' }))
    }).catch((reason: Error) => setError(reason.message))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const created = await createAccount(form)
      setMessage(`${created.name} was created successfully.`)
      setForm({ ...emptyForm, school_id: schools[0]?.id || '' }); setShowForm(false)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create account.') }
    finally { setSaving(false) }
  }

  async function submitSchool(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try { const school = await createSchool(schoolForm); setMessage(`${school.name} was registered successfully.`); setSchoolForm({ name: '', address: '', contact_email: '', contact_number: '' }); setShowSchoolForm(false); await load() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to register school.') } finally { setSaving(false) }
  }

  const filtered = accounts.filter((account) => `${account.name} ${account.email} ${account.school}`.toLowerCase().includes(query.toLowerCase()) && (roleFilter === 'all' || account.role === roleFilter) && (statusFilter === 'all' || account.account_status === statusFilter) && (schoolFilter === 'all' || account.school === schoolFilter))
  return <AdminShell><div className={styles.page}>
    <div className={styles.header}><div><span className={styles.eyebrow}>User management</span><h1 className={styles.title}>Accounts and roles</h1><p className={styles.subtitle}>Create users, assign access roles, and manage accounts across registered schools.</p></div><div className={styles.actions}><button className={styles.secondary} onClick={() => setShowSchoolForm((value) => !value)}><Plus size={14}/> {showSchoolForm ? 'Close school form' : 'Register school'}</button><button className={styles.primary} onClick={() => setShowForm((value) => !value)}>{showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Close' : 'New account'}</button></div></div>
    {showSchoolForm && <form className={styles.card} onSubmit={submitSchool}><h2 className={styles.cardTitle}>Register a school</h2><p className={styles.cardSub}>The new school will immediately become available when assigning accounts.</p><div className={styles.divider}/><div className={styles.formGrid}><label className={styles.field}><span className={styles.label}>School name</span><input className={styles.input} required value={schoolForm.name} onChange={(event) => setSchoolForm({ ...schoolForm, name: event.target.value })}/></label><label className={styles.field}><span className={styles.label}>School email</span><input className={styles.input} type="email" value={schoolForm.contact_email} onChange={(event) => setSchoolForm({ ...schoolForm, contact_email: event.target.value })}/></label><label className={styles.field}><span className={styles.label}>Contact number</span><input className={styles.input} value={schoolForm.contact_number} onChange={(event) => setSchoolForm({ ...schoolForm, contact_number: event.target.value })}/></label><label className={styles.field}><span className={styles.label}>Address</span><input className={styles.input} value={schoolForm.address} onChange={(event) => setSchoolForm({ ...schoolForm, address: event.target.value })}/></label></div><div className={styles.actions} style={{ marginTop: 18 }}><button className={styles.primary} disabled={saving}>{saving ? 'Registering…' : 'Register school'}</button></div></form>}
    {showForm && <form className={styles.card} onSubmit={submit}><h2 className={styles.cardTitle}>Create account</h2><p className={styles.cardSub}>Assign the account to one of the schools already registered in Cortex.</p><div className={styles.divider}/><div className={styles.formGrid}>
      <label className={styles.field}><span className={styles.label}>Full name</span><input className={styles.input} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className={styles.field}><span className={styles.label}>Username</span><input className={styles.input} required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
      <label className={styles.field}><span className={styles.label}>Email address</span><input className={styles.input} type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label className={styles.field}><span className={styles.label}>Registered school</span><select className={styles.select} required value={form.school_id} onChange={(event) => setForm({ ...form, school_id: event.target.value })}><option value="" disabled>Select a school</option>{schools.filter((school) => school.is_active).map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
      <label className={styles.field}><span className={styles.label}>Role</span><select className={styles.select} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as typeof form.role })}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">School Administrator</option></select></label>
      <label className={styles.field}><span className={styles.label}>Temporary password</span><input className={styles.input} type="password" required minLength={8} value={form.temporary_password} onChange={(event) => setForm({ ...form, temporary_password: event.target.value })} /></label>
    </div><div className={styles.actions} style={{ marginTop: 18 }}><button className={styles.primary} disabled={saving || schools.length === 0}><UserPlus size={14} /> {saving ? 'Creating…' : 'Create account'}</button></div></form>}
    {message && <div className={`${styles.alert} ${styles.section}`}>{message}</div>}{error && <div className={`${styles.alert} ${styles.alertDanger} ${styles.section}`}>{error}</div>}
    <section className={styles.section}><div className={styles.toolbar}><label className={styles.field}><span className={styles.label}>Search accounts</span><input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, or school" /></label><label className={styles.field}><span className={styles.label}>Role</span><select className={styles.select} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option><option value="admin">School administrators</option><option value="teacher">Teachers</option><option value="student">Students</option></select></label><label className={styles.field}><span className={styles.label}>Status</span><select className={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="disabled">Disabled</option><option value="suspended">Suspended</option></select></label><label className={styles.field}><span className={styles.label}>School</span><select className={styles.select} value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}><option value="all">All schools</option>{schools.map((school) => <option key={school.id} value={school.name}>{school.name}</option>)}</select></label><button className={styles.ghost} onClick={() => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); setSchoolFilter('all') }}>Clear filters</button></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>User</th><th>Role</th><th>School</th><th>Status</th></tr></thead><tbody>{filtered.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className={styles.listMeta}>{account.email}</span></td><td>{account.role === 'admin' ? 'School Administrator' : account.role}</td><td>{account.school ?? '—'}</td><td><span className={account.account_status === 'active' ? styles.badge : styles.badgeGold}>{account.account_status}</span></td></tr>)}</tbody></table></div></section>
  </div></AdminShell>
}
