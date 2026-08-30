import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { createTeacherClass, type TeacherClass } from '../../lib/teacherApi'
import { useAuthStore } from '../../store/authStore'
import styles from '../prototype/Prototype.module.css'

export default function ClassSetup() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)!
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [created, setCreated] = useState<TeacherClass | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true); setError('')
    try { setCreated(await createTeacherClass({ name, description, school_year: schoolYear })) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create class.') }
    finally { setSaving(false) }
  }

  return <TeacherDashboardTemplate user={user}><div className={styles.pageNarrow}><button className={styles.ghost} onClick={() => navigate('/teacher/classes')}><ArrowLeft size={13} /> Classes</button><div className={styles.card}>{created ? <div className={styles.center}><div className={styles.heroIcon}><Check size={30} /></div><h1 className={styles.title}>Class created</h1><p className={styles.subtitle} style={{ margin: '8px auto' }}>Invite learners using class code <strong>{created.code}</strong>.</p><p className={styles.subtitle}>This section automatically has all 7 learning packages.</p><div className={styles.actions} style={{ justifyContent: 'center', marginTop: 18 }}><button className={styles.primary} onClick={() => navigate(`/teacher/class/${created.id}/enroll`)}>Enroll students</button><button className={styles.secondary} onClick={() => navigate('/teacher/classes')}>View classes</button></div></div> : <><span className={styles.eyebrow}>Class management</span><h1 className={styles.title}>Create a new class</h1><p className={styles.subtitle}>Create a student section. All seven learning packages are included automatically.</p><div className={styles.divider} /><div className={styles.formGrid}><label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Class name</span><input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Section A" /></label><label className={styles.field}><span className={styles.label}>School year</span><input className={styles.input} value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)} placeholder="e.g. 2026–2027" /></label><label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Description</span><textarea className={styles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional section notes" /></label></div>{error && <p>{error}</p>}<button disabled={saving || !name.trim()} className={styles.primary} style={{ marginTop: 18 }} onClick={() => void submit()}><Plus size={13} /> {saving ? 'Creating…' : 'Create class'}</button></>}</div></div></TeacherDashboardTemplate>
}
