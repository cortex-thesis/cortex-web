import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/atoms'
import styles from './ModelAnalysis.module.css'

export default function ModelAnalysis() {
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const base = import.meta.env.VITE_API_URL ?? '/api'
    void fetch(`${base}/model-analysis/report/`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.detail ?? 'Unable to load the model report. Check that Django is running.')
        }
        return response.text()
      })
      .then((content) => { if (!controller.signal.aborted) { setHtml(content); setLoadedAt(new Date()) } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load report.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [revision])

  return <main className={styles.page}>
    <header className={styles.header}><Logo variant="horizontal" height={30} /><div><h1>Model analysis</h1><p>Mixed real / augmented EEG experiment · {loadedAt ? `loaded ${loadedAt.toLocaleString()}` : 'loading latest generated report'}</p></div><Link to="/admin/dashboard">Dashboard</Link><button disabled={loading} onClick={() => setRevision((value) => value + 1)}>Refresh report</button></header>
    {loading ? <div className={styles.skeleton} aria-label="Loading model analysis" role="status" /> : error ? <div className={styles.error} role="alert"><h2>Report unavailable</h2><p>{error}</p></div> : <iframe className={styles.report} title="Detailed mixed EEG exploratory analysis" srcDoc={html} sandbox="" />}
  </main>
}
