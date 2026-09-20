import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Users, ShieldAlert, LogOut } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { Button } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { mockTeacher } from '../../mocks'
import { api } from '../../lib/api'
import styles from './Settings.module.css'

interface ToggleRowProps {
  icon: React.ReactNode
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ icon, label, sub, checked, onChange }: ToggleRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.rowIcon}>{icon}</span>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowSub}>{sub}</span>
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={styles.toggle}
        data-on={checked}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [profile, setProfile] = useState({ name: '', username: '', email: '', password: '' })
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    void api<{ name: string; username?: string; email?: string }>('/teacher/profile/').then((data) => {
      setProfile((current) => ({ ...current, name: data.name ?? '', username: data.username ?? '', email: data.email ?? '' }))
    })
  }, [])

  const [notifyOnOverstim, setNotifyOnOverstim] = useState(true)
  const [notifyOnDisconnect, setNotifyOnDisconnect] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  async function verifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsVerifying(true)
    setMessage(null)
    try {
      await api('/teacher/profile/verify-password/', { method: 'POST', body: JSON.stringify({ password: currentPassword }) })
      setIsEditing(true)
      setShowPasswordPrompt(false)
      setCurrentPassword('')
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to verify password.' })
    } finally {
      setIsVerifying(false)
    }
  }

  async function saveProfile() {
    setIsSaving(true)
    setMessage(null)
    try {
      const body: Record<string, string> = { name: profile.name, username: profile.username, email: profile.email }
      if (profile.password.trim()) body.password = profile.password.trim()
      const updated = await api<{ name: string; username?: string; email?: string }>('/teacher/profile/', { method: 'PATCH', body: JSON.stringify(body) })
      setProfile((current) => ({ ...current, name: updated.name, username: updated.username ?? current.username, email: updated.email ?? current.email, password: '' }))
      setMessage({ kind: 'success', text: 'Profile updated' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Unable to update profile.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.content}>
        <h1 className={styles.title}>Settings</h1>

        <div className={styles.grid}>
          <div className={styles.column}>
            <span className={styles.sectionLabel}>Alerts</span>
            <div className={styles.card}>
              <ToggleRow
                icon={
                  <ShieldAlert size={16} strokeWidth={1.75} color="#D85A30" />
                }
                label="Overstimulation alerts"
                sub="Notify me the moment a student is flagged overstimulated"
                checked={notifyOnOverstim}
                onChange={setNotifyOnOverstim}
              />
              <div className={styles.divider} />
              <ToggleRow
                icon={<Bell size={16} strokeWidth={1.75} color="#D4537E" />}
                label="Signal disconnect alerts"
                sub="Notify me if a student's headband loses signal"
                checked={notifyOnDisconnect}
                onChange={setNotifyOnDisconnect}
              />
              <div className={styles.divider} />
              <ToggleRow
                icon={<Users size={16} strokeWidth={1.75} color="#534AB7" />}
                label="Weekly class digest"
                sub="A summary of class focus trends every Monday"
                checked={weeklyDigest}
                onChange={setWeeklyDigest}
              />
            </div>
          </div>

          <div className={styles.column}>
            <span className={styles.sectionLabel}>Account</span>
            <div className={styles.card} style={{ display: 'grid', gap: 12, padding: 16 }}>
              {!isEditing && <><div><strong>Display name</strong><div>{profile.name || 'Not set'}</div></div><div><strong>Username</strong><div>{profile.username || 'Not set'}</div></div><div><strong>Email</strong><div>{profile.email || 'Not set'}</div></div></>}
              {isEditing && <><label className={styles.formField}><span>Display name</span><input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label><label className={styles.formField}><span>Username</span><input value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} /></label><label className={styles.formField}><span>Email</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><label className={styles.formField}><span>New password</span><input type="password" value={profile.password} onChange={(event) => setProfile({ ...profile, password: event.target.value })} placeholder="Leave blank to keep current password" /></label></>}
              {!isEditing && !showPasswordPrompt && <Button onClick={() => { setMessage(null); setShowPasswordPrompt(true) }} fullWidth>Edit profile</Button>}
              {showPasswordPrompt && <form onSubmit={verifyPassword} className={styles.formField}><span>Enter your current password to edit</span><input autoFocus required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><div className={styles.formActions}><Button type="submit" loading={isVerifying}>Verify password</Button><Button type="button" variant="secondary" onClick={() => { setShowPasswordPrompt(false); setCurrentPassword(''); setMessage(null) }}>Cancel</Button></div></form>}
              {isEditing && <Button onClick={saveProfile} fullWidth loading={isSaving}>Save profile</Button>}
              {message && <p className={`${styles.message} ${message.kind === 'error' ? styles.error : styles.success}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
            </div>

            <Button
              variant="danger"
              onClick={handleLogout}
              className={styles.logoutBtn}
            >
              <LogOut size={16} strokeWidth={1.75} />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}
