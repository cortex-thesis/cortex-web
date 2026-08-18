import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Button, Logo } from '../../components/atoms'
import { InputField } from '../../components/molecules'
import { useAuthStore } from '../../store/authStore'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const storeError = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()
    try {
      await login({ email, password })
      navigate('/student/home')
    } catch {
      // error surfaces from storeError below
    }
  }

  return (
    <PlayfulZoneTemplate>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <Logo variant="horizontal" height={40} className={styles.logo} />

          <div className={styles.heading}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Log in to continue your session</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <InputField
              label="Email"
              type="email"
              placeholder="you@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} strokeWidth={1.75} />}
              fieldState={storeError ? 'error' : 'default'}
              required
              autoComplete="email"
            />

            <InputField
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} strokeWidth={1.75} />}
              fieldState={storeError ? 'error' : 'default'}
              errorText={storeError ?? undefined}
              required
              autoComplete="current-password"
            />

            <button
              type="button"
              className={styles.forgotBtn}
              onClick={() => navigate('/student/forgot-password')}
            >
              Forgot password?
            </button>

            <Button type="submit" fullWidth loading={isLoading}>
              Log in
            </Button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            className={styles.joinLink}
            onClick={() => navigate('/student/join-class')}
          >
            Join a class with a code instead
          </button>
        </div>
      </div>
    </PlayfulZoneTemplate>
  )
}
