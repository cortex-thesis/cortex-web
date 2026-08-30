import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { PlayfulZoneTemplate } from '../components/templates'
import { Button, Logo } from '../components/atoms'
import { InputField } from '../components/molecules'
import { useAuthStore } from '../store/authStore'
import styles from './student/Login.module.css'

const TEST_ACCOUNTS = [
  { label: 'Administrator', email: 'super@cortex.edu', password: 'superusertest' },
  { label: 'Student', email: 'student@cortex.edu', password: 'studenttest' },
  { label: 'Teacher', email: 'teacher@cortex.edu', password: 'teachertest' },
]

export default function UnifiedLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    setIsLoading(true)
    try {
      const user = await login({ email: email.trim(), password })
      if (user.role === 'admin') navigate('/admin/dashboard', { replace: true })
      else navigate('/welcome', { replace: true, state: { role: user.role } })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <Logo variant="horizontal" height={40} className={styles.logo} />

          <div className={styles.heading}>
            <h1 className={styles.title}>Welcome to Cortex</h1>
            <p className={styles.subtitle}>
              Sign in and we’ll take you to the right workspace.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <InputField
              label="Email address"
              type="email"
              placeholder="you@cortex.edu"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              leftIcon={<Mail size={16} strokeWidth={1.75} />}
              fieldState={error ? 'error' : 'default'}
              required
              autoComplete="email"
            />
            <InputField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              leftIcon={<Lock size={16} strokeWidth={1.75} />}
              fieldState={error ? 'error' : 'default'}
              errorText={error || undefined}
              required
              autoComplete="current-password"
            />

            <button
              type="button"
              className={styles.forgotBtn}
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </button>

            <Button type="submit" fullWidth loading={isLoading}>
              Continue
            </Button>
          </form>

          <div className={styles.divider}>
            <span>test accounts</span>
          </div>

          <div className={styles.form}>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className={styles.joinLink}
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError('')
                }}
              >
                <ShieldCheck size={12} />
                {account.label}: {account.email} / {account.password}
              </button>
            ))}
          </div>

        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
