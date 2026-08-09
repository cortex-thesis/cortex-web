import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hand, Headphones, Brain, type LucideIcon } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { LogoAnimation } from '../../components/atoms'
import styles from './Splash.module.css'

interface SplashStep {
  icon: LucideIcon
  title: string
  sub: string
  cta: string
}

const STEPS: SplashStep[] = [
  {
    icon: Hand,
    title: 'Hi! Ready to learn today?',
    sub: "Let's get your headband on and start a fun learning session with your class.",
    cta: "Let's go",
  },
  {
    icon: Headphones,
    title: 'Join your class',
    sub: 'Enter the code your teacher gave you, or scan the QR code to join your class.',
    cta: 'Join a class',
  },
  {
    icon: Brain,
    title: 'Put on your headband',
    sub: "Wear your Muse headband comfortably on your forehead. We'll connect it before your session starts.",
    cta: "I'm ready!",
  },
]

export default function Splash() {
  const navigate = useNavigate()
  const [showLogo, setShowLogo] = useState(true)
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const StepIcon = current.icon

  function handleNext() {
    if (isLast) {
      navigate('/student/home')
    } else {
      setStep((s) => s + 1)
    }
  }

  function handleSkip() {
    navigate('/student/home')
  }

  if (showLogo) {
    return (
      <div className={styles.logoScreen}>
        <div className={styles.logoBlob1} aria-hidden="true" />
        <div className={styles.logoBlob2} aria-hidden="true" />
        <LogoAnimation
          onComplete={() => {
            setTimeout(() => setShowLogo(false), 600)
          }}
        />
      </div>
    )
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.content}>
        <div className={styles.stepArea}>
          <div className={styles.stepEmoji} aria-hidden="true" key={step}>
            <StepIcon className={styles.icon} size={48} />
          </div>

          <div className={styles.textBlock}>
            <h1 className={styles.stepTitle}>{current.title}</h1>
            <p className={styles.stepSub}>{current.sub}</p>
          </div>
        </div>

        <div
          className={styles.pagination}
          role="tablist"
          aria-label="Onboarding steps"
        >
          {STEPS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`Step ${i + 1} of ${STEPS.length}`}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.ctaBtn}
            onClick={handleNext}
            aria-label={current.cta}
          >
            {current.cta}
          </button>

          {!isLast && (
            <button className={styles.skipBtn} onClick={handleSkip}>
              Skip for now
            </button>
          )}
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
