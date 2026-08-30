import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Volume2, Vibrate, LogOut } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Button } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
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

  const [notifsEnabled, setNotifsEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [hapticsEnabled, setHapticsEnabled] = useState(false)

  useEffect(() => {
    void api<{ notifications_enabled: boolean; sound_enabled: boolean; haptics_enabled: boolean }>('/student/preferences/').then((data) => {
      setNotifsEnabled(data.notifications_enabled)
      setSoundEnabled(data.sound_enabled)
      setHapticsEnabled(data.haptics_enabled)
    })
  }, [])

  function updatePreference(field: string, value: boolean) {
    void api('/student/preferences/', { method: 'PATCH', body: JSON.stringify({ [field]: value }) })
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
        <div className={styles.card}>
          <button
            className={styles.linkRow}
            onClick={() => navigate('/student/profile')}
          >
            Edit profile
          </button>
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
