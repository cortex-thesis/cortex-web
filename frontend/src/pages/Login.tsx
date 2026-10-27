import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { PlayfulZoneTemplate } from '../components/templates'
import { Button, Logo } from '../components/atoms'
import { InputField } from '../components/molecules'
import { useAuthStore } from '../store/authStore'
import styles from './student/Login.module.css'

const TEST_ACCOUNTS = [
  { label: 'Super Administrator', email: 'super-admin@cortex.test', password: 'super-admin-demo-2026!' },
  { label: 'School Administrator', email: 'school-admin@example-school.test', password: 'admin-demo-2026!' },
  { label: 'Teacher', email: 'teacher@example-school.test', password: 'teacher-demo-2026!' },
  { label: 'Student', email: 'student@example-school.test', password: 'student-demo-2026!' },
]

export default function UnifiedLogin() {
  const navigate = useNavigate()
  const pending = useRef(false)
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const login = useAuthStore((state) => state.login)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending.current) return
    const errors = { email: email.trim() ? '' : 'Enter your username or email address.', password: password.trim() ? '' : 'Enter your password.' }
    setFieldErrors(errors)
    setError('')
    if (errors.email || errors.password) return
    pending.current = true
    setIsLoading(true)
    try {
      const user = await login({ email: email.trim(), password })
      if (user.role === 'super_admin') navigate('/admin/dashboard', { replace: true })
      else if (user.role === 'school_admin') navigate('/school-admin/dashboard', { replace: true })
      else navigate('/welcome', { replace: true, state: { role: user.role } })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      pending.current = false
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
              Sign in to continue to your workspace.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <InputField
              label="Username or email address"
              type="text"
              placeholder="Enter your username or email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              leftIcon={<Mail size={16} strokeWidth={1.75} />}
              fieldState={fieldErrors.email ? 'error' : 'default'}
              errorText={fieldErrors.email || undefined}
              disabled={isLoading}
              required
              autoComplete="username"
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
              fieldState={fieldErrors.password ? 'error' : 'default'}
              errorText={fieldErrors.password || undefined}
              disabled={isLoading}
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

            {error && <p role="alert">{error}</p>}
            <Button type="submit" fullWidth loading={isLoading}>
              Continue
            </Button>

            <button
              type="button"
              className={styles.joinLink}
              onClick={() => navigate('/register')}
              style={{ marginTop: 12, width: '100%' }}
            >
              Create an account
            </button>
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
