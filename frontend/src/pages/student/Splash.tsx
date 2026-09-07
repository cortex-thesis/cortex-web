import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brain, Hand, Headphones } from 'lucide-react'
import { LogoAnimation } from '../../components/atoms'
import { PlayfulZoneTemplate } from '../../components/templates'
import styles from './Splash.module.css'

type AccountRole = 'student' | 'teacher'

interface SplashStep {
  icon: ComponentType<{ className?: string; size?: number }>
  title: string
  sub: string
  cta: string
}

const ROLE_DESTINATIONS: Record<AccountRole, string> = {
  student: '/student/home',
  teacher: '/teacher/dashboard',
}

const STUDENT_STEPS: SplashStep[] = [
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
  const location = useLocation()
  const hasNavigated = useRef(false)
  const role = (location.state as { role?: AccountRole } | null)?.role
  const [showLogo, setShowLogo] = useState(true)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!role) navigate('/', { replace: true })
  }, [navigate, role])

  function finishAnimation() {
    if (!role || hasNavigated.current) return

    if (role === 'student') {
      setTimeout(() => setShowLogo(false), 650)
      return
    }

    hasNavigated.current = true
    setTimeout(
      () => navigate(ROLE_DESTINATIONS[role], { replace: true }),
      650
    )
  }

  function continueStudentOnboarding() {
    if (step === STUDENT_STEPS.length - 1) {
      navigate('/student/home', { replace: true })
      return
    }
    setStep((current) => current + 1)
  }

  if (showLogo) {
    return (
      <div className={styles.logoScreen}>
        <div className={styles.logoBlob1} aria-hidden="true" />
        <div className={styles.logoBlob2} aria-hidden="true" />
        <LogoAnimation loop={false} onComplete={finishAnimation} />
      </div>
    )
  }

  const current = STUDENT_STEPS[step]
  const StepIcon = current.icon
  const isLast = step === STUDENT_STEPS.length - 1

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
          aria-label="Student introduction"
        >
          {STUDENT_STEPS.map((item, index) => (
            <button
              key={item.title}
              role="tab"
              aria-selected={index === step}
              aria-label={`Step ${index + 1} of ${STUDENT_STEPS.length}`}
              className={`${styles.dot} ${index === step ? styles.dotActive : ''}`}
              onClick={() => setStep(index)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.ctaBtn} onClick={continueStudentOnboarding}>
            {current.cta}
          </button>
          {!isLast && (
            <button
              className={styles.skipBtn}
              onClick={() => navigate('/student/home', { replace: true })}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
