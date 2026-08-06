import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Palette,
  Mic,
  Smile,
  Meh,
  Frown,
  HelpCircle,
  Sparkles,
  Check,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import type { MoodOption, JournalResponseType } from '../../types'
import styles from './LearningJournal.module.css'

const MOODS: { value: MoodOption; icon: React.ReactNode; label: string }[] = [
  { value: 'happy', icon: <Smile size={24} />, label: 'Happy' },
  { value: 'okay', icon: <Meh size={24} />, label: 'Okay' },
  { value: 'tired', icon: <Frown size={24} />, label: 'Tired' },
  { value: 'confused', icon: <HelpCircle size={24} />, label: 'Confused' },
  { value: 'proud', icon: <Sparkles size={24} />, label: 'Proud' },
]

const PROMPTS = [
  'What did you learn today?',
  'What was your favourite part of the lesson?',
  'Was anything hard? How did you handle it?',
  'What do you want to learn more about?',
]

const RESPONSE_TYPES: {
  value: JournalResponseType
  icon: React.ReactNode
  label: string
}[] = [
  { value: 'text', icon: <Pencil size={12} />, label: 'Write' },
  { value: 'drawing', icon: <Palette size={12} />, label: 'Draw' },
  { value: 'audio', icon: <Mic size={12} />, label: 'Record' },
]

interface LocationState {
  sessionId?: string
  tasksDone?: string[]
}

export default function LearningJournal() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState) ?? {}

  const tasksDone = state.tasksDone ?? [
    'Getting Ready for School',
    'Morning Routine Steps',
    'Packing My School Bag',
  ]

  const [mood, setMood] = useState<MoodOption | null>(null)
  const [promptIndex] = useState(() =>
    Math.floor(Math.random() * PROMPTS.length)
  )
  const [responseType, setResponseType] = useState<JournalResponseType>('text')
  const [textContent, setTextContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const prompt = PROMPTS[promptIndex]

  async function handleSave() {
    setIsSaving(true)

    // TODO: replace with real API call when backend ready
    // await journalService.create({
    //   sessionId: state.sessionId,
    //   prompt,
    //   response: { type: responseType, content: textContent },
    //   mood,
    //   tasksDone,
    // })

    setTimeout(() => {
      navigate('/student/home', { replace: true })
    }, 800)
  }

  function handleSkip() {
    navigate('/student/home', { replace: true })
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <h1 className={styles.title}>My Learning Journal</h1>
        <button
          className={styles.skipBtn}
          onClick={handleSkip}
          aria-label="Skip journal entry"
        >
          Skip
        </button>
      </div>

      <div className={styles.content}>
        <section aria-labelledby="mood-heading">
          <h2 id="mood-heading" className={styles.sectionTitle}>
            How did you feel today?
          </h2>
          <div className={styles.moodRow}>
            {MOODS.map(({ value, icon, label }) => (
              <button
                key={value}
                className={`${styles.moodBtn} ${mood === value ? styles.moodActive : ''}`}
                onClick={() => setMood(value)}
                aria-pressed={mood === value}
                aria-label={label}
              >
                <span className={styles.moodEmoji} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.moodLabel}>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.promptCard} aria-labelledby="prompt-heading">
          <h2 id="prompt-heading" className={styles.promptQ}>
            {prompt}
          </h2>

          <div
            className={styles.responseTypes}
            role="group"
            aria-label="Response type"
          >
            {RESPONSE_TYPES.map(({ value, icon, label }) => (
              <button
                key={value}
                className={`${styles.rTypeBtn} ${responseType === value ? styles.rTypeActive : ''}`}
                onClick={() => setResponseType(value)}
                aria-pressed={responseType === value}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {responseType === 'text' && (
            <textarea
              className={styles.textArea}
              placeholder="Tell me about what you learned..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              aria-label={prompt}
              rows={4}
            />
          )}

          {responseType === 'drawing' && (
            <div className={styles.drawingPlaceholder}>
              <Palette size={24} aria-hidden="true" />
              <span>Drawing canvas coming soon</span>
            </div>
          )}

          {responseType === 'audio' && (
            <div className={styles.audioPlaceholder}>
              <Mic size={24} aria-hidden="true" />
              <span>Audio recording coming soon</span>
            </div>
          )}
        </section>

        {tasksDone.length > 0 && (
          <section aria-labelledby="tasks-heading">
            <h2 id="tasks-heading" className={styles.sectionTitle}>
              Tasks I completed
            </h2>
            <ul className={styles.tasksList}>
              {tasksDone.map((task, i) => (
                <li key={i} className={styles.taskItem}>
                  <span className={styles.taskCheck} aria-hidden="true">
                    <Check size={14} />
                  </span>
                  <span className={styles.taskName}>{task}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save my journal'}
        </button>
      </div>
    </PlayfulZoneTemplate>
  )
}
