import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Brain, Hand, Headphones, X } from 'lucide-react'
import { LogoAnimation } from '../../components/atoms'
import { PlayfulZoneTemplate } from '../../components/templates'
import styles from './Splash.module.css'
import { useAuthStore } from '../../store/authStore'
import { hasSeenOnboarding } from '../../features/help/persistence'
import { introductionKey, readIntroduction, saveIntroduction, hasPlayedIntroduction, rememberIntroductionAnimation } from './introductionPersistence'

type AccountRole = 'student' | 'teacher'

interface SplashStep {
  icon: ComponentType<{ className?: string; size?: number }>
  title: string
  sub: string
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
  },
  {
    icon: Headphones,
    title: 'Join your class',
    sub: 'Enter the code your teacher gave you to join your class.',
  },
  {
    icon: Brain,
    title: 'Put on your headband',
    sub: "Wear your Muse headband comfortably on your forehead. We'll connect it before your session starts.",
  },
]

export default function Splash() {
  const user = useAuthStore(state => state.user)
  const initialized = useAuthStore(state => state.isInitialized)
  const authenticated = useAuthStore(state => state.isAuthenticated)
  if (!initialized) return null
  if (!authenticated || !user) return <Navigate to="/" replace />
  if (user.role !== 'student' && user.role !== 'teacher') return <Navigate to={user.role === 'school_admin' ? '/school-admin/dashboard' : '/admin/dashboard'} replace />
  return <Welcome key={`${user.id}:${user.role}`} id={user.id} role={user.role} />
}

function Welcome({ id, role }: { id: string; role: AccountRole }) {
  const navigate = useNavigate()
  const key = introductionKey(id, role)
  const [progress, setProgress] = useState(() => hasSeenOnboarding(id, role) ? { step: 0, status: 'completed' as const } : readIntroduction(key))
  const [showLogo, setShowLogo] = useState(() => !hasPlayedIntroduction(key))
  const [animationDone, setAnimationDone] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const lastAction = useRef(0)
  const hasNavigated = useRef(false)
  const step = progress.step

  useEffect(() => {
    if (!animationDone) return
    const timer = setTimeout(() => {
      rememberIntroductionAnimation(key)
      setShowLogo(false)
    }, 650)
    return () => clearTimeout(timer)
  }, [animationDone, key])

  useEffect(() => { if (!showLogo) heading.current?.focus() }, [showLogo, step])

  function finish(status: 'completed' | 'dismissed') {
    if (hasNavigated.current) return
    hasNavigated.current = true
    saveIntroduction(key, { step, status })
    navigate(ROLE_DESTINATIONS[role], { replace: true })
  }

  function continueStudentOnboarding() {
    const now = Date.now()
    if (now - lastAction.current < 400 || hasNavigated.current) return
    lastAction.current = now
    if (step === STUDENT_STEPS.length - 1) { finish('completed'); return }
    const next = { step: step + 1 }
    saveIntroduction(key, next)
    setProgress(next)
  }

  if (showLogo) {
    return (
      <div className={styles.logoScreen} data-testid="cortex-animation">
        <div className={styles.logoBlob1} aria-hidden="true" />
        <div className={styles.logoBlob2} aria-hidden="true" />
        <LogoAnimation loop={false} onComplete={() => setAnimationDone(true)} />
      </div>
    )
  }

  if (role === 'teacher' || progress.status) return <Navigate to={ROLE_DESTINATIONS[role]} replace />

  const current = STUDENT_STEPS[step]
  const StepIcon = current.icon

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.content}>
        <button type="button" className={styles.closeBtn} aria-label="Skip introduction" onClick={() => finish('dismissed')}><X size={22} aria-hidden="true" /></button>
        <div className={styles.stepArea}>
          <div className={styles.stepEmoji} aria-hidden="true" key={step}>
            <StepIcon className={styles.icon} size={48} />
          </div>
          <div className={styles.textBlock}>
            <h1 ref={heading} tabIndex={-1} className={styles.stepTitle}>{current.title}</h1>
            <p className={styles.stepSub}>{current.sub}</p>
          </div>
        </div>

        <div className={styles.pagination} role="group" aria-label={`Student introduction: step ${step + 1} of ${STUDENT_STEPS.length}`}>
          {STUDENT_STEPS.map((item, index) => <button type="button" key={item.title} aria-label={`Go to step ${index + 1} of ${STUDENT_STEPS.length}`} aria-current={index === step ? 'step' : undefined} className={`${styles.dot} ${index === step ? styles.dotActive : ''}`} onClick={() => { const next = { step: index }; saveIntroduction(key, next); setProgress(next) }} />)}
        </div>

        <div className={styles.actions}>
          <button className={styles.ctaBtn} onClick={continueStudentOnboarding}>
            {step === STUDENT_STEPS.length - 1 ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
