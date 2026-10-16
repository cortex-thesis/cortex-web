import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import type { SchoolYearOption } from '../teacher/reportingYears'
import styles from './SchoolAdmin.module.css'

export default function SchoolYears({ onChange }: { onChange: () => void }) {
  const [years, setYears] = useState<SchoolYearOption[]>([])
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { api<{ school_years: SchoolYearOption[] }>('/admin/school-years/').then(data => setYears(data.school_years)).catch((reason: Error) => setError(reason.message)) }, [])
  async function change(year: string, action: 'activate' | 'archive' | 'restore') {
    const message = action === 'archive' ? `Archive school year ${year}? Classes and learning records will be preserved and remain available in historical reports.` : action === 'activate' ? `Make ${year} the active school year? This changes the report default. Existing classes and historical records keep their assigned years.` : `Restore school year ${year} to management views?`
    if (!window.confirm(message)) return
    setBusy(true); setError('')
    try {
      const data = await api<{ school_years: SchoolYearOption[] }>('/admin/school-years/', { method: 'POST', body: JSON.stringify({ name: year, action, confirmed: true }) })
      setYears(data.school_years); setName(''); onChange()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update school year.') }
    finally { setBusy(false) }
  }
  return <section className={`${styles.card} ${styles.section}`} aria-label="School year management">
    <h2 className={styles.sectionTitle}>School years</h2>
    <p className={styles.meta}>Choose the active year before archiving a completed year. Historical records retain their class assignments.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {years.map(year => <div className={styles.yearRow} key={year.value}>
      <strong>{year.label}{year.is_archived ? ' (Archived)' : year.is_active ? ' (Active)' : ''}</strong>
      {year.value !== '__unassigned__' && <span className={styles.yearActions}>
        {!year.is_active && !year.is_archived && <button className={styles.primary} type="button" disabled={busy} onClick={() => void change(year.value, 'activate')}>Make active</button>}{' '}
        <button className={styles.primary} type="button" disabled={busy || year.is_active} title={year.is_active ? 'Choose another active year first' : undefined} onClick={() => void change(year.value, year.is_archived ? 'restore' : 'archive')}>{year.is_archived ? 'Restore school year' : 'Archive school year'}</button>
      </span>}
    </div>)}
    <form className={styles.yearForm} onSubmit={event => { event.preventDefault(); void change(name, 'activate') }}>
      <label>New school year <input className={styles.search} aria-label="New school year" value={name} onChange={event => setName(event.target.value)} placeholder="YYYY–YYYY" required pattern="[0-9]{4}[-–][0-9]{4}" /></label>{' '}
      <button className={styles.primary} type="submit" disabled={busy || !name}>Add and make active</button>
    </form>
  </section>
}
