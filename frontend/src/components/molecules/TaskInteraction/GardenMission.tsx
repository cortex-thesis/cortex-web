import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../../types'
import { playLessonSound } from '../../../lib/lessonSounds'
import styles from './GardenMission.module.css'
import GardenScene from './GardenScene'
import { loadGardenCheckpoint, saveGardenCheckpoint } from '../../../lib/gardenCheckpoint'

export default function GardenMission({ task, onAnswered, onChanged, quiet }: {
  task: Task; onAnswered?: (correct: boolean, response: string) => void; onChanged?: () => void; quiet?: boolean
}) {
  const missions = task.missions ?? []
  type Evidence = { id: string; tool: string; target_applied: boolean }
  const [saved] = useState(() => loadGardenCheckpoint(task, (value): value is Evidence[] => Array.isArray(value) && value.length <= missions.length && value.every((row, i) => row?.id === missions[i].id && row?.tool === missions[i].answer && row?.target_applied === true)) ?? [])
  const [index, setIndex] = useState(Math.min(saved.length, Math.max(0, missions.length - 1)))
  const [tool, setTool] = useState<string | null>(null)
  const [applied, setApplied] = useState(saved.length > 0 && saved.length === missions.length)
  const [message, setMessage] = useState('')
  const dragTool = useRef<string | null>(null)
  const completed = useRef(saved.length > 0 && saved.length === missions.length)
  const restore = useRef(completed.current)
  const appliedMission = useRef<string | null>(null)
  const evidence = useRef<Evidence[]>(saved)
  useEffect(() => { if (restore.current) { restore.current = false; onAnswered?.(true, JSON.stringify({ missions: evidence.current, digital_only: true })) } }, [onAnswered])
  const mission = missions[index]
  if (!mission) return <p role="status">This mission needs its activity steps.</p>
  const done = applied && index === missions.length - 1

  function useTool(id: string | null) {
    if (applied || appliedMission.current === mission.id || !id) return
    if (id !== mission.answer) {
      setMessage(mission.hint)
      // A retry is instructional, not a penalty or negative sound.
      return
    }
    appliedMission.current = mission.id
    setTool(id)
    setApplied(true)
    setMessage(mission.feedback)
    evidence.current.push({ id: mission.id, tool: id, target_applied: true })
    saveGardenCheckpoint(task, evidence.current)
    if (!quiet && index < missions.length - 1) playLessonSound('correct')
    if (index === missions.length - 1 && !completed.current) {
      completed.current = true
      onAnswered?.(true, JSON.stringify({ missions: evidence.current, digital_only: true }))
    }
  }

  function reset() {
    setIndex(0); setTool(null); setApplied(false); setMessage('')
    dragTool.current = null; completed.current = false; appliedMission.current = null; evidence.current = []; onChanged?.()
    saveGardenCheckpoint(task, [])
  }

  function selectMission(position: number) {
    if (position > evidence.current.length) return
    const completedMission = evidence.current[position]
    setIndex(position)
    setTool(completedMission?.tool ?? null)
    setApplied(Boolean(completedMission))
    appliedMission.current = completedMission?.id ?? null
    setMessage(completedMission ? missions[position].feedback : '')
  }

  return <div className={`${styles.mission} ${quiet ? styles.quiet : ''}`}>
    <div className={styles.header}><strong>Mission {index + 1} of {missions.length}</strong>
      <button type="button" onClick={reset}>Reset</button></div>
    <ol className={styles.steps} aria-label="Mission steps">{missions.map((item, position) => {
      const isComplete = position < evidence.current.length
      return <li key={item.id}>
        <button type="button" aria-current={position === index ? 'step' : undefined} aria-pressed={position === index} disabled={position > evidence.current.length} className={isComplete ? styles.complete : ''} onClick={() => selectMission(position)}>
          <span>{isComplete ? '✓' : position + 1}</span>{item.label}
        </button>
      </li>
    })}</ol>
    <p className={styles.instruction}>{mission.instruction}</p>
    <div className={styles.workspace}>
      <div className={styles.tools} aria-label="Choose a tool or action">
        <small>1. Choose or drag</small>
        {(task.items ?? []).filter(item => !mission.availableItemIds || mission.availableItemIds.includes(item.id)).map(item => <button type="button" key={item.id} disabled={applied}
          draggable={!applied} aria-pressed={tool === item.id} className={tool === item.id ? styles.selected : ''}
          onClick={() => { setTool(item.id); setMessage('') }}
          onDragStart={event => { dragTool.current = item.id; setTool(item.id); event.dataTransfer.setData('text/plain', item.id) }}
          onDragEnd={() => { dragTool.current = null }}>
          {item.imageUrl && <img src={item.imageUrl} alt="" />}<span>{item.label}</span>
        </button>)}
      </div>
      <div className={styles.targetArea}>
        <small>2. Tap the target or drop here</small>
        <button type="button" className={`${styles.target} ${applied ? styles.complete : ''}`} disabled={applied}
          aria-label={mission.actionLabel} onClick={() => { if (!tool) setMessage('Choose a tool or action first.'); else useTool(tool) }}
          onDragOver={event => event.preventDefault()} onDrop={event => {
            event.preventDefault()
            const id = event.dataTransfer.getData('text/plain') || dragTool.current
            if (task.items?.some(item => item.id === id)) useTool(id)
            dragTool.current = null
          }}>
          {mission.scene ? <GardenScene scene={mission.scene} applied={applied} /> : mission.imageUrl && <img key={mission.id} src={mission.imageUrl} alt={mission.altText ?? mission.label} />}
          {!applied && <strong>{mission.actionLabel}</strong>}
          {applied && <span className={styles.check} aria-hidden="true">✓</span>}
        </button>
      </div>
    </div>
    <div className={styles.footer}>
      <p role="status">{done ? task.correctFeedback : message || 'Try it on screen. Practice real tasks with appropriate support.'}</p>
      {applied && !done && <button type="button" onClick={() => { setIndex(index + 1); setTool(null); setApplied(false); setMessage('') }}>Next mission →</button>}
    </div>
  </div>
}
