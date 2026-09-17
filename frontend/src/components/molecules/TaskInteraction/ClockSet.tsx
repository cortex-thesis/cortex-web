import { useEffect, useRef, useState } from 'react'
import type { Task } from '../../../types'
import { clockAngles, clockLabel, clockPoint } from '../../../lib/clockLogic'
import { loadGardenCheckpoint, saveGardenCheckpoint } from '../../../lib/gardenCheckpoint'
import styles from './ClockSet.module.css'

type ClockState = { index: number; hour: number; minute: number; period: 'am' | 'pm'; completed: string[] }
export default function ClockSet({ task, onAnswered, onChanged }: {
  task: Task; onAnswered?: (correct: boolean, response: string) => void; onChanged?: () => void
}) {
  const rounds = task.clockRounds ?? []
  const fresh: ClockState = { index: 0, hour: 12, minute: 0, period: 'am', completed: [] }
  const [state, setState] = useState<ClockState>(() => loadGardenCheckpoint(task, (v): v is ClockState => {
    if (!v || typeof v !== 'object') return false
    const s = v as ClockState
    return Number.isInteger(s.index) && s.index >= 0 && s.index < rounds.length &&
      Number.isInteger(s.hour) && s.hour >= 1 && s.hour <= 12 && Number.isInteger(s.minute) && s.minute >= 0 && s.minute <= 59 &&
      ['am','pm'].includes(s.period) && Array.isArray(s.completed) && s.completed.length <= rounds.length &&
      s.completed.every((id, i) => id === rounds[i].id) && (s.completed.length === s.index || s.completed.length === s.index + 1)
  }) ?? fresh)
  const [hand, setHand] = useState<'hour' | 'minute'>('hour')
  const [message, setMessage] = useState('')
  const current = useRef(state)
  const pointer = useRef<number | null>(null)
  const restored = useRef(state.completed.length === rounds.length && rounds.length > 0)
  const response = () => JSON.stringify({ digital_only: true, times: rounds.map(r => ({ id: r.id, hour: r.hour, minute: r.minute, period: r.period })) })
  useEffect(() => { if (restored.current) { restored.current = false; onAnswered?.(true, response()) } }, [onAnswered])
  const round = rounds[state.index]
  if (!round) return <p role="status">Clock practice needs its examples.</p>
  const checked = state.completed.includes(round.id)
  const done = state.completed.length === rounds.length
  const reading = task.clockMode === 'read'
  const angles = clockAngles(reading ? round.hour : state.hour, reading ? round.minute : state.minute)
  function update(patch: Partial<ClockState>) {
    current.current = { ...current.current, ...patch }; setState(current.current)
    saveGardenCheckpoint(task, current.current); setMessage('')
  }
  function point(event: React.PointerEvent<SVGSVGElement>) {
    if (reading || checked || pointer.current !== event.pointerId) return
    const box = event.currentTarget.getBoundingClientRect()
    const value = clockPoint((event.clientX - box.left) * 300 / box.width - 150, (event.clientY - box.top) * 300 / box.height - 150, hand)
    if (value !== null) update({ [hand]: value })
  }
  function check() {
    const s = current.current
    if (s.completed.includes(round.id)) return
    if (s.hour !== round.hour || s.minute !== round.minute || s.period !== round.period) {
      setMessage(s.hour !== round.hour ? 'Check the short hour hand.' : s.minute !== round.minute ? 'Check the long minute hand. Each number marks five minutes.' : 'Check the a.m. or p.m. label.'); return
    }
    update({ completed: [...s.completed, round.id] })
    setMessage(`You ${reading ? 'read' : 'set'} the clock: ${clockLabel(s.hour,s.minute,s.period)}.`)
    if (current.current.completed.length === rounds.length) onAnswered?.(true, response())
  }
  return <section className={styles.activity}>
    <div className={styles.header}><span>Example {state.index + 1} of {rounds.length}</span><button type="button" onClick={() => { update(fresh); pointer.current = null; onChanged?.() }}>Reset</button></div>
    <p className={styles.instruction}>{round.instruction}</p>
    <div className={styles.workspace}>
      <figure><svg viewBox="0 0 300 300" className={styles.clock} role="img" aria-label={reading ? 'Analog clock to read; use the answer controls' : `Analog clock: ${clockLabel(state.hour,state.minute,state.period)}`}
        onPointerDown={event => { if (!reading && !checked) { pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); point(event) } }}
        onPointerMove={point} onPointerUp={() => { pointer.current = null }} onPointerCancel={() => { pointer.current = null }}>
        <circle cx="150" cy="150" r="143" fill="#fffdf7" stroke="#a5b7aa" strokeWidth="5" />
        {Array.from({length:60},(_,i)=><line key={i} x1="150" y1={i%5===0?19:24} x2="150" y2="30" stroke="#758476" strokeWidth={i%5===0?3:1} transform={`rotate(${i*6} 150 150)`} />)}
        {Array.from({length:12},(_,i)=>{const a=(i+1)*Math.PI/6;return <text key={i} x={150+106*Math.sin(a)} y={157-106*Math.cos(a)} textAnchor="middle" fill="#243b35" fontSize="22">{i+1}</text>})}
        <line x1="150" y1="150" x2="150" y2="83" stroke="#6653ad" strokeWidth="10" strokeLinecap="round" transform={`rotate(${angles.hour} 150 150)`} />
        <line x1="150" y1="150" x2="150" y2="48" stroke="#257e78" strokeWidth="6" strokeLinecap="round" transform={`rotate(${angles.minute} 150 150)`} />
        <circle cx="150" cy="150" r="8" fill="#243b35" />
      </svg><figcaption>Short purple hand: hour · Long green hand: minutes</figcaption></figure>
      <div className={styles.controls}>
        {!reading && <div className={styles.handChoice}><button type="button" aria-pressed={hand==='hour'} onClick={()=>setHand('hour')}>Move hour hand</button><button type="button" aria-pressed={hand==='minute'} onClick={()=>setHand('minute')}>Move minute hand</button></div>}
        <p>{reading ? 'Read the clock, then enter your answer.' : 'Tap or drag on the clock, or use these controls.'}</p>
        <label>Hour <input type="range" min="1" max="12" step="1" value={state.hour} disabled={checked} onChange={e=>update({hour:Number(e.target.value)})} /><output>{state.hour}</output></label>
        <label>Minutes <input type="range" min="0" max="59" step="1" value={state.minute} disabled={checked} onChange={e=>update({minute:Number(e.target.value)})} /><output>{String(state.minute).padStart(2,'0')}</output></label>
        <div className={styles.handChoice}>{(['am','pm'] as const).map(period=><button type="button" key={period} aria-pressed={state.period===period} disabled={checked} onClick={()=>update({period})}>{period==='am'?'a.m.':'p.m.'}</button>)}</div>
        <output className={styles.digital} aria-label="Your digital answer">{clockLabel(state.hour,state.minute,state.period)}</output>
        <button type="button" className={styles.primary} disabled={checked} onClick={check}>Check clock</button>
      </div>
    </div>
    <div className={styles.footer}><p role="status">{message || (done ? 'Clock practice complete.' : '')}</p>{checked && !done && <button type="button" className={styles.primary} onClick={()=>update({index:state.index+1,hour:12,minute:0,period:'am'})}>Next example</button>}</div>
  </section>
}
