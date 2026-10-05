import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MoreHorizontal, Pencil, Plus, Power, Trash2, UserPlus, X } from 'lucide-react'
import { createAccount, createSchool, deleteAccount, editAccount, getSchoolAccounts, getSchools, updateAccountStatus, type School, type SchoolAccount } from '../../lib/schoolAdminApi'
import SuperAdminShell from '../../components/templates/SuperAdminShell'
import styles from '../prototype/Prototype.module.css'
import local from './Accounts.module.css'

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
  const [menu, setMenu] = useState<{ account: SchoolAccount; left: number; top: number } | null>(null)
  const [dialog, setDialog] = useState<{ account: SchoolAccount; action: 'edit' | 'delete' } | null>(null)
  const [edit, setEdit] = useState({ name: '', username: '', email: '' })
  const [confirmation, setConfirmation] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!menu) return
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setMenu(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [menu])
  useEffect(() => {
    if (dialog) { dialogRef.current?.showModal(); dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus() }
    else triggerRef.current?.focus()
  }, [dialog])

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

  function openDialog(account: SchoolAccount, action: 'edit' | 'delete') {
    setMenu(null); setError(''); setConfirmation('')
    setEdit({ name: account.name, username: account.username, email: account.email })
    setDialog({ account, action })
  }
  async function changeStatus(account: SchoolAccount) {
    setMenu(null); setSaving(true); setError(''); setMessage('')
    try {
      const active = account.account_status === 'active'
      await updateAccountStatus(account.id, active ? 'disabled' : 'active')
      setMessage(`${account.name} was ${active ? 'deactivated' : 'reactivated'}.`)
      setDialog(null)
      await load()
      window.dispatchEvent(new Event('cortex:notifications'))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to change account status.') }
    finally { setSaving(false); triggerRef.current?.focus() }
  }
  async function saveAccount(event: FormEvent) {
    event.preventDefault()
    if (!dialog || (dialog.action === 'delete' && confirmation !== dialog.account.username)) return
    setSaving(true); setError(''); setMessage('')
    try {
      if (dialog.action === 'edit') await editAccount(dialog.account.id, edit)
      else await deleteAccount(dialog.account.id)
      setMessage(`${dialog.account.name} was ${dialog.action === 'edit' ? 'updated' : 'deleted'}.`)
      setDialog(null)
      await load()
      window.dispatchEvent(new Event('cortex:notifications'))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save account changes.') }
    finally { setSaving(false) }
  }

  const filtered = accounts.filter((account) => `${account.name} ${account.email} ${account.school}`.toLowerCase().includes(query.toLowerCase()) && (roleFilter === 'all' || account.role === roleFilter) && (statusFilter === 'all' || account.account_status === statusFilter) && (schoolFilter === 'all' || account.school === schoolFilter))
  return <SuperAdminShell active="accounts"><main className={`${styles.page} ${local.page}`}>
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
    {message && <div role="status" className={`${styles.alert} ${styles.section}`}>{message}</div>}{error && !dialog && <div role="alert" className={`${styles.alert} ${styles.alertDanger} ${styles.section}`}>{error}</div>}
    <section className={styles.section}><div className={styles.toolbar}><label className={styles.field}><span className={styles.label}>Search accounts</span><input className={styles.input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, or school" /></label><label className={styles.field}><span className={styles.label}>Role</span><select className={styles.select} value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option><option value="admin">School administrators</option><option value="teacher">Teachers</option><option value="student">Students</option></select></label><label className={styles.field}><span className={styles.label}>Status</span><select className={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="disabled">Disabled</option><option value="suspended">Suspended</option></select></label><label className={styles.field}><span className={styles.label}>School</span><select className={styles.select} value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}><option value="all">All schools</option>{schools.map((school) => <option key={school.id} value={school.name}>{school.name}</option>)}</select></label><button className={styles.ghost} onClick={() => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); setSchoolFilter('all') }}>Clear filters</button></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>User</th><th>Role</th><th>School</th><th>Status</th><th><span className={local.srOnly}>Actions</span></th></tr></thead><tbody>{filtered.map((account) => <tr key={account.id}><td><strong>{account.name}</strong><span className={styles.listMeta}>{account.email}</span></td><td>{account.admin_scope === 'super' ? 'Super Administrator' : account.role === 'admin' ? 'School Administrator' : account.role}</td><td>{account.school ?? '—'}</td><td><span className={account.account_status === 'active' ? styles.badge : styles.badgeGold}>{account.account_status}</span></td><td><button className={local.actionButton} aria-label={`Actions for ${account.name}`} aria-haspopup="menu" aria-expanded={menu?.account.id === account.id} disabled={saving || account.admin_scope === 'super'} title={account.admin_scope === 'super' ? 'Super administrator account is protected' : 'Account actions'} onClick={event => { triggerRef.current = event.currentTarget; const bounds = event.currentTarget.getBoundingClientRect(); setMenu(menu?.account.id === account.id ? null : { account, left: Math.max(8, Math.min(bounds.right - 190, window.innerWidth - 198)), top: Math.max(8, Math.min(bounds.bottom + 6, window.innerHeight - 160)) }) }}><MoreHorizontal size={18} aria-hidden="true" /></button></td></tr>)}</tbody></table></div></section>
    {menu && <div ref={menuRef} className={local.menu} role="menu" aria-label={`Account actions for ${menu.account.name}`} style={{ left: menu.left, top: menu.top }} onKeyDown={event => {
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === 'Escape' || event.key === 'Tab') { setMenu(null); triggerRef.current?.focus() }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
      }
    }}><button role="menuitem" onClick={() => openDialog(menu.account, 'edit')}><Pencil size={14} aria-hidden="true" />Edit account</button><button role="menuitem" onClick={() => void changeStatus(menu.account)}><Power size={14} aria-hidden="true" />{menu.account.account_status === 'active' ? 'Deactivate account' : 'Reactivate account'}</button><button role="menuitem" className={local.deleteItem} onClick={() => openDialog(menu.account, 'delete')}><Trash2 size={14} aria-hidden="true" />Delete account</button></div>}
    {dialog && <dialog ref={dialogRef} className={local.dialog} aria-labelledby="account-dialog-title" aria-describedby="account-dialog-description" onCancel={event => { event.preventDefault(); if (!saving) setDialog(null) }}><form onSubmit={event => void saveAccount(event)}>
      <div className={styles.sectionHead}><h2 id="account-dialog-title" className={styles.sectionTitle}>{dialog.action === 'edit' ? 'Edit account' : 'Delete account'}</h2><button className={styles.ghost} type="button" aria-label="Close account dialog" disabled={saving} onClick={() => setDialog(null)}><X size={16} /></button></div>
      <p id="account-dialog-description" className={styles.cardSub}>{dialog.action === 'edit' ? 'Update the account name and sign-in details. Role, school and existing records are retained.' : 'This permanently removes an unlinked account. Accounts with protected learning or administrative records must be deactivated instead.'}</p>
      <div className={styles.divider} />
      {dialog.action === 'edit' ? <div className={local.editFields}><label className={styles.field}><span className={styles.label}>Full name</span><input className={styles.input} required maxLength={160} value={edit.name} onChange={event => setEdit({ ...edit, name: event.target.value })} /></label><label className={styles.field}><span className={styles.label}>Username</span><input className={styles.input} required maxLength={150} value={edit.username} onChange={event => setEdit({ ...edit, username: event.target.value })} /></label><label className={styles.field}><span className={styles.label}>Email address</span><input className={styles.input} required type="email" maxLength={254} value={edit.email} onChange={event => setEdit({ ...edit, email: event.target.value })} /></label></div> : <label className={styles.field}><span className={styles.label}>Type {dialog.account.username} to confirm deletion</span><input className={styles.input} required value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>}
      {error && <p role="alert" className={`${styles.alert} ${styles.alertDanger}`}>{error}</p>}
      <div className={`${styles.actions} ${local.dialogActions}`}><button className={styles.secondary} type="button" disabled={saving} onClick={() => setDialog(null)}>Cancel</button>{dialog.action === 'delete' && error && dialog.account.account_status === 'active' && <button className={styles.secondary} type="button" disabled={saving} onClick={() => void changeStatus(dialog.account)}>Deactivate instead</button>}<button className={dialog.action === 'delete' ? styles.danger : styles.primary} disabled={saving || (dialog.action === 'delete' && confirmation !== dialog.account.username)} type="submit">{saving ? 'Saving…' : dialog.action === 'delete' ? 'Delete account permanently' : 'Save changes'}</button></div>
    </form></dialog>}
  </main></SuperAdminShell>
}

