import { MoveHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Task } from '../../../types'
import styles from './TaskInteraction.module.css'

export default function ToothBrushingTask({ task, onAnswered }: { task: Task; onAnswered?: (correct: boolean, response: string) => void }) {
  const [tool, setTool] = useState<string | null>(null)
  const [wrongTool, setWrongTool] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [brushing, setBrushing] = useState(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const ready = tool === 'toothbrush'
  const complete = progress >= 100

  function choose(id: string) {
    if (id === 'toothbrush') {
      setTool(id)
      setWrongTool(null)
    } else {
      setWrongTool(id)
      onAnswered?.(false, id)
    }
  }

  function addProgress(amount: number) {
    setProgress((current) => {
      const next = Math.min(100, current + amount)
      if (current < 100 && next === 100) onAnswered?.(true, 'toothbrush,brushed')
      return next
    })
  }

  const teethImage = complete ? task.cleanImageUrl : progress > 8 ? task.cleaningImageUrl : task.dirtyImageUrl
  return (
    <div className={styles.brushActivity}>
      {!ready && <div className={styles.toolChoices} aria-label="Choose a grooming tool">
        {(task.items ?? []).map((item) => <button type="button" key={item.id} className={`${styles.toolChoice} ${wrongTool === item.id ? styles.incorrect : ''}`} onClick={() => choose(item.id)}>
          {item.imageUrl && <img src={item.imageUrl} alt={item.altText ?? item.label} />}<strong>{item.label}</strong>
        </button>)}
      </div>}
      {wrongTool && <div className={`${styles.feedback} ${styles.incorrect}`} role="status">{task.retryFeedback}</div>}
      {ready && <>
        <div className={`${styles.brushBoard} ${complete ? styles.brushComplete : ''}`}
          onPointerDown={(event) => { if (complete) return; setBrushing(true); lastPoint.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={(event) => { if (!brushing || complete || !lastPoint.current) return; const distance = Math.hypot(event.clientX - lastPoint.current.x, event.clientY - lastPoint.current.y); if (distance > 8) { addProgress(Math.min(8, distance / 5)); lastPoint.current = { x: event.clientX, y: event.clientY } } }}
          onPointerUp={() => { setBrushing(false); lastPoint.current = null }}>
          <div className={styles.brushScene}>
            {teethImage && <img className={styles.teethImage} src={teethImage} alt={complete ? 'Clean white teeth' : progress ? 'Teeth being brushed with foam' : 'Yellow teeth ready to be cleaned'} />}
            {!complete && task.toolImageUrl && <img className={`${styles.movingBrush} ${brushing ? styles.movingBrushActive : ''}`} src={task.toolImageUrl} alt="" aria-hidden="true" />}
            {complete && <span className={styles.cleanSparkles} aria-hidden="true">✦ ✧ ✦</span>}
          </div>
        </div>
        <div className={styles.brushFooter}>
          <div className={styles.brushProgress} role="progressbar" aria-label="Brushing progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>
          {complete
            ? <div className={`${styles.feedback} ${styles.correct}`} role="status"><span aria-hidden="true" /> {task.correctFeedback}</div>
            : <button type="button" className={styles.brushButton} onClick={() => addProgress(20)}><MoveHorizontal size={17} /> Brush the teeth</button>}
        </div>
      </>}
    </div>
  )
}
