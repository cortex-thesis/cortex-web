import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Waves, Zap, ArrowRight } from 'lucide-react'
import { OverlayTemplate } from '../../components/templates'
import { StateBadge } from '../../components/atoms'
import type { CognitiveState } from '../../constants/states'
import styles from './SwitchingModes.module.css'

// Duration before auto-advancing to target screen
const TRANSITION_DURATION = 1200

interface SwitchingState {
  from: 'focus' | 'relax'
  to: 'focus' | 'relax'
  reason?: 'eeg_triggered' | 'teacher_override'
}

const MESSAGES: Record<
  string,
  { title: string; sub: string; icon: React.ReactNode }
> = {
  'focus-to-relax': {
    title: 'Your brain needs a break.',
    sub: "Switching to Relax Mode. Let's slow things down.",
    icon: <Waves size={36} color="#378ADD" />,
  },
  'relax-to-focus': {
    title: "You're ready to focus again.",
    sub: 'Switching back to Focus Mode. You got this.',
    icon: <Zap size={36} color="#1D9E75" />,
  },
  'focus-to-relax-override': {
    title: 'Your teacher switched your mode.',
    sub: "Time for a short break. Let's slow things down.",
    icon: <Waves size={36} color="#378ADD" />,
  },
  'relax-to-focus-override': {
    title: 'Your teacher switched your mode.',
    sub: "Back to Focus Mode. Let's keep going.",
    icon: <Zap size={36} color="#1D9E75" />,
  },
}

function getTargetState(to: 'focus' | 'relax'): CognitiveState {
  return to === 'focus' ? 'focused' : 'relaxed'
}

function getProgressColor(to: 'focus' | 'relax'): string {
  return to === 'focus' ? '#1D9E75' : '#378ADD'
}

function getCircleBg(to: 'focus' | 'relax'): string {
  return to === 'focus'
    ? 'linear-gradient(135deg, #E1F5EE 0%, #A8E8D0 100%)'
    : 'linear-gradient(135deg, #E6F1FB 0%, #B8D8F8 100%)'
}

function getCircleBorder(to: 'focus' | 'relax'): string {
  return to === 'focus' ? '#1D9E75' : '#378ADD'
}

export default function SwitchingModes() {
  const navigate = useNavigate()
  const location = useLocation()
  const [progress, setProgress] = useState(0)

  const state = (location.state as SwitchingState) ?? {
    from: 'focus',
    to: 'relax',
    reason: 'eeg_triggered',
  }

  const { from, to, reason } = state
  const messageKey =
    reason === 'teacher_override'
      ? `${from}-to-${to}-override`
      : `${from}-to-${to}`

  const message = MESSAGES[messageKey] ?? MESSAGES[`${from}-to-${to}`]
  const targetState = getTargetState(to)
  const fromState: CognitiveState = from === 'focus' ? 'focused' : 'relaxed'
  const progressColor = getProgressColor(to)

  // Animate progress bar
  useEffect(() => {
    const steps = 60
    const interval = TRANSITION_DURATION / steps
    let current = 0

    const id = setInterval(() => {
      current += 1
      setProgress((current / steps) * 100)
      if (current >= steps) {
        clearInterval(id)
      }
    }, interval)

    return () => clearInterval(id)
  }, [])

  // Auto-navigate after duration
  useEffect(() => {
    const id = setTimeout(() => {
      navigate(to === 'focus' ? '/student/focus' : '/student/relax', {
        replace: true,
      })
    }, TRANSITION_DURATION)

    return () => clearInterval(id)
  }, [to, navigate])

  return (
    <OverlayTemplate>
      <div className={styles.wrapper}>
        <div className={styles.progressPill}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{
                width: `${progress}%`,
                background: progressColor,
              }}
            />
          </div>
          <span className={styles.progressLabel}>Adjusting...</span>
        </div>

        <div className={styles.transitionRow}>
          <StateBadge state={fromState} size="sm" />
          <span className={styles.arrow} aria-hidden="true">
            <ArrowRight size={16} />
          </span>
          <StateBadge state={targetState} size="sm" />
        </div>

        <div
          className={styles.circle}
          style={{
            background: getCircleBg(to),
            borderColor: getCircleBorder(to),
          }}
          aria-hidden="true"
        >
          <span className={styles.circleIcon}>{message.icon}</span>
        </div>

        <div className={styles.message}>
          <h2 className={styles.title}>{message.title}</h2>
          <p className={styles.sub}>{message.sub}</p>
        </div>

        <div className={styles.adjusting} aria-live="polite">
          <span>Adjusting your content</span>
          <div className={styles.dots} aria-hidden="true">
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        </div>
      </div>
    </OverlayTemplate>
  )
}
