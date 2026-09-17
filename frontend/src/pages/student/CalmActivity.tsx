import { useEffect, useState } from 'react'
import styles from './CalmActivity.module.css'

const titles = ['Notice your surroundings', 'Follow the gentle circle', 'Match the shape', 'Find the blue flower', 'Count with me', 'A gentle stretch']
const grounding = ['Find 3 things you can see.', 'Find 2 things you can hear.', 'Find 1 thing you can feel.']
const stretches = ['Gently stretch your arms up, if comfortable.', 'Let your arms relax.', 'Slowly roll your shoulders, if comfortable.']

export default function CalmActivity({ paused, nextActivity }: { paused: boolean; nextActivity: () => number }) {
  const [kind, setKind] = useState(nextActivity)
  const [step, setStep] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [done, setDone] = useState(false)
  const [hint, setHint] = useState('')
  const [observation, setObservation] = useState('')
  useEffect(() => {
    if (paused || done) return
    const timer = window.setTimeout(() => setSeconds(value => value + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [paused, done, seconds])
  useEffect(() => { if (kind === 1 && seconds >= 15) setDone(true) }, [kind, seconds])
  function progress(limit: number) {
    if (paused) return
    setHint('')
    setObservation('')
    if (step + 1 >= limit) setDone(true)
    else setStep(value => value + 1)
  }
  return <div className={styles.activity}>
    <h1>{titles[kind]}</h1>
    <div className={styles.workspace} style={{ animationPlayState: paused ? 'paused' : 'running' }}>
      {done ? <p role="status">A small calm moment. Well done.</p>
        : kind === 0 ? <form className={styles.groundingForm} onSubmit={event => { event.preventDefault(); if (observation.trim()) progress(3) }}><label htmlFor="grounding-observation" aria-live="polite">{grounding[step]}</label><textarea id="grounding-observation" aria-describedby="grounding-help" value={observation} onChange={event => setObservation(event.target.value)} disabled={paused} rows={2} maxLength={240} placeholder={['For example: a chair, a book, a window', 'For example: a fan or birds', 'For example: my feet on the floor'][step]} /><small id="grounding-help">Type a few words about what you notice. There are no wrong answers.</small><div className={styles.choices}><button type="submit" disabled={paused || !observation.trim()}>Next prompt</button><button type="button" disabled={paused} onClick={() => progress(3)}>Skip this prompt</button></div></form>
        : kind === 1 ? <><p>Let your eyes follow the circle. There is nothing to solve.</p><div className={styles.track}><span className={styles.circle} /></div></>
        : kind === 2 ? <><p>Tap the same shape as this: <span aria-label="blue circle" role="img">🔵</span></p><div className={styles.choices}>{['🔵', '🔺', '🟨'].map((shape, index) => <button key={shape} disabled={paused} aria-label={['Blue circle', 'Red triangle', 'Yellow square'][index]} onClick={() => index === 0 ? setDone(true) : setHint('Take your time. Look for the blue circle.')}>{shape}</button>)}</div></>
        : kind === 3 ? <><p>Find the blue flower. Just one thing at a time.</p><svg className={styles.scene} viewBox="0 0 360 150" role="group" aria-label="A calm garden"><rect width="360" height="150" rx="16" fill="#e9f1df" /><path d="M0 110 Q90 75 180 110 T360 110 V150 H0Z" fill="#c7dcb9" />{['#dfadce', '#6b9bce', '#ebbe70'].map((color, index) => <g key={color} transform={`translate(${70 + index * 110},70)`}><path d="M0 0V60" stroke="#62865c" strokeWidth="4" /><circle r="24" fill={color} /><circle r="7" fill="#fff4ce" /></g>)}</svg><div className={styles.choices}>{['Pink', 'Blue', 'Yellow'].map(color => <button key={color} disabled={paused} onClick={() => color === 'Blue' ? setDone(true) : setHint('Look for the blue flower in the middle.')}>{color} flower</button>)}</div></>
        : kind === 4 ? <><p>Count slowly. Tap each circle as it appears.</p><div className={styles.choices}>{Array.from({ length: Math.min(3, Math.floor(seconds / 3) + 1) }, (_, index) => <button className={styles.count} key={index} disabled={paused || index !== step} aria-label={`Count ${index + 1}`} onClick={() => progress(3)}>{index + 1}</button>)}</div></>
        : <><p aria-live="polite">{stretches[step]}</p><p>You can stay seated or imagine the movement.</p><button disabled={paused || seconds < (step + 1) * 5} onClick={() => progress(3)}>Next gentle movement</button></>}
    </div>
    {hint && <p role="status">{hint}</p>}
    {done && <button disabled={paused} onClick={() => { setKind(nextActivity()); setStep(0); setSeconds(0); setDone(false); setHint(''); setObservation('') }}>Try another calm activity</button>}
  </div>
}
