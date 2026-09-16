import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Apple, Banana, Cherry, Grape } from 'lucide-react'
import type { CognitiveState } from '../../constants/states'
import { playLessonSound } from '../../lib/lessonSounds'
import { nextEEGMode } from '../../lib/eegTransitions'
import styles from './EEGRegulation.module.css'
import playerStyles from './PracticeLesson.module.css'
import ModeBgm from '../../components/molecules/ModeBgm/ModeBgm'

const LETTERS = ['T', 'A', 'R', 'O', 'F', 'E', 'I', 'S', 'U', 'L']

interface Props {
  mode: 'breathing' | 'refocus'
  state: CognitiveState | null
  onResume: () => void
  onBreathing: () => void
}

export default function EEGRegulation({ mode, state, onResume, onBreathing }: Props) {
  const [phase, setPhase] = useState(0)
  const [round, setRound] = useState(0)
  const [text, setText] = useState('')
  const [pickedLetters, setPickedLetters] = useState<number[]>([])
  const [sorted, setSorted] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState('')
  const [celebrating, setCelebrating] = useState(false)
  const completionLocked = useRef(false)
  const recovered = state === 'focused' || state === 'relaxed'
  const continueAfterSuccess = useEffectEvent(() => {
    const nextMode = nextEEGMode(state, 'refocus')
    setCelebrating(false)
    completionLocked.current = false
    if (nextMode === 'focus') { onResume(); return }
    if (nextMode === 'breathing') { onBreathing(); return }
    setRound(value => value + 1); setText(''); setPickedLetters([]); setSorted({}); setFeedback('')
  })
  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => continueAfterSuccess(), 1600)
    return () => window.clearTimeout(timer)
  }, [celebrating])
  useEffect(() => {
    if (mode !== 'breathing' || recovered) return
    const timer = window.setInterval(() => setPhase(value => (value + 1) % 3), 4000)
    return () => window.clearInterval(timer)
  }, [mode, recovered])
  function finishActivity(nextLetters = pickedLetters, nextText = text, nextSorted = sorted) {
    if (completionLocked.current) return
    const correct = round % 3 === 0 ? nextLetters.map(index => LETTERS[index]).join('') === 'FRUIT'
      : round % 3 === 1 ? nextText.trim().toLowerCase() === 'one thing at a time'
      : nextSorted.Apple === 'food' && nextSorted.Banana === 'food' && nextSorted.Pencil === 'tools' && nextSorted.Book === 'tools'
    if (!correct) {
      if ((round % 3 === 0 && nextLetters.length === 5) || (round % 3 === 2 && Object.keys(nextSorted).length === 4)) setFeedback('Take your time. Try once more.')
      return
    }
    playLessonSound('goodJob')
    completionLocked.current = true
    setCelebrating(true)
  }
  return <>
    <div className={`${playerStyles.stage} ${styles.stage}`}>
    <section className={`${styles.content} ${mode === 'breathing' ? styles.breathing : ''}`} aria-label={mode === 'breathing' ? 'Breathing break' : 'Refocusing activity'}>
      {mode === 'breathing' ? <>
        <div className={`${styles.orb} ${recovered ? styles.still : ''}`} aria-hidden="true" />
        <h1 key={recovered ? 'ready' : phase} className={recovered ? '' : styles.breath} aria-live="polite">{recovered ? 'Ready to continue' : ['Breathe in gently', 'Breathe out slowly', 'Rest and soften your shoulders'][phase]}</h1>
        {recovered && <div className={styles.actions}><button className={`${playerStyles.button} ${playerStyles.next}`} onClick={onResume}>Continue</button></div>}
        <div className={styles.music}><ModeBgm mode="relax" /></div>
      </> : celebrating ? <div className={styles.success} role="status">
        <svg className={styles.successMark} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" /><path d="M28 51 L43 66 L73 35" pathLength="1" /></svg>
        <h1>Good job!</h1>
      </div> : <>
        <h1>{['Four pictures, one word', 'Write a calming thought', 'Put things in their place'][round % 3]}</h1>
        <div className={styles.activity}>
          {round % 3 === 0 ? <div className={styles.wordGame}>
            <div className={styles.pictures}>{[Apple, Banana, Cherry, Grape].map((Icon, index) => <div key={index}><Icon size={56} aria-label={['Apple', 'Banana', 'Cherries', 'Grapes'][index]} role="img" /></div>)}</div>
            <div className={styles.wordControls}>
            <p id="letter-instructions">Pick letters to find the word. Tap a filled space to remove a letter.</p>
            <div className={styles.answerSlots} role="group" aria-label="Your five-letter word" aria-describedby="letter-instructions">
              {Array.from({ length: 5 }, (_, slot) => <button type="button" key={slot} disabled={pickedLetters[slot] === undefined} aria-label={`Letter ${slot + 1}: ${pickedLetters[slot] === undefined ? 'empty' : LETTERS[pickedLetters[slot]] + ', remove'}`} onClick={() => { setPickedLetters(previous => previous.filter((_, index) => index !== slot)); setFeedback('') }}>{pickedLetters[slot] === undefined ? '\u00b7' : LETTERS[pickedLetters[slot]]}</button>)}
            </div>
            <div className={styles.letterBank} role="group" aria-label="Available letters">
              {LETTERS.map((letter, index) => <button type="button" key={index} disabled={pickedLetters.includes(index) || pickedLetters.length === 5} aria-label={`Pick ${letter}`} onClick={() => { const next = [...pickedLetters, index]; setPickedLetters(next); setFeedback(''); finishActivity(next) }}>{letter}</button>)}
            </div>
            </div>
          </div>
          : round % 3 === 1 ? <label>Copy these words: <strong>One thing at a time</strong><textarea value={text} onChange={event => { const next = event.target.value; setText(next); setFeedback(''); finishActivity(pickedLetters, next) }} rows={3} /></label>
          : <div className={styles.organize}>{['Apple', 'Pencil', 'Banana', 'Book'].map(item => <fieldset key={item} className={styles.groupQuestion}><legend>{item}: Which group does this belong to?</legend>{[['food', 'Food'], ['tools', 'Learning tools'], ['clothes', 'Clothing']].map(([value, label]) => <label key={value} className={styles.groupChoice}><input type="radio" name={`group-${item}`} value={value} checked={sorted[item] === value} onChange={() => { const next = { ...sorted, [item]: value }; setSorted(next); setFeedback(''); finishActivity(pickedLetters, text, next) }} /><span>{label}</span></label>)}</fieldset>)}</div>}
          <p role="status">{feedback}</p>
        </div>
      </>}
    </section>
    </div>
  </>
}

