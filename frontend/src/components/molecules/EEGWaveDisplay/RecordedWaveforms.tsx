import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
interface Chunk { sequence_number: number; captured_at: string; start_offset_ms: number; end_offset_ms: number; samples: Record<string, number[]> }
interface Recording { recording: { ended_at: string | null; sampling_rate_hz: number; channel_names: string[] }; chunks: Chunk[]; next_after: number | null }
export default function RecordedWaveforms({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Recording | null>(null)
  const [after, setAfter] = useState(0)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let disposed = false
    queueMicrotask(() => { if (!disposed) { setData(null); setError('') } })
    void api<Recording>(`/sessions/${sessionId}/eeg/recording/?after=${after}&limit=1`, { cache: 'no-store' })
      .then(result => { if (!disposed) setData(result) })
      .catch((reason: Error) => { if (!disposed) setError(reason.message) })
    return () => { disposed = true }
  }, [sessionId, after, attempt])
  const chunk = data?.chunks[0]
  return <section aria-label="Recorded EEG replay"><h3>Recorded EEG replay</h3>
    <p>Recorded samples, not a live signal. Capture time uses the recording device clock.</p>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading recording...</p> : !chunk ? <p role="status">No further recorded samples available.</p> : <>
      <p><time dateTime={chunk.captured_at}>{new Date(chunk.captured_at).toLocaleString()}</time> / {data.recording.sampling_rate_hz} Hz / {chunk.start_offset_ms}-{chunk.end_offset_ms} ms from recording start</p>
      {data.recording.channel_names.map(channel => {
        const values = chunk.samples[channel] ?? []
        if (!values.length || !values.every(Number.isFinite)) return <p key={channel}>{channel}: samples unavailable</p>
        const low = Math.min(...values), high = Math.max(...values), span = high - low || 1
        const points = values.map((value, index) => `${index * 300 / Math.max(1, values.length - 1)},${45 - (value - low) * 40 / span}`).join(' ')
        return <div key={channel}><span>{channel} / {low.toFixed(1)} to {high.toFixed(1)} microvolts</span><svg viewBox="0 0 300 50" role="img" aria-label={`${channel} recorded samples, independently scaled`} style={{ width: '100%', height: 60 }}><polyline points={points} fill="none" stroke="currentColor" /></svg></div>
      })}
    </>}
    {data && <p>{data.recording.ended_at ? 'Recording complete' : 'Recording in progress; replay may be incomplete'}</p>}
    <button disabled={!chunk || !data?.next_after} onClick={() => setAfter(data!.next_after!)}>Next recorded chunk</button>
    <button onClick={() => { setAfter(0); setAttempt(value => value + 1) }}>Replay from start</button>
    <button onClick={() => setAttempt(value => value + 1)}>Retry / refresh</button>
  </section>
}
