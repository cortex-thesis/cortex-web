import { useEffect, useState } from 'react'
import { clearApiCache } from '../lib/api'

type SyncState = {
  enabled: boolean
  status?: string
  last_success?: string | null
  message?: string
  pending?: number
}

const labels: Record<string, string> = {
  online: 'Up to date',
  syncing: 'Syncing…',
  offline: 'Offline mode — changes saved on this laptop',
  conflict: 'Sync needs review — conflicting edits',
  error: 'Sync paused — changes saved on this laptop',
  setup_required: 'Local database setup required',
  worker_stopped: 'Sync worker stopped — changes saved on this laptop',
  unreachable: 'Local server unavailable — new changes cannot be saved',
}

export default function SyncStatus() {
  const [state, setState] = useState<SyncState | null>(null)
  useEffect(() => {
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController | undefined
    let lastSuccess: string | null | undefined
    const poll = async () => {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 5000)
      try {
        // Probe Django, not navigator.onLine: LAN Wi-Fi can remain available
        // while Supabase is unreachable. Never cache this endpoint.
        const base = import.meta.env.VITE_API_URL ?? '/api'
        const response = await fetch(`${base}/sync/status/`, {
          cache: 'no-store', credentials: 'include', signal: controller.signal,
        })
        if (!response.ok) throw new Error('Status unavailable')
        const next = await response.json() as SyncState
        if (!disposed) {
          if (lastSuccess && next.last_success && lastSuccess !== next.last_success) clearApiCache()
          lastSuccess = next.last_success
          setState(next)
        }
      } catch {
        if (!disposed) setState({ enabled: true, status: 'unreachable' })
      } finally {
        clearTimeout(timeout)
        if (!disposed) timer = setTimeout(poll, 5000)
      }
    }
    void poll()
    return () => { disposed = true; clearTimeout(timer); controller?.abort() }
  }, [])

  if (!state?.enabled) return null
  const healthy = state.status === 'online'
  return <aside role="status" aria-live="polite" title={state.message || undefined} style={{
    position: 'fixed', bottom: 12, left: 12, zIndex: 10000,
    maxWidth: 'min(440px, calc(100vw - 24px))', padding: '8px 12px',
    borderRadius: 10, border: `1px solid ${healthy ? '#a3d5b5' : '#e4bd72'}`,
    background: healthy ? '#ecf8f0' : '#fff4dc', color: '#26332c',
    boxShadow: '0 2px 8px #0002', fontSize: 13,
  }}>
    <strong>{labels[state.status ?? ''] ?? 'Checking sync status…'}</strong>
    {!!state.pending && <span> · {state.pending} pending changes</span>}
    {state.last_success && !healthy && <div style={{ fontSize: 11, marginTop: 3 }}>
      Last synced: {new Date(state.last_success).toLocaleString()}
    </div>}
  </aside>
}
