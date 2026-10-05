import { useCallback, useEffect, useState } from 'react'
import SuperAdminShell from '../../components/templates/SuperAdminShell'
import { Activity, ArrowDownToLine, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, FlaskConical, Play, RefreshCw, Search, TriangleAlert } from 'lucide-react'

import { api } from '../../lib/api'
import admin from '../prototype/Prototype.module.css'
import styles from './Validation.module.css'

type Check = { id: string; name: string; category: string; status: string; expected: string; actual: string; duration_ms: number; retest?: string }
type ManualResult = { status: string; expected: string; actual: string; checked_at: string; retest?: string; history?: Omit<ManualResult, 'history'>[] }
type Run = { id: string; status: string; started_at: string; finished_at?: string; detail?: string; tests: Check[]; manual: Record<string, ManualResult> }
type Data = { categories: Record<string, string>; manual_checks: [string, string, string][]; runs: Run[] }

export default function Validation() {
  const [data, setData] = useState<Data | null>(null)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [onlyFailures, setOnlyFailures] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(0)


  const [manual, setManual] = useState({ check: 'headset', status: 'passed', expected: '', actual: '' })
  const refresh = useCallback(async () => {
    try {
      const next = await api<Data>('/admin/validation/', { cache: 'no-store' })
      setData(next)
      setSelected(current => current || next.runs[0]?.id || '')
      setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load results.') }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void api<Data>('/admin/validation/', { cache: 'no-store', signal: controller.signal }).then(next => {
      setData(next)
      setSelected(next.runs[0]?.id || '')
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Could not load results.') })
    return () => controller.abort()
  }, [])
  const running = data?.runs.some(run => run.status === 'running')
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => void refresh(), 2500)
    return () => window.clearInterval(timer)
  }, [running, refresh])
  const run = data?.runs.find(item => item.id === selected)
  const tests = run?.tests ?? []
  const passed = tests.filter(test => test.status === 'passed').length
  const failures = tests.filter(test => test.status === 'failed' || test.status === 'error')
  const skipped = tests.filter(test => test.status === 'skipped').length
  const percent = tests.length ? (passed / tests.length * 100).toFixed(1) : null
  const manualPassed = Object.values(run?.manual ?? {}).filter(check => check.status === 'passed').length
  const manualTotal = data?.manual_checks.length ?? 0
  const previous = data?.runs.find(item => item.status === 'complete' && run && item.started_at < run.started_at)
  const comparable = run?.status === 'complete' && previous && tests.length > 0 && tests.length === previous.tests.length && tests.every(test => previous.tests.some(prior => prior.id === test.id))
  const difference = comparable && previous ? passed / tests.length * 100 - previous.tests.filter(test => test.status === 'passed').length / previous.tests.length * 100 : null
  const corrected = tests.filter(test => test.retest === 'corrected').length
  const priority: Record<string, number> = { error: 0, failed: 1, skipped: 2, passed: 3 }
  const filtered = tests.filter(test => (!onlyFailures || test.status !== 'passed') && (category === 'all' || test.category === category) && `${test.name} ${test.id} ${test.actual}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => (priority[left.status] ?? 4) - (priority[right.status] ?? 4) || left.name.localeCompare(right.name))
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1))
  const visible = filtered.slice(currentPage * 20, currentPage * 20 + 20)
  const duration = run?.finished_at ? ((Date.parse(run.finished_at) - Date.parse(run.started_at)) / 1000).toFixed(1) : null
  const statusText = run?.status === 'running' ? 'Run in progress' : run?.status === 'error' ? 'Run incomplete' : failures.length ? 'Needs review' : skipped ? 'Review skipped checks' : tests.length ? 'Automated checks passed' : 'Awaiting results'
  async function start() {
    setBusy(true)
    try {
      const result = await api<Run>('/admin/validation/', { method: 'POST', body: JSON.stringify({}) })
      setSelected(result.id)
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not start tests.') }
    finally { setBusy(false) }
  }
  async function saveManual(event: React.FormEvent) {
    event.preventDefault()
    if (!run) return
    setBusy(true)
    try {
      await api(`/admin/validation/${run.id}/manual/`, { method: 'POST', body: JSON.stringify(manual) })
      await refresh()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save check.') }
    finally { setBusy(false) }
  }
  function download() {
    if (!run) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = `cortex-validation-${run.id}.json`; anchor.click()
    URL.revokeObjectURL(url)
  }
  return <SuperAdminShell active="validation"><main className={`${admin.page} ${styles.root} ${styles.shell}`}>
    <header className={admin.header}><div><span className={admin.eyebrow}>Quality assurance</span><h1 className={admin.title}>System validation</h1><p className={admin.subtitle}>Review system reliability, investigate unsuccessful checks, and track corrections over time.</p></div>
      <div className={admin.actions}><button className={admin.primary} disabled={busy || running} onClick={() => void start()}><Play size={14} aria-hidden="true" />{busy || running ? 'Tests running…' : 'Run all automated tests'}</button>{run && <button className={admin.secondary} onClick={download}><ArrowDownToLine size={14} aria-hidden="true" />Download results</button>}</div>
    </header>
    {error && <p role="alert" className={`${admin.alert} ${admin.alertDanger}`}>{error}</p>}
    <div className={styles.runBar}><label className={admin.field}><span className={admin.label}>Run history</span><select className={admin.select} value={selected} onChange={event => { setSelected(event.target.value); setPage(0) }}><option value="">Choose a run</option>{data?.runs.map((item, index) => <option key={item.id} value={item.id}>{index === 0 ? 'Latest · ' : ''}{new Date(item.started_at).toLocaleString()} — {item.status}</option>)}</select></label><button className={admin.secondary} onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true" />Refresh results</button><span className={styles.runMeta}>{duration ? `${duration}s total runtime` : run?.status === 'running' ? 'Results update automatically' : 'Isolated test environment'}</span></div>
    {!data && !error && <div className={styles.empty} role="status">Loading validation results…</div>}
    {data && !run && <div className={`${admin.card} ${styles.empty}`}><FlaskConical size={32} aria-hidden="true" /><h2>No validation runs yet</h2><p>Run the automated checks to create your first reliability report.</p></div>}
    {run && <>
      <div className={styles.verdict} role="status" aria-live="polite"><span className={`${styles.badge} ${run.status === 'running' ? styles.purple : failures.length || run.status === 'error' ? styles.red : skipped ? styles.gold : tests.length ? styles.green : ''}`}><Activity size={13} aria-hidden="true" />{statusText}</span><span>{run.status === 'running' ? 'Counts are provisional until this run completes.' : corrected ? `${corrected} previously unsuccessful checks corrected in this run.` : 'Results reflect the selected run.'}</span></div>
      <div className={styles.metrics}>
        <article className={`${admin.card} ${styles.metric}`}><div className={styles.metricLabel}><CheckCircle2 size={16} aria-hidden="true" />Automated pass rate</div><strong className={styles.metricValue} data-testid="pass-rate">{percent === null ? 'No results yet' : `${percent}%`}</strong><p>{passed} of {tests.length} recorded checks passed</p><span className={styles.metricNote}>{run.status !== 'complete' ? 'Provisional · run not complete' : !tests.length ? 'No recorded checks' : difference !== null ? `${difference > 0 ? '+' : ''}${difference.toFixed(1)} percentage points vs. previous run` : previous ? 'Test coverage changed · comparison unavailable' : 'First completed baseline'}</span></article>
        <article className={`${admin.card} ${styles.metric}`}><div className={styles.metricLabel}><TriangleAlert size={16} aria-hidden="true" />Failed checks & errors</div><strong className={`${styles.metricValue} ${failures.length ? styles.error : ''}`}>{failures.length}</strong><p>{tests.filter(test => test.status === 'failed').length} failed · {tests.filter(test => test.status === 'error').length} errors</p><button className={styles.textButton} onClick={() => { setOnlyFailures(true); setCategory('all'); setQuery(''); setPage(0); document.getElementById('test-results')?.scrollIntoView({ behavior: 'instant', block: 'start' }) }}>Review unsuccessful checks <ChevronRight size={13} aria-hidden="true" /></button></article>
        <article className={`${admin.card} ${styles.metric}`}><div className={styles.metricLabel}><FlaskConical size={16} aria-hidden="true" />Skipped checks</div><strong className={styles.metricValue}>{skipped}</strong><p>{tests.length} automated checks recorded</p><span className={styles.metricNote}>Skipped checks never count as passes</span></article>
        <article className={`${admin.card} ${styles.metric}`}><div className={styles.metricLabel}><ClipboardCheck size={16} aria-hidden="true" />Manual verification</div><strong className={styles.metricValue}>{manualPassed}<span> / {manualTotal}</span></strong><p>{manualTotal - manualPassed} pending or unsuccessful</p><span className={styles.metricNote}>Headset & device evidence tracked separately</span></article>
      </div>
      {run.detail && <p className={`${admin.alert} ${admin.alertDanger}`}>{run.detail}</p>}
      <p className={styles.methodNote}>Pass rate = passed Ã· all recorded automated checks. Failures, errors and skips stay in the denominator. Synthetic tests do not verify physical headset pairing.</p>
      <section aria-labelledby="category-heading" className={`${admin.card} ${styles.section}`}><div className={styles.sectionHeading}><div><h2 id="category-heading" className={admin.sectionTitle}>Checklist coverage</h2><p className={admin.cardSub}>Compare proportions with the check counts that support them.</p></div><span className={styles.legend}><i className={styles.passSwatch} />Passed<i className={styles.failSwatch} />Failed / error<i className={styles.skipSwatch} />Skipped</span></div><div className={styles.categories}>{Object.entries(data?.categories ?? {}).map(([key, title]) => {
        const checks = tests.filter(test => test.category === key)
        const successes = checks.filter(test => test.status === 'passed').length
        const pendingManual = data?.manual_checks.filter(([, category]) => category === key).filter(([id]) => run.manual[id]?.status !== 'passed').length ?? 0
        const unsuccessful = checks.filter(test => test.status === 'failed' || test.status === 'error').length
        const omitted = checks.filter(test => test.status === 'skipped').length
        return <div className={styles.categoryRow} key={key}><div><button className={styles.categoryButton} onClick={() => { setCategory(key); setOnlyFailures(false); setQuery(''); setPage(0); document.getElementById('test-results')?.scrollIntoView({ behavior: 'instant', block: 'start' }) }}>{title}<ChevronRight size={13} aria-hidden="true" /></button>{pendingManual > 0 && <span className={styles.categoryNote}>{pendingManual} manual checks pending or unsuccessful</span>}</div><div className={styles.bar} role="img" aria-label={`${title}: ${successes} passed, ${unsuccessful} unsuccessful, ${omitted} skipped, ${checks.length} total`}><span className={styles.passSwatch} style={{ width: `${checks.length ? successes / checks.length * 100 : 0}%` }} /><span className={styles.failSwatch} style={{ width: `${checks.length ? unsuccessful / checks.length * 100 : 0}%` }} /><span className={styles.skipSwatch} style={{ width: `${checks.length ? omitted / checks.length * 100 : 0}%` }} /></div><span className={styles.categoryCount}>{successes}<span> / {checks.length}</span></span><strong className={styles.categoryPercent}>{checks.length ? `${(successes / checks.length * 100).toFixed(1)}%` : '—'}</strong></div>
      })}</div></section>
      <section id="test-results" className={`${admin.card} ${styles.section}`}><div className={styles.sectionHeading}><div><h2 className={admin.sectionTitle}>Individual tests and defects</h2><p className={admin.cardSub}>Unsuccessful checks appear first. Expand a check to inspect its evidence.</p></div><span className={styles.badge}>{filtered.length} checks</span></div>
        <div className={styles.filters}><label className={admin.field}><span className={admin.label}>Search tests</span><div className={styles.search}><Search size={15} aria-hidden="true" /><input className={admin.input} value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="Test name, identifier or result" /></div></label><label className={admin.field}><span className={admin.label}>Category</span><select className={admin.select} value={category} onChange={event => { setCategory(event.target.value); setPage(0) }}><option value="all">All categories</option>{Object.entries(data?.categories ?? {}).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label className={styles.checkLabel}><input type="checkbox" checked={onlyFailures} onChange={event => { setOnlyFailures(event.target.checked); setPage(0) }} /> Show unsuccessful checks only</label></div>
        {!filtered.length && <div className={styles.empty}><CheckCircle2 size={25} aria-hidden="true" /><p>{onlyFailures && !query && category === 'all' ? 'No unsuccessful automated checks recorded.' : 'No checks match these filters.'}</p><button className={styles.textButton} onClick={() => { setOnlyFailures(false); setQuery(''); setCategory('all'); setPage(0) }}>Clear filters</button></div>}
        <div className={styles.tests}>{visible.map(test => <details key={test.id}><summary><span className={`${styles.badge} ${test.status === 'passed' ? styles.green : test.status === 'skipped' ? styles.gold : styles.red}`}>{test.status.toUpperCase()}</span><span className={styles.testName}>{test.name}<span>{data?.categories[test.category]}{test.retest ? ` · Retest: ${test.retest}` : ''}</span></span><span className={styles.testDuration}>{test.duration_ms.toFixed(1)} ms</span></summary><div className={styles.evidence}><dl><dt>Expected</dt><dd>{test.expected}</dd><dt>Actual</dt><dd><pre>{test.actual}</pre></dd><dt>Test identifier</dt><dd className={styles.identifier}>{test.id}</dd></dl></div></details>)}</div>
        <div className={styles.pagination}><span>{filtered.length ? `${currentPage * 20 + 1}–${Math.min((currentPage + 1) * 20, filtered.length)} of ${filtered.length} checks` : '0 checks'} · Failure priority</span><div><button className={admin.secondary} aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={14} aria-hidden="true" /></button><button className={admin.secondary} aria-label="Next page" disabled={(currentPage + 1) * 20 >= filtered.length} onClick={() => setPage(currentPage + 1)}><ChevronRight size={14} aria-hidden="true" /></button></div></div>
        <p className={styles.methodNote}>Later runs mark previously unsuccessful checks as corrected or still failing. Earlier expected and actual results remain in run history.</p>
      </section>
      <details className={`${admin.card} ${styles.manualSection}`}><summary><span><h2 className={admin.sectionTitle}>Headset, device and accessibility evidence</h2><span className={admin.cardSub}>Review observations and record manual checks</span></span><span className={`${styles.badge} ${manualPassed === manualTotal ? styles.green : styles.gold}`}>{manualPassed} / {manualTotal} verified</span></summary><p className={styles.methodNote}>Record measured observations without student names, credentials or raw EEG data. Manual checks are not included in the automated pass percentage.</p>
        {data?.manual_checks.map(([id, , instruction]) => <article key={id} className={styles.manual}><h3>{id}</h3><p>{instruction}</p><strong>{run.manual[id]?.status ?? 'Pending'}</strong>{run.manual[id] && <><p>Expected: {run.manual[id].expected}</p><p>Actual: {run.manual[id].actual}</p><small>{new Date(run.manual[id].checked_at).toLocaleString()}{run.manual[id].retest ? ` · Retest: ${run.manual[id].retest}` : ''}</small>{Boolean(run.manual[id].history?.length) && <details><summary>Previous observations</summary>{run.manual[id].history?.map((entry, index) => <p key={index}>{entry.checked_at} · {entry.status} · Expected: {entry.expected} · Actual: {entry.actual}</p>)}</details>}</>}</article>)}
        <form className={styles.manualForm} onSubmit={event => void saveManual(event)}><label className={admin.field}><span className={admin.label}>Check</span><select className={admin.select} value={manual.check} onChange={event => setManual({ ...manual, check: event.target.value })}>{data?.manual_checks.map(([id]) => <option key={id}>{id}</option>)}</select></label><label className={admin.field}><span className={admin.label}>Result</span><select className={admin.select} value={manual.status} onChange={event => setManual({ ...manual, status: event.target.value })}><option value="passed">Passed</option><option value="failed">Failed</option><option value="blocked">Blocked</option></select></label><label className={admin.field}><span className={admin.label}>Expected result</span><textarea className={admin.textarea} required maxLength={2000} value={manual.expected} onChange={event => setManual({ ...manual, expected: event.target.value })} /></label><label className={admin.field}><span className={admin.label}>Actual result and measurements</span><textarea className={admin.textarea} required maxLength={2000} value={manual.actual} onChange={event => setManual({ ...manual, actual: event.target.value })} /></label><div><button className={admin.primary} disabled={busy || run.status === 'running'} type="submit">Save manual check</button></div></form>
      </details>
    </>}
  </main></SuperAdminShell>
}

