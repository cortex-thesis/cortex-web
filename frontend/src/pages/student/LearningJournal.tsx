import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Frown,
  HelpCircle,
  Meh,
  Mic,
  Palette,
  Pencil,
  Save,
  Smile,
  Sparkles,
  Target,
} from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { InlineSkeleton } from '../../components/molecules'
import type { JournalResponseType, MoodOption } from '../../types'
import styles from './LearningJournal.module.css'
import { getStudentJournal, saveStudentJournal, type StudentJournalData } from '../../lib/studentApi'

const MOODS: { value: MoodOption; icon: ReactNode; label: string }[] = [
  { value: 'happy', icon: <Smile size={28} />, label: 'Happy' },
  { value: 'okay', icon: <Meh size={28} />, label: 'Okay' },
  { value: 'tired', icon: <Frown size={28} />, label: 'Tired' },
  { value: 'confused', icon: <HelpCircle size={28} />, label: 'Confused' },
  { value: 'proud', icon: <Sparkles size={28} />, label: 'Proud' },
]

const PROMPTS = [
  'What did you learn today?',
  'What was your favourite part of the lesson?',
  'Was anything hard? How did you handle it?',
  'What do you want to learn more about?',
]

const RESPONSE_TYPES: {
  value: JournalResponseType
  icon: ReactNode
  label: string
  hint: string
}[] = [
  { value: 'text', icon: <Pencil size={20} />, label: 'Write', hint: 'Use your own words' },
  { value: 'drawing', icon: <Palette size={20} />, label: 'Draw', hint: 'Create a picture' },
  { value: 'audio', icon: <Mic size={20} />, label: 'Record', hint: 'Tell your story' },
]

interface LocationState {
  sessionId?: string
  tasksDone?: string[]
}

export default function LearningJournal() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState) ?? {}
  const [journalData, setJournalData] = useState<StudentJournalData | null>(null)
  const [mood, setMood] = useState<MoodOption | null>(null)
  const [prompt, setPrompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
  const [responseType, setResponseType] = useState<JournalResponseType>('text')
  const [textContent, setTextContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const tasksDone = journalData?.session.completed_tasks ?? state.tasksDone ?? []

  useEffect(() => {
    void getStudentJournal(state.sessionId)
      .then((data) => {
        setJournalData(data)
        if (data.entry) {
          setPrompt(data.entry.prompt)
          setTextContent(data.entry.text_response)
          setMood((data.entry.mood || null) as MoodOption | null)
          setResponseType(data.entry.response_type)
        }
      })
      .catch((reason: Error) => setError(reason.message))
  }, [state.sessionId])

  async function handleSave() {
    const sessionId = journalData?.session.id
    if (!sessionId) return
    setIsSaving(true)
    setError('')
    try {
      await saveStudentJournal({ session_id: sessionId, prompt, response_type: 'text', text_response: textContent, mood: mood ?? '', shared_with_teacher: true })
      navigate('/student/home', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your journal.')
      setIsSaving(false)
    }
  }

  function selectResponseType(value: JournalResponseType) {
    const journalState = { ...state, sessionId: journalData?.session.id ?? state.sessionId, prompt, mood }
    if (value === 'drawing') {
      navigate('/student/journal/draw', { state: journalState })
      return
    }
    if (value === 'audio') {
      navigate('/student/journal/audio', { state: journalState })
      return
    }
    setResponseType(value)
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/student/home', { replace: true })} aria-label="Go back">
            <ArrowLeft size={21} strokeWidth={2} />
          </button>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>Post-session reflection</span>
            <h1>My Learning Journal</h1>
            <p>Take a moment to celebrate what you learned today.</p>
          </div>
          <button className={styles.skipBtn} onClick={() => navigate('/student/home', { replace: true })}>
            Skip for now
          </button>
        </header>

        <section className={styles.sessionStrip} aria-label="Session summary">
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryIcon} ${styles.purpleIcon}`}><BookOpen size={22} /></span>
            <span><strong>Session complete</strong><small>{journalData?.session.title ?? <InlineSkeleton width={150} height={10} />}</small></span>
          </div>
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryIcon} ${styles.yellowIcon}`}><Clock3 size={22} /></span>
            <span><strong>{journalData ? `${Math.max(1, Math.round(journalData.session.duration_seconds / 60))} minutes` : <InlineSkeleton width={70} height={14} />}</strong><small>Learning time</small></span>
          </div>
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryIcon} ${styles.coralIcon}`}><Target size={22} /></span>
            <span><strong>{tasksDone.length} tasks finished</strong><small>Great work today</small></span>
          </div>
        </section>

        <div className={styles.journalGrid}>
          <main className={styles.reflectionCard}>
            <div className={styles.cardHeading}>
              <span className={styles.sparkleBadge}><Sparkles size={22} /></span>
              <div>
                <span className={styles.cardEyebrow}>Today's reflection</span>
                <h2>{prompt}</h2>
              </div>
              <span className={styles.optionalPill}>Optional</span>
            </div>

            <div className={styles.responseTypes} role="group" aria-label="Choose how to respond">
              {RESPONSE_TYPES.map(({ value, icon, label, hint }) => (
                <button
                  key={value}
                  className={`${styles.responseBtn} ${responseType === value ? styles.responseActive : ''}`}
                  onClick={() => selectResponseType(value)}
                  aria-pressed={responseType === value}
                >
                  <span className={styles.responseIcon}>{icon}</span>
                  <span><strong>{label}</strong><small>{hint}</small></span>
                </button>
              ))}
            </div>

            <label className={styles.writingLabel} htmlFor="journal-response">
              Your thoughts
              <span>{textContent.length} characters</span>
            </label>
            <textarea
              id="journal-response"
              className={styles.textArea}
              placeholder="Tell me about what you learned, what made you smile, or what you want to try next..."
              value={textContent}
              onChange={(event) => setTextContent(event.target.value)}
              aria-label={prompt}
            />

            <div className={styles.saveArea}>
              <p>Your journal helps you remember how much you are growing.</p>
              <button className={styles.saveBtn} onClick={() => void handleSave()} disabled={isSaving || !journalData || !textContent.trim()} aria-busy={isSaving}>
                <Save size={19} />
                {isSaving ? 'Saving...' : 'Save my journal'}
              </button>
            </div>
          </main>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard} aria-labelledby="mood-heading">
              <div className={styles.sideHeading}>
                <div><span>Check in</span><h2 id="mood-heading">How did you feel?</h2></div>
                {mood && <span className={styles.selectedPill}>Selected</span>}
              </div>
              <div className={styles.moodGrid}>
                {MOODS.map(({ value, icon, label }) => (
                  <button
                    key={value}
                    className={`${styles.moodBtn} ${mood === value ? styles.moodActive : ''}`}
                    onClick={() => setMood(value)}
                    aria-pressed={mood === value}
                  >
                    <span>{icon}</span>
                    <strong>{label}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.sideCard} aria-labelledby="tasks-heading">
              <div className={styles.sideHeading}>
                <div><span>Today's progress</span><h2 id="tasks-heading">Tasks I completed</h2></div>
                <span className={styles.taskCount}>{tasksDone.length}</span>
              </div>
              <ul className={styles.tasksList}>
                {tasksDone.map((task, index) => (
                  <li key={`${task}-${index}`}>
                    <span className={styles.taskCheck}><span aria-hidden="true" /></span>
                    <span><strong>{task}</strong><small>Completed</small></span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
        {error && <p className={styles.errorMessage} role="alert">{error}</p>}
      </div>
    </PlayfulZoneTemplate>
  )
}
