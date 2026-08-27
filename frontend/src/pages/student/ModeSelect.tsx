import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CalmZoneTemplate } from '../../components/templates'
import styles from './ModeSelect.module.css'

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
  const [selected, setSelected] = useState<SessionMode>('teacher')

  function handleStart() {
    if (selected === 'free') {
      navigate('/student/free-lesson-select')
      return
    }

    navigate('/student/focus', {
      replace: true,
      state: { mode: selected },
    })
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

        <button className={styles.startBtn} onClick={handleStart}>
          Start session
        </button>

        <p className={styles.hint}>
          You can ask your teacher to change your mode at any time.
        </p>
      </div>
    </CalmZoneTemplate>
  )
}
