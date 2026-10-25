import { useMemo, useState } from 'react'
import { Eye, MapPin, RotateCcw } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Task } from '../../../types'
import styles from './CreativeTask.module.css'

interface CreativeTaskProps {
  task: Task
  onAnswered?: (correct: boolean, response: string) => void
}

export default function CreativeTask({ task, onAnswered }: CreativeTaskProps) {
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null)
  const [trace, setTrace] = useState<string[]>([])
  const [tracing, setTracing] = useState(false)
  const [openCards, setOpenCards] = useState<string[]>([])
  const [matchedPairs, setMatchedPairs] = useState<string[]>([])

  const memoryCards = useMemo(() => (task.pairs ?? []).flatMap((pair) => [
    { key: `${pair.id}-left`, pairId: pair.id, label: pair.left.label, imageUrl: pair.left.imageUrl, altText: pair.left.altText },
    { key: `${pair.id}-right`, pairId: pair.id, label: pair.right.label, imageUrl: pair.right.imageUrl, altText: pair.right.altText },
  ]).sort((a, b) => a.key.localeCompare(b.key)).reverse(), [task.pairs])

  if (task.taskTemplate === 'hotspot_hunt') {
    function placePin(event: ReactPointerEvent<HTMLButtonElement>) {
      const rect = event.currentTarget.getBoundingClientRect()
      const next = { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }
      setPin(next)
      const target = task.hotspot
      if (!target) return
      const distance = Math.hypot(next.x - target.x, next.y - target.y)
      onAnswered?.(distance <= target.radius, JSON.stringify(next))
    }
    return (
      <button type="button" className={styles.scene} onPointerDown={placePin} aria-label={`Place a marker: ${task.hotspot?.label ?? task.question}`}>
        {task.sceneImageUrl ? <img src={task.sceneImageUrl} alt="Activity scene" /> : <span className={styles.scenePlaceholder}><Eye size={38} /><strong>Explore the picture</strong><small>Tap or click where the answer belongs.</small></span>}
        {pin && <span className={styles.pin} style={{ left: `${pin.x}%`, top: `${pin.y}%` }}><MapPin size={30} fill="currentColor" /></span>}
      </button>
    )
  }

  if (task.taskTemplate === 'trace_route') {
    const checkpoints = task.items ?? []
    function visit(id: string) {
      const expected = checkpoints[trace.length]?.id
      if (id !== expected) {
        setTrace([])
        return
      }
      const next = [...trace, id]
      setTrace(next)
      if (next.length === checkpoints.length) onAnswered?.(true, next.join(','))
    }
    return (
      <div className={styles.traceWrap}>
        <p>Press and move through the path, or tap each stop in order.</p>
        <div className={styles.route} onPointerDown={() => setTracing(true)} onPointerUp={() => setTracing(false)} onPointerLeave={() => setTracing(false)}>
          {checkpoints.map((item, index) => <button type="button" key={item.id} className={`${styles.checkpoint} ${trace.includes(item.id) ? styles.visited : ''}`} onPointerEnter={() => tracing && visit(item.id)} onClick={() => visit(item.id)}><b>{index + 1}</b><span>{item.label}</span></button>)}
        </div>
        <button type="button" className={styles.reset} onClick={() => setTrace([])}><RotateCcw size={15} /> Trace again</button>
      </div>
    )
  }

  if (task.taskTemplate === 'memory_flip') {
    function flip(key: string, pairId: string) {
      if (openCards.includes(key) || matchedPairs.includes(pairId) || openCards.length === 2) return
      const next = [...openCards, key]
      setOpenCards(next)
      if (next.length === 2) {
        const first = memoryCards.find((card) => card.key === next[0])
        if (first?.pairId === pairId) {
          const matches = [...matchedPairs, pairId]
          setMatchedPairs(matches)
          setOpenCards([])
          if (matches.length === (task.pairs ?? []).length) onAnswered?.(true, matches.join(','))
        } else {
          setTimeout(() => setOpenCards([]), 650)
        }
      }
    }
    return <div className={styles.memoryGrid}>{memoryCards.map((card) => { const shown = openCards.includes(card.key) || matchedPairs.includes(card.pairId); return <button type="button" key={card.key} className={`${styles.memoryCard} ${shown ? styles.flipped : ''}`} onClick={() => flip(card.key, card.pairId)} aria-label={shown ? card.label : 'Hidden card'}>{shown ? (card.imageUrl ? <img src={card.imageUrl} alt={card.altText ?? card.label} /> : <span>{card.label}</span>) : <span className={styles.cardBack}>?</span>}</button> })}</div>
  }

  const options = task.items ?? []
  return (
    <div className={styles.patternWrap}>
      <div className={styles.pattern} aria-label="Pattern to complete">{(task.pattern ?? []).map((item, index) => <span key={`${item.id}-${index}`}>{item.imageUrl && <img src={item.imageUrl} alt={item.altText ?? item.label} />}<span>{item.label}</span></span>)}<span className={styles.missing}>?</span></div>
      <div className={styles.patternChoices}>{options.map((item) => <button type="button" draggable key={item.id} onDragStart={(event) => event.dataTransfer.setData('text/plain', item.id)} onClick={() => onAnswered?.(item.id === task.answer, item.id)}>{item.imageUrl && <img src={item.imageUrl} alt={item.altText ?? item.label} />}<span>{item.label}</span></button>)}</div>
      <div className={styles.patternTarget} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData('text/plain'); onAnswered?.(id === task.answer, id) }}>Drop the next piece here</div>
    </div>
  )
}
