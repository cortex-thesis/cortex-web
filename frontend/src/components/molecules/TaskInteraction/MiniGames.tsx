import { Children, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Backpack, Clock, Eraser, Folder, NotebookPen, RotateCcw, Ruler } from 'lucide-react'
import type { Task, TaskItem } from '../../../types'
import { playLessonSound } from '../../../lib/lessonSounds'
import { validObjectSelection, wordAtEndpoints } from '../../../lib/miniGameLogic'
import { shuffledMatchingDeck } from '../../../lib/flipMatchingOrder'
import styles from './MiniGames.module.css'

type Props = { task: Task; onAnswered?: (correct: boolean, response: string) => void; onChanged?: () => void; quiet?: boolean; narrowed?: boolean }
function ObjectChoices({ children, pageSize }: { children: ReactNode; pageSize?: number }) {
  const [page, setPage] = useState(0)
  const choices = Children.toArray(children)
  const size = pageSize ?? Math.max(choices.length, 1)
  const pages = Math.ceil(choices.length / size)
  const current = Math.min(page, Math.max(pages - 1, 0))
  return <div><div className={styles.objects}>{choices.slice(current * size, (current + 1) * size)}</div>{pages > 1 && <nav className={styles.actions} aria-label="Browse all objects"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous objects</button><span>Group {current + 1} of {pages}</span><button type="button" disabled={current + 1 === pages} onClick={() => setPage(current + 1)}>More objects</button></nav>}</div>
}
function Visual({ item }: { item: TaskItem }) {
  const Icon = { backpack: Backpack, clock: Clock, eraser: Eraser, notebook: NotebookPen, ruler: Ruler, 'folder-blue': Folder, 'folder-red': Folder }[item.symbol ?? '' as string]
  if (!item.imageUrl && Icon) return <Icon className={`${styles.builtinIcon} ${item.symbol === 'folder-blue' ? styles.blueFolder : item.symbol === 'folder-red' ? styles.redFolder : ''}`} aria-hidden="true" />
  return item.imageUrl ? <img src={item.imageUrl} alt={item.altText ?? item.label} /> : <span className={styles.symbol}>{item.symbol ?? '◇'}</span>
}
function Feedback({ correct, task, message }: { correct: boolean | null; task: Task; message?: string }) {
  return correct === null && !message ? null : <p className={`${styles.feedback} ${correct === false ? styles.incorrect : correct ? styles.correct : ''}`} role="status">{message ?? (correct ? task.correctFeedback : task.retryFeedback)}</p>
}

export function FindIt({ task, onAnswered, quiet, narrowed }: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const [checked, setChecked] = useState(false)
  const expected = task.correctItemIds ?? []
  function check() {
    const correct = validObjectSelection(picked, expected, task.allowSubset, task.minimumSelections)
    setChecked(true); setResult(correct)
    onAnswered?.(correct, JSON.stringify({ picked }))
  }
  return <div className={styles.game}>
    <div className={styles.workspace}><span className={styles.workspaceTitle}>{task.workspaceLabel ?? 'Find It'}</span>
      <ObjectChoices pageSize={quiet ? 2 : narrowed ? 4 : undefined}>{(task.items ?? []).map(item => <button type="button" key={item.id} aria-pressed={picked.includes(item.id)} disabled={result !== null} className={`${styles.object} ${picked.includes(item.id) ? styles.selected : ''} ${checked && picked.includes(item.id) ? expected.includes(item.id) ? styles.correct : styles.incorrect : ''}`} onClick={() => setPicked(value => value.includes(item.id) ? value.filter(id => id !== item.id) : [...value, item.id])}><Visual item={item} /><span>{picked.includes(item.id) ? ' ' : ''}{item.label}</span></button>)}</ObjectChoices>
    </div>
    <div className={styles.actions}><Feedback correct={result} task={task} /><button type="button" className={styles.primary} disabled={!picked.length || result !== null} onClick={check}>Check my choices</button></div>
  </div>
}

export function WordSearch({ task, onAnswered, onChanged, quiet }: Props) {
  const [start, setStart] = useState<number[] | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const dragStart = useRef<number[] | null>(null)
  const suppressClick = useRef(false)
  const followUps = useRef<Record<string, string>>({})
  const followUpRef = useRef<HTMLElement | null>(null)
  const targets = task.targets ?? []
  const subject = task.wordSearchSubject ?? 'sign'
  const target = targets.find(item => item.word === pending)
  useEffect(() => {
    if (!pending) return
    followUpRef.current?.focus({ preventScroll: true })
    followUpRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }, [pending])
  function finishWord(word: string, answer?: string) {
    if (answer) followUps.current[word] = answer
    const next = Array.from(new Set([...found, word]))
    setFound(next); setPending(null); setMessage('')
    if (targets.every(item => next.includes(item.word) && (!item.followUpQuestion || followUps.current[item.word] === item.followUpQuestion.answer))) { setResult(true); onAnswered?.(true, JSON.stringify({ found: next, follow_ups: followUps.current })) }
    else if (!quiet && !found.includes(word)) playLessonSound('correct')
  }
  function select(end: number[], beginning = start) {
    if (!beginning) { setStart(end); return }
    setStart(null)
    const match = wordAtEndpoints(targets, found, beginning, end)
    if (!match) { setMessage('Try another line of letters.'); return }
    if (match.followUpQuestion) {
      setFound(previous => Array.from(new Set([...previous, match.word])))
      setPending(match.word); setMessage('')
      if (!quiet) playLessonSound('correct')
    }
    else finishWord(match.word)
  }
  return <div className={styles.game}>
    <div className={styles.wordLayout}><div className={styles.letters} style={{ gridTemplateColumns: `repeat(${task.grid?.[0]?.length ?? 7}, minmax(0, 1fr))` }} aria-label="Word hunt letters" onPointerUp={event => {
      const cell = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLButtonElement>('[data-cell]')
      const end = cell?.dataset.cell?.split(',').map(Number)
      if (dragStart.current && end && JSON.stringify(dragStart.current) !== JSON.stringify(end)) { select(end, dragStart.current); suppressClick.current = true }
      dragStart.current = null
    }} onPointerCancel={() => { dragStart.current = null }}>
      {(task.grid ?? []).flatMap((row, r) => row.map((letter, c) => {
        const highlighted = targets.some(item => found.includes(item.word) && item.cells.some(([rr, cc]) => rr === r && cc === c))
        return <button type="button" key={`${r},${c}`} data-cell={`${r},${c}`} disabled={pending !== null || result === true} className={`${highlighted ? styles.found : ''} ${start?.[0] === r && start?.[1] === c ? styles.selected : ''}`} aria-label={`${letter}, row ${r + 1}, column ${c + 1}${highlighted ? ', found' : ''}`} onPointerDown={() => { dragStart.current = [r, c]; suppressClick.current = false }} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } select([r, c]) }}>{letter}</button>
      }))}
    </div><div className={`${styles.wordList} ${pending ? styles.wordListExpanded : ''}`} aria-label="Words to find">
      <div className={styles.wordListHeader}><strong role="status">{found.length} of {targets.length} found</strong><button type="button" className={styles.resetIcon} aria-label="Reset word search" title="Reset word search" onClick={() => { setFound([]); setStart(null); setPending(null); setResult(null); setMessage(''); followUps.current = {}; dragStart.current = null; suppressClick.current = false; onChanged?.() }}><RotateCcw size={18} aria-hidden="true" /></button></div>
      {message && !pending && <Feedback correct={null} task={task} message={message} />}
      {target?.followUpQuestion && <section ref={followUpRef} tabIndex={-1} className={styles.followUp} aria-label={`${target.displayLabel} found. Choose the ${subject}'s meaning.`}>
        <span className={styles.nextStep}>Next: understand the {subject}</span>
        {target.revealImage && <img src={target.revealImage} alt={task.wordSearchSubject === 'word' ? `${target.displayLabel} activity illustration` : `${target.displayLabel} sign`} />}
        <strong>{target.followUpQuestion.question}</strong>
        <div className={styles.followUpChoices}>{target.followUpQuestion.choices.map(choice => <button type="button" key={choice} onClick={() => { if (choice === target.followUpQuestion?.answer) finishWord(target.word, choice); else { setMessage(subject === 'word' ? 'Look at the picture again. What does the word mean?' : 'Look at the sign again. What is it telling you?'); if (!quiet) playLessonSound('incorrect') } }}>{choice}</button>)}</div>
        {message && <Feedback correct={null} task={task} message={message} />}
      </section>}
      {targets.map(item => <span key={item.word} className={found.includes(item.word) ? styles.found : ''}>{item.displayLabel}{found.includes(item.word) && <small className={styles.foundBadge}>{pending === item.word ? 'Found · answer next' : 'Found'}</small>}{found.includes(item.word) && pending !== item.word && item.revealImage && <img src={item.revealImage} alt={item.displayLabel} />}</span>)}
    </div></div>
  </div>
}

export function AudioSequence({ task, onAnswered, onChanged, quiet, narrowed }: Props) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [replays, setReplays] = useState(0)
  const [plays, setPlays] = useState(0)
  const [prompted, setPrompted] = useState(false)
  const [result, setResult] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const history = useRef<object[]>([])
  const speech = useRef<SpeechSynthesisUtterance | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  const round = task.rounds?.[roundIndex]
  useEffect(() => () => { audio.current?.pause(); if (speech.current) window.speechSynthesis?.cancel() }, [])
  function listen() {
    if (!round || playing) return
    if (plays > 0) setReplays(value => value + 1)
    setPlays(value => value + 1); setReady(false); setPlaying(true); setMessage('')
    const ended = () => { setPlaying(false); setReady(true) }
    if (round.audioUrl) {
      const player = new Audio(round.audioUrl); audio.current = player; player.onended = ended
      player.onerror = () => { setPlaying(false); setMessage('Audio could not play. Please try again.') }
      void player.play().catch(() => { setPlaying(false); setMessage('Audio could not play. Please try again.') })
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(round.direction); speech.current = utterance
      utterance.lang = 'en-PH'; utterance.rate = 0.85; utterance.onend = ended
      utterance.onerror = () => { setPlaying(false); setMessage('Speech is unavailable. Please retry or use a visual prompt.') }
      window.speechSynthesis.speak(utterance)
    } else { setPlaying(false); setMessage('Speech is unavailable on this browser. Use the visual prompt for supported practice.') }
  }
  function pick(id: string) {
    if (!round) return
    const next = [...picked, id]; setPicked(next)
    if (next.length !== round.correctOrder.length) return
    const correct = JSON.stringify(next) === JSON.stringify(round.correctOrder)
    const evidence = { round: roundIndex, picked: next, replays, visual_prompt: prompted, completion_support: prompted ? 'with_visual_prompt' : replays ? 'after_replay' : 'without_replay', audio_played: plays > 0 }
    if (!correct) { setResult(false); onAnswered?.(false, JSON.stringify({ rounds: [...history.current, evidence] })); return }
    history.current.push(evidence)
    if (roundIndex + 1 === task.rounds?.length) { setResult(true); onAnswered?.(true, JSON.stringify({ rounds: history.current })) }
    else { if (!quiet) playLessonSound('correct'); setRoundIndex(value => value + 1); setPicked([]); setReady(false); setPlays(0); setReplays(0); setPrompted(false); setMessage('Steps completed. Listen to the next direction.') }
  }
  return <div className={styles.game}><div className={styles.actions}><button type="button" className={styles.listen} disabled={playing || result !== null} onClick={listen}>{playing ? 'Playing…' : plays ? '↻ Listen again' : '▶ Listen'}</button><span>Round {roundIndex + 1} of {task.rounds?.length}</span><button type="button" disabled={playing || result !== null} onClick={() => { setPrompted(true); setReady(true) }}>Show a visual prompt</button></div>
    {prompted && <p className={styles.prompt}>{round?.direction}</p>}
    <p role="status">{ready ? `Your turn. ${picked.length} selected.` : 'Listen before taking your turn.'}</p>
    <div className={styles.workspace}><span className={styles.workspaceTitle}>{task.workspaceLabel ?? 'Your choices'}</span><ObjectChoices pageSize={quiet ? 2 : narrowed ? 4 : undefined}>{(task.items ?? []).map(item => <button type="button" key={item.id} aria-label={task.contentVersion ? item.label : undefined} disabled={!ready || playing || result !== null} className={`${styles.object} ${picked.includes(item.id) ? styles.selected : ''} ${result !== null && picked.includes(item.id) ? result ? styles.correct : styles.incorrect : ''}`} onClick={() => pick(item.id)}><Visual item={item} /><span>{item.label}</span>{picked.includes(item.id) && <small>Picked {picked.indexOf(item.id) + 1}</small>}</button>)}</ObjectChoices></div>
    <div className={styles.actions}>{result === false && <button type="button" className={styles.primary} onClick={() => { setPicked([]); setResult(null); setMessage('Try another order. Listening again is optional.'); onChanged?.() }}>Try this round again</button>}<button type="button" disabled={playing} onClick={() => { history.current = []; setRoundIndex(0); setPicked([]); setResult(null); setReady(false); setPlays(0); setReplays(0); setPrompted(false); setMessage(''); onChanged?.() }}>Reset activity</button><Feedback correct={result} task={task} message={result === null ? message : undefined} /></div>
  </div>
}

export function FlipMatching({ task, onAnswered, onChanged, quiet }: Props) {
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState(false)
  const [cards, setCards] = useState(() => shuffledMatchingDeck(task.pairs ?? []))
  function flip(key: string) {
    const card = cards.find(value => value.key === key)!
    if (matched.includes(card.pairId)) return
    if (open.includes(key)) {
      setOpen(open.filter(value => value !== key))
      setWrong(false)
      if (wrong) onChanged?.()
      return
    }
    const next = open.length === 2 ? [key] : [...open, key]
    if (wrong) { setWrong(false); onChanged?.() }
    setOpen(next)
    if (next.length !== 2) return
    if (cards.find(value => value.key === next[0])?.pairId !== card.pairId) {
      setWrong(true)
      onAnswered?.(false, JSON.stringify({ cards: next }))
      return
    }
    const matches = [...matched, card.pairId]
    setMatched(matches); setOpen([])
    if (matches.length === (task.pairs ?? []).length) onAnswered?.(true, JSON.stringify({ matched: matches }))
    else if (!quiet) playLessonSound('correct')
  }
  return <div className={styles.game}>
    <strong role="status">{matched.length} of {task.pairs?.length ?? 0} pairs matched</strong>
    <div className={`${styles.flipGrid} ${cards.length >= 8 && cards.length % 4 === 0 ? styles.flipGridCompact : ''}`}>{cards.map((card, index) => {
      const complete = matched.includes(card.pairId)
      const shown = complete || open.includes(card.key)
      return <button type="button" key={card.key} aria-label={shown ? `${card.item.label}${complete ? ', matched' : ', tap to turn over'}` : `Flip card ${index + 1}`} aria-pressed={shown} disabled={complete} className={`${styles.flipCard} ${shown ? styles.revealed : ''} ${complete ? styles.correct : ''}`} onClick={() => flip(card.key)}>
        <span className={`${styles.flipInner} ${shown ? styles.flipTurned : ''}`}>
          <span className={`${styles.flipFace} ${styles.flipBack}`} aria-hidden={shown}><span className={styles.cardBack}>?</span><small>Card {index + 1}</small></span>
          <span className={`${styles.flipFace} ${styles.flipFront}`} aria-hidden={!shown}>{card.item.imageUrl ? <><img src={card.item.imageUrl} alt={card.item.altText ?? card.item.label} />{!task.hideImageLabels && <span>{card.item.label}</span>}</> : <span>{card.item.label}</span>}{complete && <strong>Matched</strong>}</span>
        </span>
      </button>
    })}</div>
    {wrong && <p role="status">These cards don't match. Tap a card to turn it over, or choose another card.</p>}
    <button type="button" onClick={() => { setOpen([]); setMatched([]); setWrong(false); setCards(current => shuffledMatchingDeck(task.pairs ?? [], Math.random, current.map(card => card.key))); onChanged?.() }}>Reset cards</button>
  </div>
}

export function Shopping({ task, onAnswered, onChanged, quiet, narrowed }: Props) {
  const [stage, setStage] = useState(0)
  const [paid, setPaid] = useState(0)
  const [result, setResult] = useState<boolean | null>(null)
  const [picked, setPicked] = useState<string | number | null>(null)
  const item = task.items?.find(value => value.id === task.targetItemId)
  const price = item?.price ?? 0
  const given = paid === task.payment ? task.givenChange ?? paid - price : paid - price
  const actual = paid - price
  function attempt(correct: boolean, selection: string | number, next: number) {
    setPicked(selection)
    if (!correct) { setResult(false); onAnswered?.(false, JSON.stringify({ stage, selected: selection, item: item?.id, paid, given })); return }
    if (next === 5) { setResult(true); onAnswered?.(true, JSON.stringify({ item: item?.id, price, paid, given, change: actual, verified: true })) }
    else { if (!quiet) playLessonSound('correct'); setStage(next); setPicked(null) }
  }
  return <div className={styles.game}><p className={styles.mission}>Simulated store · {['Find the item', 'Check the price', 'Choose payment', 'Check received change', 'Calculate correct change'][stage]}</p>
    <strong>{stage === 0 ? `Buy: ${item?.label}` : `${item?.label} · Price: ₱${price}`}</strong>
    {stage === 0 ? <ObjectChoices pageSize={quiet ? 2 : narrowed ? 4 : undefined}>{(task.items ?? []).map(value => <button type="button" className={`${styles.object} ${result === false && picked === value.id ? styles.incorrect : ''}`} key={value.id} disabled={result !== null} onClick={() => attempt(value.id === item?.id, value.id, 1)}><Visual item={value} /><span>{value.label}</span><span className={styles.tag}>₱{value.price}</span></button>)}</ObjectChoices> : <div className={styles.checkout}>{item && <Visual item={item} />}<span className={styles.tag}>₱{price}</span>{paid > 0 && <span>Paid: ₱{paid}</span>}{stage >= 3 && <span>Change received: ₱{given}</span>}</div>}
    <div className={styles.actions}>
      {stage === 1 && (task.items ?? []).map(value => <button type="button" key={value.id} disabled={result !== null} className={result === false && picked === value.price ? styles.incorrect : ''} onClick={() => attempt(value.price === price, value.price ?? 0, 2)}>₱{value.price}</button>)}
      {stage === 2 && (task.paymentOptions ?? []).map(value => <button type="button" key={value} disabled={result !== null} className={`${styles.object} ${result === false && picked === value ? styles.incorrect : ''}`} onClick={() => { if (value >= price) { setPaid(value); if (!quiet) playLessonSound('correct'); setStage(3) } else attempt(false, value, 3) }}>{task.moneyItems?.find(item => item.price === value) && <Visual item={task.moneyItems.find(item => item.price === value)!} />}Pay ₱{value}</button>)}
      {stage === 3 && <><span>Is the change correct?</span>{['Yes', 'No'].map(value => <button type="button" key={value} disabled={result !== null} className={result === false && picked === value ? styles.incorrect : ''} onClick={() => attempt((value === 'Yes') === (given === actual), value, given === actual ? 5 : 4)}>{value}</button>)}</>}
      {stage === 4 && <><span>How much change should you receive?</span>{[...new Set([...(task.changeOptions ?? []), actual])].sort((a, b) => a - b).map(value => <button type="button" key={value} disabled={result !== null} className={result === false && picked === value ? styles.incorrect : ''} onClick={() => attempt(value === actual, value, 5)}>₱{value}</button>)}</>}
      <Feedback correct={result} task={task} />
    </div><button type="button" onClick={() => { setStage(0); setPaid(0); setResult(null); setPicked(null); onChanged?.() }}>Restart transaction</button>
  </div>
}
