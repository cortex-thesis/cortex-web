import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { AdminShell } from '../prototype'
import styles from '../prototype/Prototype.module.css'

interface Definition { key: string; name: string; metrics: string[] }
interface RecordItem { id: string; phase: 'phase_2' | 'phase_3'; analysis_key: string; analysis_name: string; scope_label: string; source_reference: string; values: Record<string, number>; result: string; notes: string; created_at: string }
interface Payload { catalog: Record<'phase_2' | 'phase_3', Definition[]>; records: RecordItem[] }
const emptyCatalog: Payload['catalog'] = { phase_2: [], phase_3: [] }
const label = (value: string) => value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')

export default function ResearchAnalysis() {
  const [data, setData] = useState<Payload>({ catalog: emptyCatalog, records: [] })
  const [phase, setPhase] = useState<'phase_2' | 'phase_3'>('phase_2')
  const [analysisKey, setAnalysisKey] = useState('')
  const [scope, setScope] = useState('')
  const [source, setSource] = useState('')
  const [result, setResult] = useState('pending')
  const [notes, setNotes] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const definitions = data.catalog[phase]
  const selected = useMemo(() => definitions.find((item) => item.key === analysisKey) ?? definitions[0], [analysisKey, definitions])

  function load() { return api<Payload>('/admin/research-analyses/').then((payload) => { setData(payload); if (!analysisKey && payload.catalog[phase][0]) setAnalysisKey(payload.catalog[phase][0].key) }) }
  // The initial request intentionally runs once; later mutations call load directly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected) return
    const numericValues = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)]))
    setSaving(true); setError('')
    try {
      await api('/admin/research-analyses/', { method: 'POST', body: JSON.stringify({ phase, analysis_key: selected.key, scope_label: scope, source_reference: source, result, notes, values: numericValues }) })
      setScope(''); setSource(''); setNotes(''); setValues({}); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save analysis.') } finally { setSaving(false) }
  }

  async function remove(id: string) { if (!window.confirm('Delete this analysis record?')) return; await api(`/admin/research-analyses/${id}/`, { method: 'DELETE' }); await load() }
  function exportData() { const blob = new Blob([JSON.stringify(data.records, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cortex-research-analysis-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url) }

  return <AdminShell active="analysis"><div className={styles.page}>
    <div className={styles.header}><div><span className={styles.eyebrow}>Methodology evidence repository</span><h1 className={styles.title}>Research analysis values</h1><p className={styles.subtitle}>Store Phase 2 EEG/modeling results and Phase 3 development/evaluation results for the research paper.</p></div><button className={styles.secondary} onClick={exportData} disabled={!data.records.length}><Download size={14} /> Export JSON</button></div>
    {error && <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">{error}</div>}
    <div className={styles.grid2}><form className={styles.card} onSubmit={(event) => void submit(event)}><h2 className={styles.cardTitle}>Add analysis result</h2><div className={styles.formGrid} style={{ marginTop: 16 }}>
      <label className={styles.field}><span className={styles.label}>Methodology phase</span><select className={styles.select} value={phase} onChange={(event) => { const next = event.target.value as typeof phase; setPhase(next); setAnalysisKey(data.catalog[next][0]?.key ?? ''); setValues({}) }}><option value="phase_2">Phase 2</option><option value="phase_3">Phase 3</option></select></label>
      <label className={styles.field}><span className={styles.label}>Analysis</span><select className={styles.select} value={selected?.key ?? ''} onChange={(event) => { setAnalysisKey(event.target.value); setValues({}) }}>{definitions.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></label>
      <label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Scope / dataset / session</span><input required className={styles.input} value={scope} onChange={(event) => setScope(event.target.value)} placeholder="e.g. Participant P01, Session 2" /></label>
      <label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Source reference</span><input className={styles.input} value={source} onChange={(event) => setSource(event.target.value)} placeholder="Recording ID, notebook, rubric, or test run" /></label>
      {selected?.metrics.map((metric) => <label className={styles.field} key={metric}><span className={styles.label}>{label(metric)}</span><input className={styles.input} type="number" step="any" value={values[metric] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [metric]: event.target.value }))} /></label>)}
      <label className={styles.field}><span className={styles.label}>Result</span><select className={styles.select} value={result} onChange={(event) => setResult(event.target.value)}><option value="pending">Pending review</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="informational">Informational</option></select></label>
      <label className={`${styles.field} ${styles.span2}`}><span className={styles.label}>Notes</span><textarea className={styles.textarea} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    </div><button className={styles.primary} disabled={saving} style={{ marginTop: 16 }}><Plus size={14} /> {saving ? 'Saving…' : 'Save analysis'}</button></form>
      <div className={styles.card}><h2 className={styles.cardTitle}>Included analyses</h2><div className={styles.list} style={{ marginTop: 12 }}>{definitions.map((item) => <div className={styles.listItem} key={item.key}><span><strong className={styles.listName}>{item.name}</strong><span className={styles.listMeta}>{item.metrics.length} structured values</span></span></div>)}</div></div>
    </div>
    <section className={styles.section}><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Saved results</h2><span className={styles.badgePurple}>{data.records.length} records</span></div><div className={styles.list}>{data.records.map((item) => <article className={styles.card} key={item.id}><div className={styles.sectionHead}><span><span className={styles.eyebrow}>{item.phase.replace('_', ' ')}</span><strong className={styles.listName}>{item.analysis_name} — {item.scope_label}</strong><span className={styles.listMeta}>{new Date(item.created_at).toLocaleString()} · {item.source_reference || 'No source reference'}</span></span><button className={styles.danger} onClick={() => void remove(item.id)}><Trash2 size={13} /> Delete</button></div><div className={styles.actions}>{Object.entries(item.values).map(([key, value]) => <span className={styles.badge} key={key}>{label(key)}: {value}</span>)}</div>{item.notes && <p className={styles.cardSub} style={{ marginTop: 10 }}>{item.notes}</p>}</article>)}</div></section>
  </div></AdminShell>
}
