import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Plus, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { AdminShell } from '../prototype'
import styles from '../prototype/Prototype.module.css'

interface School { id: string; name: string; address: string; contact_email: string; contact_number: string; is_active: boolean; created_at: string }
const initialForm = { name: '', address: '', contact_email: '', contact_number: '' }

export default function Schools() {
  const navigate = useNavigate()
  const [schools, setSchools] = useState<School[]>([])
  const [form, setForm] = useState(initialForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = () => api<{ schools: School[] }>('/admin/schools/').then((payload) => setSchools(payload.schools))
  useEffect(() => { void api<{ schools: School[] }>('/admin/schools/').then((payload) => setSchools(payload.schools)).catch((reason: Error) => setError(reason.message)) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      await api('/admin/schools/', { method: 'POST', body: JSON.stringify(form) })
      setForm(initialForm); setShowForm(false); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create school.') } finally { setSaving(false) }
  }
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  return <AdminShell active="schools"><div className={styles.page}>
    <div className={styles.header}><div><span className={styles.eyebrow}>Institution management</span><h1 className={styles.title}>Schools and SPED centers</h1><p className={styles.subtitle}>Register institutions before assigning administrators, teachers, students, and classes.</p></div><button className={styles.primary} onClick={() => setShowForm((value) => !value)}><Plus size={14} /> {showForm ? 'Close form' : 'Add school'}</button></div>
    {error && <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">{error}</div>}
    {showForm && <form className={styles.card} onSubmit={(event) => void submit(event)}><h2 className={styles.cardTitle}>School information</h2><p className={styles.cardSub}>These fields match the shared database school record.</p><div className={styles.formGrid} style={{ marginTop: 16 }}>
      <label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>School or center name</span><input required maxLength={200} className={styles.input} value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Address</span><textarea className={styles.textarea} value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
      <label className={styles.field}><span className={styles.label}>Contact email</span><input type="email" className={styles.input} value={form.contact_email} onChange={(event) => update('contact_email', event.target.value)} /></label>
      <label className={styles.field}><span className={styles.label}>Contact number</span><input maxLength={30} className={styles.input} value={form.contact_number} onChange={(event) => update('contact_number', event.target.value)} /></label>
    </div><button className={styles.primary} disabled={saving} style={{ marginTop: 16 }}><Building2 size={14} /> {saving ? 'Saving…' : 'Create school'}</button></form>}
    <section className={styles.section}><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Registered institutions</h2><span className={styles.badgePurple}>{schools.length} schools</span></div>{schools.length === 0 ? <div className={styles.card}>No schools have been registered.</div> : <div className={styles.grid2}>{schools.map((school) => <article className={styles.card} key={school.id}><div className={styles.sectionHead}><span className={styles.statIcon}><Building2 size={18} /></span><span className={school.is_active ? styles.badge : styles.badgeGold}>{school.is_active ? 'Active' : 'Inactive'}</span></div><h2 className={styles.cardTitle}>{school.name}</h2><p className={styles.cardSub}>{school.address || 'No address provided'}</p><div className={styles.divider} /><span className={styles.listMeta}>{school.contact_email || 'No contact email'}</span><span className={styles.listMeta}>{school.contact_number || 'No contact number'}</span><button className={styles.secondary} style={{ marginTop: 14 }} onClick={() => navigate(`/admin/accounts?school=${school.id}&add=teacher`)}><UserPlus size={14} /> Add or manage teachers</button></article>)}</div>}</section>
  </div></AdminShell>
}
