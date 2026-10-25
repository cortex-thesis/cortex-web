import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

interface Intervention {
  id: string; actor_id: number | null; student_id: number; requested_at: string
  action: string; mode: string | null; duration_seconds: number | null; status: string
}
export default function InterventionHistory({ sessionId, student }: { sessionId: string; student: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Intervention[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!open) return
    let disposed = false
    queueMicrotask(() => { if (!disposed) { setItems(null); setError('') } })
    void api<{ interventions: Intervention[] }>(`/sessions/${sessionId}/interventions/`, { cache: 'no-store' })
      .then(data => { if (!disposed) setItems(data.interventions) })
      .catch((reason: Error) => { if (!disposed) setError(reason.message) })
    return () => { disposed = true }
  }, [sessionId, attempt, open])
  const content = error ? <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry history</button></p> : !items ? <p role="status">Loading interventions...</p> : <div aria-label={`Interventions for ${student}`}>{items.length ? items.map(item => <p key={item.id}>
    <strong>{student}</strong> / Teacher {item.actor_id ?? 'unavailable'} / <time dateTime={item.requested_at}>{new Date(item.requested_at).toLocaleString()}</time> / {item.action.replaceAll('_', ' ')} / {item.mode || 'Mode not recorded'} / {item.duration_seconds == null ? 'Duration not recorded' : `${item.duration_seconds} seconds`} / {item.status}
  </p>) : <p>No interventions recorded.</p>}</div>
  return <details onToggle={event => setOpen(event.currentTarget.open)}><summary>View history</summary>{content}</details>
}
