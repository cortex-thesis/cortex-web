import { Link } from 'react-router-dom'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Volume2, Vibrate, CircleHelp, LogOut, LockKeyhole, Mail, Pencil, Save, ShieldCheck, X } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Button, FLOWER_COLORS, StudentFlowerAvatar, type FlowerColor } from '../../components/atoms'
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
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const cachedPreferences = cachedApiValue<{ notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }>('/student/preferences/')

  const [notifsEnabled, setNotifsEnabled] = useState(cachedPreferences?.notifications_enabled ?? true)
  const [soundEnabled, setSoundEnabled] = useState(cachedPreferences?.sound_enabled ?? true)
  const [hapticsEnabled, setHapticsEnabled] = useState(cachedPreferences?.haptics_enabled ?? false)
  const [flowerColor, setFlowerColor] = useState<FlowerColor>(user?.avatar_color ?? 'pink')
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: '',
    email: '',
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
  const [formBeforeEdit, setFormBeforeEdit] = useState(form)
  const [flowerBeforeEdit, setFlowerBeforeEdit] = useState(flowerColor)
  const [securityStep, setSecurityStep] = useState<'closed' | 'verify' | 'new' | 'confirm'>('closed')
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [securityError, setSecurityError] = useState('')
  const [securityBusy, setSecurityBusy] = useState(false)

  useEffect(() => {
    void api<{ notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }>('/student/preferences/').then((data) => {
      setNotifsEnabled(data.notifications_enabled)
      setSoundEnabled(data.sound_enabled)
      setHapticsEnabled(data.haptics_enabled)
    })
    void api<{ name: string; username?: string; email?: string; avatar_color?: FlowerColor; guardian_name?: string; guardian_email?: string; guardian_contact?: string }>('/student/profile/').then((data) => {
      if (data.avatar_color) setFlowerColor(data.avatar_color)
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

  useEffect(() => {
    if ((location.state as { editProfile?: boolean } | null)?.editProfile) {
      setShowPasswordPrompt(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!showPasswordPrompt && !isEditing && securityStep === 'closed') return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (securityStep !== 'closed') closeSecurity()
        else closeEditor()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPasswordPrompt, isEditing, formBeforeEdit, securityStep])

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
        avatar_color: flowerColor,
      }
      if (form.guardian_name) body.guardian_name = form.guardian_name
      if (form.guardian_email) body.guardian_email = form.guardian_email
      if (form.guardian_contact) body.guardian_contact = form.guardian_contact
      const response = await api<{ name: string; email?: string; username?: string }>('/student/profile/', {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      updateUser({ name: response.name, avatar_color: flowerColor })
      setSaveState('success')
      setIsEditing(false)
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
      setFormBeforeEdit(form)
      setFlowerBeforeEdit(flowerColor)
      setIsEditing(true)
      setShowPasswordPrompt(false)
      setCurrentPassword('')
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify password.')
    } finally {
      setIsVerifying(false)
    }
  }

  function closeEditor() {
    if (isEditing) {
      setForm(formBeforeEdit)
      setFlowerColor(flowerBeforeEdit)
    }
    setIsEditing(false)
    setShowPasswordPrompt(false)
    setCurrentPassword('')
    setError('')
    setSaveState('idle')
  }

  function closeSecurity() {
    setSecurityStep('closed')
    setPasswordForm({ current: '', next: '', confirm: '' })
    setSecurityError('')
    setSecurityBusy(false)
  }

  async function verifySecurityPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSecurityBusy(true)
    setSecurityError('')
    try {
      await api('/student/profile/verify-password/', { method: 'POST', body: JSON.stringify({ password: passwordForm.current }) })
      setSecurityStep('new')
    } catch (verificationError) {
      setSecurityError(verificationError instanceof Error ? verificationError.message : 'Unable to verify password.')
    } finally {
      setSecurityBusy(false)
    }
  }

  function reviewPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSecurityError('')
    if (passwordForm.next.length < 12) {
      setSecurityError('New password must be at least 12 characters.')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setSecurityError('Passwords do not match.')
      return
    }
    setSecurityStep('confirm')
  }

  async function changePassword() {
    setSecurityBusy(true)
    setSecurityError('')
    try {
      await api('/student/profile/change-password/', { method: 'POST', body: JSON.stringify({ current_password: passwordForm.current, new_password: passwordForm.next }) })
      closeSecurity()
      setSaveState('success')
    } catch (passwordError) {
      setSecurityStep('new')
      setSecurityError(passwordError instanceof Error ? passwordError.message : 'Unable to change password.')
      setSecurityBusy(false)
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
        <span className={styles.sectionLabel}>Profile</span>
        <section className={`${styles.card} ${styles.accountCard}`} aria-labelledby="profile-summary-heading">
          <div className={styles.profileIdentity}>
            <StudentFlowerAvatar name={form.name || 'Student'} color={flowerColor} size="lg" />
            <div className={styles.profileName}>
              <h2 id="profile-summary-heading">{form.name || 'Student'}</h2>
              <p>{form.username ? `@${form.username}` : 'Username not set'}</p>
            </div>
            <Button variant="secondary" size="sm" className={styles.editButton} onClick={() => { setShowPasswordPrompt(true); setError(''); setSaveState('idle') }}>
              <Pencil size={15} strokeWidth={1.75} /> Edit profile
            </Button>
          </div>
          <dl className={styles.profileMeta}>
            <div><dt><Mail size={14} /> Email</dt><dd>{form.email || 'Not set'}</dd></div>
            <div><dt><ShieldCheck size={14} /> Guardian</dt><dd>{form.guardian_name || 'Not set'}</dd></div>
          </dl>
        </section>

        <span className={styles.sectionLabel}>Session preferences</span>
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

        <section className={styles.card} aria-label="Help and guidance">
          <Link className={styles.helpLink} data-guide="/student/help" to="/student/help"><CircleHelp size={24} aria-hidden="true" /><span><strong>Help &amp; Guides</strong><small>Explore Cortex, browse guides, or restart your demo.</small></span><span aria-hidden="true">&rarr;</span></Link>
        </section>

        <span className={styles.sectionLabel}>Security &amp; account</span>
        <section className={`${styles.card} ${styles.securityCard}`} aria-labelledby="security-heading">
          <span className={styles.securityIcon}><LockKeyhole size={18} /></span>
          <span className={styles.securityText}><strong id="security-heading">Password</strong><small>Use a strong, unique password for Cortex.</small></span>
          <Button variant="secondary" size="sm" className={styles.securityAction} onClick={() => { setSecurityStep('verify'); setSecurityError('') }}>Change password</Button>
          <div className={styles.securityLinks}>
            <button className={styles.linkRow} onClick={() => navigate('/student/eeg-pairing')}>Manage headband pairing</button>
          </div>
        </section>

        {saveState === 'success' ? <p className={styles.successMessage} role="status">Changes saved</p> : null}

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

      {(showPasswordPrompt || isEditing) && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
            <div className={styles.modalHeader}>
              <div><h2 id="edit-profile-title">{isEditing ? 'Edit profile' : 'Confirm it’s you'}</h2><p>{isEditing ? 'Update your account details.' : 'Enter your password before changing account details.'}</p></div>
              <button className={styles.closeButton} type="button" onClick={closeEditor} aria-label="Close profile editor"><X size={20} /></button>
            </div>
            {showPasswordPrompt && !isEditing && (
              <form className={styles.verifyForm} onSubmit={handleVerifyPassword}>
                <label className={styles.formField}><span>Current password</span><input autoFocus required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
                {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
                <div className={styles.formActions}><Button type="button" variant="secondary" onClick={closeEditor}>Cancel</Button><Button type="submit" loading={isVerifying}>Continue</Button></div>
              </form>
            )}
            {isEditing && (
              <form className={styles.editForm} onSubmit={(event) => { event.preventDefault(); void handleSaveProfile() }}>
                <fieldset className={styles.flowerFieldset}>
                  <legend>Choose your Cortex flower</legend>
                  <p>Your flower is your personal identity across Cortex. Achievement flowers still represent accomplishments.</p>
                  <div className={styles.flowerChoices} role="radiogroup" aria-label="Profile flower color">
                    {FLOWER_COLORS.map((color) => (
                      <button key={color} type="button" role="radio" aria-checked={flowerColor === color} aria-label={`${color} profile flower${flowerColor === color ? ', selected' : ''}`} className={styles.flowerChoice} data-selected={flowerColor === color} onClick={() => setFlowerColor(color)}>
                        <StudentFlowerAvatar name={form.name || 'Student'} color={color} size="md" />
                        <span>{color}</span><span className={styles.selectedMark} aria-hidden="true">{flowerColor === color ? '✓' : ''}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className={styles.formGrid}>
                  <label className={styles.formField}><span>Display name</span><input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className={styles.formField}><span>Username</span><input required value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></label>
                  <label className={styles.formField}><span>Email</span><input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
                  <label className={styles.formField}><span>Guardian name</span><input value={form.guardian_name} onChange={(event) => setForm((current) => ({ ...current, guardian_name: event.target.value }))} /></label>
                  <label className={styles.formField}><span>Guardian email</span><input type="email" value={form.guardian_email} onChange={(event) => setForm((current) => ({ ...current, guardian_email: event.target.value }))} /></label>
                  <label className={styles.formField}><span>Guardian contact</span><input value={form.guardian_contact} onChange={(event) => setForm((current) => ({ ...current, guardian_contact: event.target.value }))} /></label>
                </div>
                {error ? <p className={styles.errorMessage} role="alert">{error}</p> : null}
                <div className={styles.formActions}><Button type="button" variant="secondary" onClick={closeEditor}>Cancel</Button><Button type="submit" loading={saveState === 'saving'}><Save size={16} /> Save changes</Button></div>
              </form>
            )}
          </section>
        </div>
      )}

      {securityStep !== 'closed' && (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="security-dialog-title">
            <div className={styles.modalHeader}>
              <div><h2 id="security-dialog-title">{securityStep === 'confirm' ? 'Change password?' : 'Change password'}</h2><p>{securityStep === 'verify' ? 'Confirm your current password first.' : securityStep === 'confirm' ? 'You’ll use your new password the next time you sign in.' : 'Choose a strong password with at least 12 characters.'}</p></div>
              <button className={styles.closeButton} type="button" onClick={closeSecurity} aria-label="Close password dialog"><X size={20} /></button>
            </div>
            {securityStep === 'verify' && <form className={styles.verifyForm} onSubmit={verifySecurityPassword}>
              <label className={styles.formField}><span>Current password</span><input autoFocus required type="password" autoComplete="current-password" value={passwordForm.current} onChange={(event) => setPasswordForm((current) => ({ ...current, current: event.target.value }))} /></label>
              {securityError ? <p className={styles.errorMessage} role="alert">{securityError}</p> : null}
              <div className={styles.formActions}><Button type="button" variant="secondary" onClick={closeSecurity}>Cancel</Button><Button type="submit" loading={securityBusy}>Continue</Button></div>
            </form>}
            {securityStep === 'new' && <form className={styles.verifyForm} onSubmit={reviewPasswordChange}>
              <label className={styles.formField}><span>New password</span><input autoFocus required minLength={12} type="password" autoComplete="new-password" value={passwordForm.next} onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))} /></label>
              <label className={styles.formField}><span>Confirm new password</span><input required minLength={12} type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} /></label>
              {securityError ? <p className={styles.errorMessage} role="alert">{securityError}</p> : null}
              <div className={styles.formActions}><Button type="button" variant="secondary" onClick={closeSecurity}>Cancel</Button><Button type="submit">Review change</Button></div>
            </form>}
            {securityStep === 'confirm' && <div className={styles.confirmChange}>
              <p>This will update your Cortex sign-in password.</p>
              {securityError ? <p className={styles.errorMessage} role="alert">{securityError}</p> : null}
              <div className={styles.formActions}><Button type="button" variant="secondary" onClick={() => setSecurityStep('new')}>Go back</Button><Button type="button" loading={securityBusy} onClick={() => void changePassword()}>Change password</Button></div>
            </div>}
          </section>
        </div>
      )}
    </PlayfulZoneTemplate>
  )
}
