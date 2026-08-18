import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Users, ShieldAlert, LogOut } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { Button } from '../../components/atoms'
import { useAuthStore } from '../../store/authStore'
import { mockTeacher } from '../../mocks'
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

  const [notifyOnOverstim, setNotifyOnOverstim] = useState(true)
  const [notifyOnDisconnect, setNotifyOnDisconnect] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  function handleLogout() {
    logout()
    navigate('/teacher/login')
  }

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.wrap}>
        <button className={styles.backLink} onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back
        </button>

        <h1 className={styles.title}>Settings</h1>

        <span className={styles.sectionLabel}>Alerts</span>
        <div className={styles.card}>
          <ToggleRow
            icon={<ShieldAlert size={16} strokeWidth={1.75} color="#D85A30" />}
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

        <span className={styles.sectionLabel}>Account</span>
        <div className={styles.card}>
          <button
            className={styles.linkRow}
            onClick={() => navigate('/teacher/profile')}
          >
            Edit profile
          </button>
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
    </TeacherDashboardTemplate>
  )
}
