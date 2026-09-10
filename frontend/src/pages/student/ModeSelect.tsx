import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CalmZoneTemplate } from '../../components/templates'
import styles from './ModeSelect.module.css'
import { startStudentSession } from '../../lib/studentApi'
import { api } from '../../lib/api'

type SessionMode = 'teacher' | 'free'

interface ModeOption {
  value: SessionMode
  emoji: string
  name: string
  description: string
  badge: string
  badgeColor: string
  iconBg: string
  recommended?: boolean
}

const MODES: ModeOption[] = [
  {
    value: 'teacher',
    emoji: '🧑‍🏫',
    name: 'Teacher-directed',
    description: 'Your teacher controls the session and content for the class.',
    badge: 'Recommended',
    badgeColor: styles.badgeTeacher ?? '',
    iconBg: '#FBEAF0',
    recommended: true,
  },
  {
    value: 'free',
    emoji: '🎮',
    name: 'Free explore',
    description: 'Explore content at your own pace, in any order you like.',
    badge: 'Independent',
    badgeColor: styles.badgeFree ?? '',
    iconBg: '#EEEDFE',
  },
]

export default function ModeSelect() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selected, setSelected] = useState<SessionMode>('teacher')
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')
  const [needsConsent, setNeedsConsent] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  async function handleStart() {
    const context = (location.state as { classId?: number; lessonId?: number; sessionId?: string } | null) ?? {}
    if (!context.classId) {
      setError('Choose a class and lesson before starting a session.')
      return
    }
    setIsStarting(true)
    setError('')
    setNeedsConsent(false)
    try {
      if (context.sessionId) {
        navigate('/student/eeg-live', { replace: true, state: { ...context, mode: selected } })
        return
      }
      const session = await startStudentSession({ class_id: context.classId, lesson_id: context.lessonId, control_mode: selected })
      navigate('/student/eeg-live', {
        replace: true,
        state: { ...context, mode: selected, sessionId: session.id },
      })
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to start the session.'
      if (message.includes('EEG-processing consent')) {
        setNeedsConsent(true)
        setError('Before recording, Cortex needs permission to save your processed Muse 2 brainwave values with this lesson session.')
      } else setError(message)
      setIsStarting(false)
    }
  }

  async function grantConsentAndStart() {
    if (!consentChecked) return
    setIsStarting(true); setError('')
    try {
      await api('/auth/consent/', { method: 'POST', body: JSON.stringify({ consent_type: 'eeg_processing', version: '1', granted: true, subject: 'student' }) })
      setNeedsConsent(false)
      await handleStart()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save EEG recording permission.')
      setIsStarting(false)
    }
  }

  return (
    <CalmZoneTemplate showNav={false}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/student/home', { replace: true })}
          aria-label="Go back"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </button>
        <h1 className={styles.topTitle}>Choose your mode</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.textBlock}>
          <h2 className={styles.heading}>How would you like to learn today?</h2>
          <p className={styles.sub}>
            Your teacher may adjust your mode during the session based on your
            brainwave activity.
          </p>
        </div>

        <div
          className={styles.modeCards}
          role="radiogroup"
          aria-label="Session mode"
        >
          {MODES.map((mode) => (
            <button
              key={mode.value}
              role="radio"
              aria-checked={selected === mode.value}
              className={`${styles.card} ${
                selected === mode.value ? styles.cardSelected : ''
              } ${mode.recommended ? styles.cardRecommended : ''}`}
              onClick={() => setSelected(mode.value)}
            >
              <div
                className={styles.cardIcon}
                style={{ background: mode.iconBg }}
                aria-hidden="true"
              >
                {mode.emoji}
              </div>
              <span className={styles.cardName}>{mode.name}</span>
              <span className={styles.cardDesc}>{mode.description}</span>
              <span
                className={`${styles.cardBadge} ${
                  mode.recommended ? styles.badgeTeacher : styles.badgeFree
                }`}
              >
                {mode.badge}
              </span>
              {selected === mode.value && (
                <span className={styles.checkmark} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <p className={styles.consentError} role="alert">{error}</p>}
        {needsConsent && <section className={styles.consentBox} aria-label="Muse data recording permission"><strong>Allow Muse 2 session recording</strong><p>This is permission to store processed brainwave values with your lesson. It is not another lesson or content requirement. Raw EEG remains outside the application database.</p><label><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} /> I understand and allow Cortex to record processed EEG values for this learning session.</label><button disabled={!consentChecked || isStarting} onClick={() => void grantConsentAndStart()}>{isStarting ? 'Saving…' : 'Allow and start session'}</button></section>}
        <button className={styles.startBtn} disabled={isStarting} onClick={() => void handleStart()}>
          {isStarting ? 'Starting...' : 'Start session'}
        </button>

        <p className={styles.hint}>
          You can ask your teacher to change your mode at any time.
        </p>
      </div>
    </CalmZoneTemplate>
  )
}
