import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Volume2, Vibrate, LogOut, UserCircle2, Mail, CheckCircle2 } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Button } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { api, cachedApiValue } from '../../lib/api'
import styles from './Settings.module.css'

interface ToggleRowProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  sub: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({
  icon,
  iconBg,
  label,
  sub,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.rowIcon} style={{ background: iconBg }}>
        {icon}
      </span>
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
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const cachedPreferences = cachedApiValue<{ notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }>('/student/preferences/')

  const [notifsEnabled, setNotifsEnabled] = useState(cachedPreferences?.notifications_enabled ?? true)
  const [soundEnabled, setSoundEnabled] = useState(cachedPreferences?.sound_enabled ?? true)
  const [hapticsEnabled, setHapticsEnabled] = useState(cachedPreferences?.haptics_enabled ?? false)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: '',
    email: '',
    password: '',
    guardian_name: '',
    guardian_email: '',
    guardian_contact: '',
  })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success'>('idle')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    void api<{ notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }>('/student/preferences/').then((data) => {
      setNotifsEnabled(data.notifications_enabled)
      setSoundEnabled(data.sound_enabled)
      setHapticsEnabled(data.haptics_enabled)
    })
    void api<{ name: string; username?: string; email?: string; guardian_name?: string; guardian_email?: string; guardian_contact?: string }>('/student/profile/').then((data) => {
      setForm((current) => ({
        ...current,
        name: data.name ?? current.name,
        username: data.username ?? '',
        email: data.email ?? '',
        guardian_name: data.guardian_name ?? '',
        guardian_email: data.guardian_email ?? '',
        guardian_contact: data.guardian_contact ?? '',
      }))
    })
  }, [])

  function updatePreference(field: string, value: boolean) {
    void api('/student/preferences/', { method: 'PATCH', body: JSON.stringify({ [field]: value }) })
  }

  async function handleSaveProfile() {
    setSaveState('saving')
    setError('')
    try {
      const body: Record<string, string> = {
        name: form.name,
        username: form.username,
        email: form.email,
      }
      if (form.guardian_name) body.guardian_name = form.guardian_name
      if (form.guardian_email) body.guardian_email = form.guardian_email
      if (form.guardian_contact) body.guardian_contact = form.guardian_contact
      if (form.password.trim()) body.password = form.password.trim()
      const response = await api<{ name: string; email?: string; username?: string }>('/student/profile/', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      updateUser({ name: response.name })
      setSaveState('success')
      setForm((current) => ({ ...current, password: '' }))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile.')
      setSaveState('idle')
    }
  }

  async function handleVerifyPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsVerifying(true)
    setError('')
    try {
      await api('/student/profile/verify-password/', {
        method: 'POST',
        body: JSON.stringify({ password: currentPassword }),
      })
      setIsEditing(true)
      setShowPasswordPrompt(false)
      setCurrentPassword('')
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify password.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className={styles.title}>Settings</h1>
        <span className={styles.spacer} />
      </div>

      <div className={styles.body}>
        <span className={styles.sectionLabel}>Session</span>
        <div className={styles.card}>
          <ToggleRow
            icon={<Bell size={16} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
            label="Notifications"
            sub="Class updates, streaks, and badges"
            checked={notifsEnabled}
            onChange={(value) => { setNotifsEnabled(value); updatePreference('notifications_enabled', value) }}
          />
          <div className={styles.divider} />
          <ToggleRow
            icon={<Volume2 size={16} strokeWidth={1.75} color="#1D9E75" />}
            iconBg="#E1F5EE"
            label="Sound"
            sub="Task and alert sounds during sessions"
            checked={soundEnabled}
            onChange={(value) => { setSoundEnabled(value); updatePreference('sound_enabled', value) }}
          />
          <div className={styles.divider} />
          <ToggleRow
            icon={<Vibrate size={16} strokeWidth={1.75} color="#D4537E" />}
            iconBg="#FBEAF0"
            label="Vibration"
            sub="Gentle buzz for re-engagement prompts"
            checked={hapticsEnabled}
            onChange={(value) => { setHapticsEnabled(value); updatePreference('haptics_enabled', value) }}
          />
        </div>

        <span className={styles.sectionLabel}>Account</span>
        <div className={`${styles.card} ${styles.accountCard}`}>
          <div className={styles.profileDetails}>
            <div className={styles.profileHeading}><UserCircle2 size={16} /><strong>Profile</strong></div>
            {!isEditing && <>
              <div className={styles.profileField}><strong>Display name</strong><div className={styles.profileValue}>{form.name || 'Not set'}</div></div>
              <div className={styles.profileField}><strong>Username</strong><div className={styles.profileValue}>{form.username || 'Not set'}</div></div>
              <div className={styles.profileField}><strong>Email</strong><div className={styles.profileValue}>{form.email || 'Not set'}</div></div>
              <div className={styles.profileField}><strong>Guardian</strong><div className={styles.profileValue}>{form.guardian_name || 'Not set'}</div></div>
            </>}
            {isEditing && <>
              <label className={styles.formField}><span>Display name</span><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className={styles.formField}><span>Username</span><input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></label>
              <label className={styles.formField}><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label className={styles.formField}><span>New password</span><input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Leave blank to keep current password" /></label>
              <label className={styles.formField}><span>Guardian name</span><input value={form.guardian_name} onChange={(event) => setForm((current) => ({ ...current, guardian_name: event.target.value }))} /></label>
              <label className={styles.formField}><span>Guardian email</span><input type="email" value={form.guardian_email} onChange={(event) => setForm((current) => ({ ...current, guardian_email: event.target.value }))} /></label>
              <label className={styles.formField}><span>Guardian contact</span><input value={form.guardian_contact} onChange={(event) => setForm((current) => ({ ...current, guardian_contact: event.target.value }))} /></label>
            </>}
          </div>
          {!isEditing && !showPasswordPrompt && <Button onClick={() => { setShowPasswordPrompt(true); setError('') }} fullWidth>Edit profile</Button>}
          {showPasswordPrompt && <form className={styles.verifyForm} onSubmit={handleVerifyPassword}><label className={styles.formField}><span>Enter your current password to edit</span><input autoFocus required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><div className={styles.formActions}><Button type="submit" loading={isVerifying}>Verify password</Button><Button type="button" variant="secondary" onClick={() => { setShowPasswordPrompt(false); setCurrentPassword(''); setError('') }}>Cancel</Button></div></form>}
          {error ? <p style={{ color: '#d4537e', margin: 0 }}>{error}</p> : null}
          {saveState === 'success' ? <p style={{ color: '#1d9e75', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={16} /> Profile updated</p> : null}
          {isEditing && <Button onClick={handleSaveProfile} fullWidth loading={saveState === 'saving'}><Mail size={16} strokeWidth={1.75} />Save profile</Button>}
          <div className={styles.divider} />
          <button
            className={styles.linkRow}
            onClick={() => navigate('/student/eeg-pairing')}
          >
            Manage headband pairing
          </button>
        </div>

        <Button
          variant="danger"
          fullWidth
          onClick={handleLogout}
          className={styles.logoutBtn}
        >
          <LogOut size={16} strokeWidth={1.75} />
          Log out
        </Button>
      </div>
    </PlayfulZoneTemplate>
  )
}
