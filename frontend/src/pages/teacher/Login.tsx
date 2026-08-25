import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, GraduationCap } from 'lucide-react'
import { Logo } from '../../components/atoms'
import { InputField } from '../../components/molecules'
import { validateEmail, validatePassword } from '../../utils/validators'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailState, setEmailState] = useState<'default' | 'error'>('default')
  const [passwordState, setPasswordState] = useState<'default' | 'error'>(
    'default'
  )
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  function validate(): boolean {
    const eResult = validateEmail(email)
    const pResult = validatePassword(password)

    setEmailState(eResult.valid ? 'default' : 'error')
    setEmailError(eResult.message)
    setPasswordState(pResult.valid ? 'default' : 'error')
    setPasswordError(pResult.message)

    return eResult.valid && pResult.valid
  }

  async function handleLogin() {
    setAuthError('')
    if (!validate()) return

    setIsLoading(true)

    await new Promise((r) => setTimeout(r, 1000))

    if (email === 'teacher@cortex.edu' && password === 'password123') {
      navigate('/teacher/dashboard', { replace: true })
    } else {
      setAuthError('Invalid email or password. Please try again.')
      setEmailState('error')
      setPasswordState('error')
    }

    setIsLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className={styles.screen}>
      <div className={styles.bgBlob1} aria-hidden="true" />
      <div className={styles.bgBlob2} aria-hidden="true" />

      <div className={styles.card} role="main" aria-label="Teacher login">
        <div className={styles.header}>
          <Logo variant="horizontal" height={28} />
          <span className={styles.roleBadge}>
            <GraduationCap size={15} strokeWidth={1.75} /> Teacher portal
          </span>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.sub}>
            Sign in to monitor and manage your class sessions.
          </p>
        </div>

        {authError && (
          <div className={styles.authError} role="alert">
            {authError}
          </div>
        )}

        <div className={styles.fields} onKeyDown={handleKeyDown}>
          <InputField
            label="Email address"
            type="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailState('default')
              setAuthError('')
            }}
            fieldState={emailState}
            errorText={emailError}
            leftIcon={<Mail size={15} strokeWidth={1.75} />}
            required
            autoComplete="email"
          />

          <div className={styles.passwordField}>
            <InputField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordState('default')
                setAuthError('')
              }}
              fieldState={passwordState}
              errorText={passwordError}
              leftIcon={<Lock size={15} strokeWidth={1.75} />}
              required
              autoComplete="current-password"
            />
            <button
              className={styles.forgotBtn}
              onClick={() => navigate('/teacher/forgot-password')}
              type="button"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          className={styles.loginBtn}
          onClick={handleLogin}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className={styles.divider}>
          <span className={styles.divLine} />
          <span className={styles.divText}>new to Cortex?</span>
          <span className={styles.divLine} />
        </div>

        <p className={styles.hint}>
          Contact your school administrator to{' '}
          <button
            className={styles.hintLink}
            type="button"
            onClick={() => navigate('/teacher/register')}
          >
            create an account
          </button>
        </p>

        <p className={styles.testHint}>
          Test: <strong>teacher@cortex.edu</strong> /{' '}
          <strong>password123</strong>
        </p>
      </div>
    </div>
  )
}
