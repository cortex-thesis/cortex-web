import { useEffect, useRef, useState } from 'react'
import { BookOpen, Pause, Volume2, RotateCcw } from 'lucide-react'
import type { Task, TaskItem } from '../../../types'
import { playLessonSound } from '../../../lib/lessonSounds'
import { AdaptiveLessonText } from '../TaskCard/FocusSupport'
import styles from './DiscoveryActivities.module.css'

interface Props {
  task: Task
  onAnswered?: (correct: boolean, response: string) => void
  onChanged?: () => void
  quiet?: boolean
  narrowed?: boolean
}

export function AudioNarration({ script }: { script: string }) {
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState('')
  const speech = useRef<SpeechSynthesisUtterance | null>(null)
  useEffect(() => {
    function stop() { if (speech.current) window.speechSynthesis?.cancel(); setPlaying(false); setPaused(false) }
    window.addEventListener('cortex-stop-narration', stop)
    return () => { window.removeEventListener('cortex-stop-narration', stop); if (speech.current) window.speechSynthesis?.cancel() }
  }, [])
  function toggle() {
    if (!('speechSynthesis' in window)) { setError('Narration is unavailable on this browser. You can read the cards or ask for support.'); return }
    if (playing) { window.speechSynthesis.pause(); setPlaying(false); setPaused(true); return }
    if (paused) { window.speechSynthesis.resume(); setPlaying(true); setPaused(false); return }
    start()
  }
  function start() {
    window.dispatchEvent(new Event('cortex-stop-narration'))
    window.speechSynthesis.cancel()
    const voice = new SpeechSynthesisUtterance(script)
    speech.current = voice; voice.lang = 'en-PH'; voice.rate = 0.9
    voice.onend = () => { setPlaying(false); setPaused(false) }
    voice.onerror = event => { if (event.error === 'interrupted' || event.error === 'canceled') return; setPlaying(false); setPaused(false); setError('Narration could not play. Try Listen again, or read the cards.') }
    setError(''); setPlaying(true); window.speechSynthesis.speak(voice)
  }
  return <div className={styles.narration}>
    <button type="button" className={styles.listen} onClick={toggle}>{playing ? <Pause size={16} /> : <Volume2 size={16} />}{playing ? 'Pause' : paused ? 'Resume' : 'Listen'}</button>
    {(playing || paused) && <button type="button" onClick={start}>Replay</button>}
    {error && <p role="status">{error}</p>}
  </div>
}

function Picture({ item }: { item: TaskItem }) {
  return item.imageUrl ? <img src={item.imageUrl} alt={item.altText ?? item.label} /> : <BookOpen className={styles.fallback} aria-hidden="true" />
}

export function DiscussionCards({ task, quiet, narrowed }: Props) {
  const [page, setPage] = useState(0)
  const steps = task.steps ?? []
  const limited = quiet || narrowed
  const visible = limited ? steps.slice(page, page + 1) : steps
  return <section className={styles.discussion} aria-label="Lesson discussion">
    <div className={styles.concepts}>{visible.map(step => <article key={step.id} className={styles.concept}>
      {step.imageUrl && <img src={step.imageUrl} alt={step.altText ?? step.title} />}
      {step.title !== task.title && <h3>{step.title}</h3>}
      <p><AdaptiveLessonText text={step.description} /></p>
    </article>)}</div>
    {limited && steps.length > 1 && <div className={styles.actions}><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous card</button><span>Card {page + 1} of {steps.length}</span><button type="button" disabled={page === steps.length - 1} onClick={() => setPage(value => value + 1)}>Next card</button></div>}
  </section>
}

export function DiscoveryBoard({ task, onAnswered, onChanged, quiet, narrowed }: Props) {
  const [active, setActive] = useState(task.categories?.[0]?.id ?? '')
  const [selections, setSelections] = useState<Record<string, string[]>>(() => {
    try { const saved = JSON.parse(task.initialResponse ?? '{}'); return saved.selections ?? {} } catch { return {} }
  })
  const [saved, setSaved] = useState(false)
  const [page, setPage] = useState(0)
  const [message, setMessage] = useState('')
  const categories = task.categories ?? []
  const items = task.items ?? []
  const pageSize = quiet ? 1 : narrowed ? 4 : 6
  const groups = Math.max(1, Math.ceil(items.length / Math.max(pageSize, 1)))
  function choose(id: string) {
    const current = selections[active] ?? []
    const next = current.includes(id) ? current.filter(value => value !== id) : id === 'unsure' ? ['unsure'] : [...current.filter(value => value !== 'unsure'), id]
    setSelections(value => ({ ...value, [active]: next })); setSaved(false); setMessage(''); onChanged?.()
  }
  function save() {
    if (categories.some(category => !(selections[category.id]?.length))) { setMessage('Choose an activity or Not sure yet in each area.'); return }
    const fields = Object.fromEntries(categories.map(category => [task.selfReportFields?.[category.id] ?? category.id, selections[category.id]]))
    setSaved(true); setMessage(task.correctFeedback ?? 'Your choices are saved as self-report.')
    onAnswered?.(true, JSON.stringify({ evidence_type: 'self_report', selections, fields }))
  }
  return <section className={styles.board}>
    <div className={styles.areas} aria-label="Discovery areas">{categories.map(category => <button type="button" key={category.id} aria-pressed={active === category.id} className={active === category.id ? styles.active : ''} onClick={() => { setActive(category.id); setPage(0) }}><strong>{category.label}</strong><span>{(selections[category.id] ?? []).map(id => items.find(item => item.id === id)?.label).join(', ') || 'No choices yet'}</span></button>)}</div>
    {groups > 1 && <div className={styles.actions}><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous choices</button><span>Group {page + 1} of {groups}</span><button type="button" disabled={page >= groups - 1} onClick={() => setPage(value => value + 1)}>More choices</button></div>}
    <div className={styles.actions}><p role="status">{message || 'The same activity can be selected in different areas.'}</p><button type="button" className={styles.listen} disabled={saved} onClick={save}>{saved ? 'Saved' : 'Save reflection'}</button></div>
    <div className={styles.cards} aria-label={categories.find(category => category.id === active)?.label}>{items.slice(page * pageSize, (page + 1) * pageSize).map(item => <button type="button" key={item.id} aria-pressed={selections[active]?.includes(item.id) ?? false} className={selections[active]?.includes(item.id) ? styles.active : ''} onClick={() => choose(item.id)}><Picture item={item} /><span>{item.label}</span>{selections[active]?.includes(item.id) && <small>Selected</small>}</button>)}</div>
  </section>
}

export function ScenarioClassifier({ task, onAnswered, onChanged, quiet }: Props) {
  const [index, setIndex] = useState(0)
  const [choice, setChoice] = useState<string | null>(null)
  const [answers, setAnswers] = useState<string[]>([])
  const row = task.scenarios?.[index]
  if (!row) return null
  const correct = choice === row.answer
  const final = index === (task.scenarios?.length ?? 0) - 1
  function choose(value: string) {
    setChoice(value)
    if (value !== row?.answer) { onAnswered?.(false, JSON.stringify({ answers, round: index, choice: value })); return }
    const next = [...answers, value]; setAnswers(next)
    if (final) onAnswered?.(true, JSON.stringify({ answers: next }))
    else if (!quiet) playLessonSound('correct')
  }
  return <section className={styles.scenario}>
    <span>Clue {index + 1} of {task.scenarios?.length}</span>
    <article className={styles.clue}><h3><AdaptiveLessonText text={row.clue} /></h3></article>
    <div className={styles.options}>{row.choices.map(value => <button type="button" key={value} disabled={choice !== null} className={choice === value ? correct ? styles.correct : styles.incorrect : ''} onClick={() => choose(value)}>{value}</button>)}</div>
    {choice && <p role="status">{correct ? row.feedback : task.retryFeedback}</p>}
    {choice && !correct && <button type="button" onClick={() => { setChoice(null); onChanged?.() }}>Try this clue again</button>}
    {choice && correct && !final && <button type="button" className={styles.listen} onClick={() => { setIndex(value => value + 1); setChoice(null) }}>Next clue</button>}
    <button type="button" className={styles.resetIcon} aria-label="Reset clues" title="Reset clues" onClick={() => { setIndex(0); setChoice(null); setAnswers([]); onChanged?.() }}><RotateCcw size={18} aria-hidden="true" /></button>
  </section>
}
