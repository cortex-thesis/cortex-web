import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Apple, Banana, Cherry, Grape, Cat, Dog, Bird, Fish, Bus, Car, Bike, TrainFront, Circle, Square, Triangle, Star } from 'lucide-react'
import type { CognitiveState } from '../../constants/states'
import { playLessonSound } from '../../lib/lessonSounds'
import { nextEEGMode } from '../../lib/eegTransitions'
import styles from './EEGRegulation.module.css'
import playerStyles from './PracticeLesson.module.css'
import ModeBgm from '../../components/molecules/ModeBgm/ModeBgm'

const WORDS = [
  { answer: 'FRUIT', pictures: [Apple, Banana, Cherry, Grape], labels: ['Apple', 'Banana', 'Cherries', 'Grapes'] },
  { answer: 'ANIMAL', pictures: [Cat, Dog, Bird, Fish], labels: ['Cat', 'Dog', 'Bird', 'Fish'] },
  { answer: 'TRAVEL', pictures: [Bus, Car, Bike, TrainFront], labels: ['Bus', 'Car', 'Bicycle', 'Train'] },
  { answer: 'SHAPE', pictures: [Circle, Square, Triangle, Star], labels: ['Circle', 'Square', 'Triangle', 'Star'] },
]
const THOUGHTS = ['One thing at a time', 'I can take a small step', 'A quiet moment helps me', 'I can ask for help']
const SORTS = [
  { items: ['Apple', 'Pencil', 'Banana', 'Book'], answers: ['food', 'tools', 'food', 'tools'], groups: [['food', 'Food'], ['tools', 'Learning tools'], ['clothes', 'Clothing']] },
  { items: ['Shirt', 'Spoon', 'Socks', 'Plate'], answers: ['clothes', 'kitchen', 'clothes', 'kitchen'], groups: [['clothes', 'Clothing'], ['kitchen', 'Kitchen items'], ['tools', 'Learning tools']] },
  { items: ['Bus', 'Cat', 'Train', 'Dog'], answers: ['transport', 'animals', 'transport', 'animals'], groups: [['transport', 'Transport'], ['animals', 'Animals'], ['food', 'Food']] },
]
const PATTERNS = [
  { prompt: 'Circle, square, circle, square? What comes next?', options: ['Circle', 'Triangle', 'Star'], answer: 'Circle' },
  { prompt: 'Red, blue, blue, red, blue, blue? What comes next?', options: ['Blue', 'Red', 'Green'], answer: 'Red' },
  { prompt: '1, 2, 3, 1, 2? What comes next?', options: ['1', '2', '3'], answer: '3' },
]
const ORDERS = [
  ['Wet hands', 'Use soap', 'Rinse hands', 'Dry hands'],
  ['Pick a book', 'Open the book', 'Read a page', 'Close the book'],
  ['Find a pot', 'Add soil', 'Plant a seed', 'Water gently'],
]

interface Props {
  mode: 'breathing' | 'refocus'
  allowResume?: boolean
  paused?: boolean
  state: CognitiveState | null
  transitionState: () => CognitiveState | null
  onResume: () => void
  onBreathing: () => void
}

export default function EEGRegulation({ mode, state, transitionState, onResume, onBreathing, allowResume = true, paused = false }: Props) {
  const [phase, setPhase] = useState(0)
  const [round, setRound] = useState(() => Math.floor(Math.random() * 4) * 5)
  const [intro, setIntro] = useState(true)
  const kind = round % 5
  const level = Math.floor(round / 5)
  const word = WORDS[level % WORDS.length]
  const letters = [...word.answer, 'O', 'E', 'S', 'B'].sort((a, b) => a.localeCompare(b)).reverse()
  const thought = THOUGHTS[level % THOUGHTS.length]
  const sorting = SORTS[level % SORTS.length]
  const pattern = PATTERNS[level % PATTERNS.length]
  const order = ORDERS[level % ORDERS.length]
  const [text, setText] = useState('')
  const [pickedLetters, setPickedLetters] = useState<number[]>([])
  const [sorted, setSorted] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const completionLocked = useRef(false)
  const recovered = state === 'focused' || state === 'relaxed'
  const continueAfterSuccess = useEffectEvent(() => {
    const nextMode = nextEEGMode(transitionState(), 'refocus')
    setCelebrating(false)
    completionLocked.current = false
    if (nextMode === 'focus') { onResume(); return }
    if (nextMode === 'breathing') { onBreathing(); return }
    setRound(value => value + 1); setText(''); setPickedLetters([]); setSorted({}); setFeedback('')
  })
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 1800)
    return () => window.clearTimeout(timer)
  }, [mode])
  useEffect(() => {
    if (!celebrating || paused) return
    const timer = window.setTimeout(() => continueAfterSuccess(), 1600)
    return () => window.clearTimeout(timer)
  }, [celebrating, paused])
  useEffect(() => {
    if (mode !== 'breathing' || recovered || paused) return
    const timer = window.setInterval(() => setPhase(value => (value + 1) % 3), 4000)
    return () => window.clearInterval(timer)
  }, [mode, recovered, paused])
  function finishActivity(nextLetters = pickedLetters, nextText = text, nextSorted = sorted) {
    if (completionLocked.current) return
    const correct = kind === 0 ? nextLetters.map(index => letters[index]).join('') === word.answer
      : kind === 1 ? nextText.trim().toLowerCase() === thought.toLowerCase()
      : kind === 2 ? sorting.items.every((item, index) => nextSorted[item] === sorting.answers[index])
      : kind === 3 ? nextText === pattern.answer
      : nextLetters.length === order.length && nextLetters.every((value, index) => value === index)
    if (!correct) {
      if ((kind === 0 && nextLetters.length === word.answer.length) || (kind === 2 && Object.keys(nextSorted).length === sorting.items.length) || kind === 3 || (kind === 4 && nextLetters.length === order.length)) setFeedback('Take your time. Try once more.')
      return
    }
    playLessonSound('goodJob')
    completionLocked.current = true
    setCelebrating(true)
  }
  return <>
    <div className={`${playerStyles.stage} ${styles.stage}`}>
    <section className={`${styles.content} ${mode === 'breathing' ? styles.breathing : ''}`} aria-label={mode === 'breathing' ? 'Breathing break' : 'Refocusing activity'}>
      {intro ? <div className={styles.intro} role="status"><div className={styles.orb} aria-hidden="true" /><h1>Let's take a gentle pause</h1><p>{mode === 'breathing' ? 'Slow down with a few comfortable breaths.' : 'Try a small activity, one step at a time.'}</p></div> : mode === 'breathing' ? <>
        <div className={`${styles.orb} ${recovered ? styles.still : ''}`} aria-hidden="true" />
        <h1 key={recovered ? 'ready' : phase} className={recovered ? styles.ready : styles.breath} aria-live="polite">{recovered ? 'Ready to continue' : ['Breathe in gently', 'Breathe out slowly', 'Rest and soften your shoulders'][phase]}</h1>
        {recovered && allowResume && <div className={styles.actions}><button className={`${playerStyles.button} ${playerStyles.next}`} onClick={onResume}>Continue</button></div>}
        {recovered && !allowResume && <p>Your teacher will continue the lesson when the class is ready.</p>}
        <div className={styles.music}><ModeBgm mode="relax" suspended={paused} /></div>
      </> : celebrating ? <div className={styles.success} role="status">
        <svg className={styles.successMark} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><path d="M28 51 L43 66 L73 35" pathLength="1" /></svg>
        <h1>Good job!</h1>
      </div> : <>
        <h1>{['Four pictures, one word', 'Write a calming thought', 'Put things in their place', 'Complete the pattern', 'Put the steps in order'][kind]}</h1>
        <div className={styles.activity}>
          {kind === 0 ? <div className={styles.wordGame}>
            <div className={styles.pictures}>{word.pictures.map((Icon, index) => <div key={index}><Icon size={56} aria-label={word.labels[index]} role="img" /></div>)}</div>
            <div className={styles.wordControls}>
            <p id="letter-instructions">Pick letters to find the word. Tap a filled space to remove a letter.</p>
            <div className={styles.answerSlots} role="group" aria-label={`Your ${word.answer.length}-letter word`} aria-describedby="letter-instructions">
              {Array.from({ length: word.answer.length }, (_, slot) => <button type="button" key={slot} disabled={pickedLetters[slot] === undefined} aria-label={`Letter ${slot + 1}: ${pickedLetters[slot] === undefined ? 'empty' : letters[pickedLetters[slot]] + ', remove'}`} onClick={() => { setPickedLetters(previous => previous.filter((_, index) => index !== slot)); setFeedback('') }}>{pickedLetters[slot] === undefined ? '\u00b7' : letters[pickedLetters[slot]]}</button>)}
            </div>
            <div className={styles.letterBank} role="group" aria-label="Available letters">
              {letters.map((letter, index) => <button type="button" key={index} disabled={pickedLetters.includes(index) || pickedLetters.length === word.answer.length} aria-label={`Pick ${letter}`} onClick={() => { const next = [...pickedLetters, index]; setPickedLetters(next); setFeedback(''); finishActivity(next) }}>{letter}</button>)}
            </div>
            </div>
          </div>
          : kind === 1 ? <label>Copy these words: <strong>{thought}</strong><textarea value={text} onChange={event => { const next = event.target.value; setText(next); setFeedback(''); finishActivity(pickedLetters, next) }} rows={3} /></label>
          : kind === 2 ? <div className={styles.organize}>{sorting.items.map(item => <fieldset key={item} className={styles.groupQuestion}><legend>{item}: Which group does this belong to?</legend>{sorting.groups.map(([value, label]) => <label key={value} className={styles.groupChoice}><input type="radio" name={`group-${item}`} value={value} checked={sorted[item] === value} onChange={() => { const next = { ...sorted, [item]: value }; setSorted(next); setFeedback(''); finishActivity(pickedLetters, text, next) }} /><span>{label}</span></label>)}</fieldset>)}</div>
          : kind === 3 ? <div className={styles.pattern}><p>{pattern.prompt}</p>{pattern.options.map(option => <button key={option} onClick={() => { setText(option); finishActivity(pickedLetters, option) }}>{option}</button>)}</div>
          : <div className={styles.order}><p>Tap the steps in the order you would do them. Tap a selected step to undo.</p>{[2, 0, 3, 1].map(index => <button key={index} aria-pressed={pickedLetters.includes(index)} onClick={() => { const next = pickedLetters.includes(index) ? pickedLetters.filter(value => value !== index) : [...pickedLetters, index]; setPickedLetters(next); setFeedback(''); finishActivity(next) }}>{pickedLetters.includes(index) ? (pickedLetters.indexOf(index) + 1) + '. ' : ''}{order[index]}</button>)}</div>}
          <p role="status">{feedback}</p>
        </div>
      </>}
    </section>
    </div>
  </>
}
