import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
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
  return <main className={styles.root}>
    <nav aria-label="Administration"><Link to="/admin/dashboard">← System overview</Link></nav>
    <header><h1>System validation</h1><p>Recheck authentication, EEG processing, adaptive lessons, teacher controls and reports using isolated synthetic data.</p></header>
    <div className={styles.toolbar}><button disabled={busy || running} onClick={() => void start()}>{busy || running ? 'Tests running…' : 'Run all automated tests'}</button><button onClick={() => void refresh()}>Refresh results</button>{run && <button onClick={download}>Download results</button>}</div>
    <p>These checks use a temporary database and EEG directory. Physical headset and device checks are recorded separately below. Automated percentages include failures, errors and skipped tests in the denominator.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <label>Run history <select value={selected} onChange={event => setSelected(event.target.value)}><option value="">Choose a run</option>{data?.runs.map(item => <option key={item.id} value={item.id}>{new Date(item.started_at).toLocaleString()} — {item.status}</option>)}</select></label>
    {!run && <p>No recorded run yet. Run the tests to create your first validation report.</p>}
    {run && <>
      <div role="status" aria-live="polite" className={styles.summary}>
        <strong>{percent === null ? 'No results yet' : `${percent}% automated checks passed`}{run.status === 'running' ? ' (in progress)' : run.status === 'error' ? ' (run incomplete)' : ''}</strong>
        <span>{passed} passed · {failures.length} failed/errors · {skipped} skipped · {tests.length} total</span>
        <span>{manualPassed}/{data?.manual_checks.length ?? 0} manual checks passed · Run {run.status}</span>
        {run.finished_at && <span>Completed in {((Date.parse(run.finished_at) - Date.parse(run.started_at)) / 1000).toFixed(1)} seconds</span>}
        {run.detail && <span className={styles.error}>{run.detail}</span>}
      </div>
      <section aria-labelledby="category-heading"><h2 id="category-heading">Checklist coverage</h2><div className={styles.categories}>{Object.entries(data?.categories ?? {}).map(([key, title]) => {
        const checks = tests.filter(test => test.category === key)
        const successes = checks.filter(test => test.status === 'passed').length
        const pendingManual = data?.manual_checks.filter(([, category]) => category === key).filter(([id]) => run.manual[id]?.status !== 'passed').length ?? 0
        return <article key={key}><h3>{title}</h3><p>{checks.length ? `${successes}/${checks.length} passed (${(successes / checks.length * 100).toFixed(1)}%)` : 'No automated results yet'}</p>{pendingManual > 0 && <p>{pendingManual} manual checks pending or unsuccessful</p>}</article>
      })}</div></section>
      <section><h2>Individual tests and defects</h2><label><input type="checkbox" checked={onlyFailures} onChange={event => setOnlyFailures(event.target.checked)} /> Show unsuccessful checks only</label>
        {onlyFailures && !tests.some(test => test.status !== 'passed') && <p>No unsuccessful automated checks recorded.</p>}
        <div className={styles.tests}>{tests.filter(test => !onlyFailures || test.status !== 'passed').map(test => <details key={test.id} className={test.status === 'passed' ? styles.passed : styles.failed}><summary><strong>{test.status.toUpperCase()}</strong> — {test.name} <span>({test.duration_ms.toFixed(1)} ms){test.retest ? ` · Retest: ${test.retest}` : ''}</span></summary><dl><dt>Expected</dt><dd>{test.expected}</dd><dt>Actual</dt><dd><pre>{test.actual}</pre></dd><dt>Test identifier</dt><dd>{test.id}</dd></dl></details>)}</div>
        <p>Failed checks form the defect record. A later run marks the same check “corrected” when it passes, or “still failing” when it fails again. Run history retains expected and actual results.</p>
      </section>
      <section><h2>Headset, device and accessibility evidence</h2><p>Record measured observations without student names, credentials or raw EEG data. Manual checks are not included in the automated pass percentage.</p>
        {data?.manual_checks.map(([id, , instruction]) => <article key={id} className={styles.manual}><h3>{id}</h3><p>{instruction}</p><strong>{run.manual[id]?.status ?? 'Pending'}</strong>{run.manual[id] && <><p>Expected: {run.manual[id].expected}</p><p>Actual: {run.manual[id].actual}</p><small>{new Date(run.manual[id].checked_at).toLocaleString()}{run.manual[id].retest ? ` · Retest: ${run.manual[id].retest}` : ''}</small>{Boolean(run.manual[id].history?.length) && <details><summary>Previous observations</summary>{run.manual[id].history?.map((entry, index) => <p key={index}>{entry.checked_at} · {entry.status} · Expected: {entry.expected} · Actual: {entry.actual}</p>)}</details>}</>}</article>)}
        <form onSubmit={event => void saveManual(event)}><label>Check<select value={manual.check} onChange={event => setManual({ ...manual, check: event.target.value })}>{data?.manual_checks.map(([id]) => <option key={id}>{id}</option>)}</select></label><label>Result<select value={manual.status} onChange={event => setManual({ ...manual, status: event.target.value })}><option value="passed">Passed</option><option value="failed">Failed</option><option value="blocked">Blocked</option></select></label><label>Expected result<textarea required maxLength={2000} value={manual.expected} onChange={event => setManual({ ...manual, expected: event.target.value })} /></label><label>Actual result and measurements<textarea required maxLength={2000} value={manual.actual} onChange={event => setManual({ ...manual, actual: event.target.value })} /></label><button disabled={busy || run.status === 'running'} type="submit">Save manual check</button></form>
      </section>
    </>}
  </main>
}
