import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../../types'
import styles from './GardenMission.module.css'
import { loadGardenCheckpoint, saveGardenCheckpoint } from '../../../lib/gardenCheckpoint'

export default function GardenKit({ task, onAnswered, onChanged }: {
  task: Task; onAnswered?: (correct: boolean, response: string) => void; onChanged?: () => void
}) {
  const items = task.items ?? []
  const expected = task.correctItemIds ?? []
  const [packed, setPacked] = useState<string[]>(() => loadGardenCheckpoint(task, (value): value is string[] => Array.isArray(value) && new Set(value).size === value.length && value.every(id => typeof id === 'string' && expected.includes(id))) ?? [])
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('Choose a tool, then tap the toolbox—or drag it there.')
  const packedRef = useRef<string[]>(packed)
  const drag = useRef<string | null>(null)
  const complete = expected.length > 0 && expected.every(id => packed.includes(id))
  const restore = useRef(complete)
  useEffect(() => { if (restore.current) { restore.current = false; setMessage('Your toolbox is ready.'); onAnswered?.(true, JSON.stringify({ picked: packed, digital_only: true })) } }, [onAnswered, packed])
  function pack(id: string | null) {
    if (!id || !items.some(item => item.id === id) || packedRef.current.includes(id)) return
    if (!expected.includes(id)) { setMessage(task.retryFeedback ?? 'We do not need this for today’s task. Try another tool.'); return }
    const next = [...packedRef.current, id]
    packedRef.current = next; setPacked(next); setSelected(null)
    saveGardenCheckpoint(task, next)
    const done = expected.every(key => next.includes(key))
    setMessage(done ? task.correctFeedback ?? 'Your toolbox is ready.' : 'Tool packed. Find the next tool.')
    if (done) onAnswered?.(true, JSON.stringify({ picked: next, digital_only: true }))
  }
  return <div className={styles.mission}>
    <div className={styles.header}><strong>{packed.length} / {expected.length} tools packed</strong><button type="button" onClick={() => {
      packedRef.current = []; drag.current = null; setPacked([]); setSelected(null); setMessage('Choose a tool, then tap the toolbox—or drag it there.'); onChanged?.()
      saveGardenCheckpoint(task, [])
    }}>Reset</button></div>
    <div className={styles.workspace}>
      <div className={`${styles.tools} ${styles.kitTools}`} aria-label="Available objects"><small>Choose or drag a tool</small>{items.filter(item => !packed.includes(item.id)).map(item =>
        <button type="button" key={item.id} draggable={!complete} disabled={complete} aria-pressed={selected === item.id}
          className={selected === item.id ? styles.selected : ''} onClick={() => setSelected(item.id)}
          onDragStart={event => { drag.current = item.id; event.dataTransfer.setData('text/plain', item.id); setSelected(item.id) }}
          onDragEnd={() => { drag.current = null }}>
          {item.imageUrl && <img src={item.imageUrl} alt="" />}<span>{item.label}</span>
        </button>)}</div>
      <div className={styles.targetArea}><small>Put tools in the toolbox</small>
        <button type="button" className={`${styles.target} ${complete ? styles.complete : ''}`} aria-label="Pack selected tool into toolbox" disabled={complete}
          onClick={() => { if (!selected) setMessage('Choose a tool first.'); else pack(selected) }}
          onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); pack(event.dataTransfer.getData('text/plain') || drag.current); drag.current = null }}>
          <svg viewBox="0 0 260 140" className={styles.toolbox} role="img" aria-label="Gardening toolbox">
            <path d="M95 40V20H165V40" fill="none" stroke="#795c42" strokeWidth="12" strokeLinejoin="round" />
            <rect x="25" y="40" width="210" height="85" rx="10" fill="#bc8a60" />
            <path d="M25 65H235" stroke="#8b6547" strokeWidth="5" /><rect x="117" y="59" width="26" height="26" rx="4" fill="#f7d585" />
          </svg>
          <span className={styles.packedTools}>{items.filter(item => packed.includes(item.id)).map(item =>
            <span key={item.id}>{item.imageUrl && <img src={item.imageUrl} alt="" />}<span>{item.label}</span></span>)}</span>
          <strong>{complete ? 'Toolbox ready' : 'Tap here to pack'}</strong>
        </button></div>
    </div><p className={styles.instruction} role="status">{message}</p>
  </div>
}
