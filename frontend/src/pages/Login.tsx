import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { PlayfulZoneTemplate } from '../components/templates'
import { Button, Logo } from '../components/atoms'
import { InputField } from '../components/molecules'
import styles from './student/Login.module.css'

type AccountRole = 'student' | 'teacher' | 'admin'

const DEMO_ACCOUNTS: Record<string, AccountRole> = {
  'student@cortex.edu': 'student',
  'teacher@cortex.edu': 'teacher',
  'admin@cortex.edu': 'admin',
}

export default function UnifiedLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const role = DEMO_ACCOUNTS[email.trim().toLowerCase()]
    if (!role || password !== 'password123') {
      setError('Invalid account. Use one of the prototype accounts below.')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 450))
    navigate('/welcome', { replace: true, state: { role } })
  }

  function selectAccount(accountEmail: string) {
    setEmail(accountEmail)
    setPassword('password123')
    setError('')
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
            <span>prototype accounts</span>
          </div>

          <div className={styles.form}>
            {Object.keys(DEMO_ACCOUNTS).map((accountEmail) => (
              <button
                key={accountEmail}
                type="button"
                className={styles.joinLink}
                onClick={() => selectAccount(accountEmail)}
              >
                <ShieldCheck size={12} /> {accountEmail}
              </button>
            ))}
          </div>

          <p className={styles.subtitle}>
            All prototype accounts use <strong>password123</strong>
          </p>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
