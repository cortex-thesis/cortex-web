import { useEffect, useState } from 'react'
import { BookOpen, Building2, UserCog, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { AdminShell } from '../prototype'
import { CardGridSkeleton, ListSkeleton } from '../../components/molecules'
import styles from '../prototype/Prototype.module.css'

interface DashboardData { counts: { schools: number; teachers: number; students: number; classes: number; pending_accounts: number }; recent_accounts: Array<{ id: number; name: string; role: string; account_status: string; email: string; school_name: string | null }> }
export default function AdminDashboard() {
  const navigate = useNavigate(); const [data, setData] = useState<DashboardData | null>(null); const [error, setError] = useState('')
  useEffect(() => { void api<DashboardData>('/admin/dashboard/').then(setData).catch((reason: Error) => setError(reason.message)) }, [])
  const cards = data ? [{ value: data.counts.schools, label: 'Schools', Icon: Building2 }, { value: data.counts.teachers, label: 'Teachers', Icon: UserCog }, { value: data.counts.students, label: 'Students', Icon: Users }, { value: data.counts.classes, label: 'Classes', Icon: BookOpen }] : []
  return <AdminShell active="dashboard"><div className={styles.page}>
    <div className={styles.header}><div><span className={styles.eyebrow}>System administration</span><h1 className={styles.title}>Cortex administration</h1><p className={styles.subtitle}>Manage schools and the accounts assigned to each institution.</p></div><button className={styles.primary} onClick={() => navigate('/admin/schools')}><Building2 size={14} /> Manage schools</button></div>
    {error && <div className={`${styles.alert} ${styles.alertDanger}`}>{error}</div>}
    {!data && !error && <><CardGridSkeleton count={4} /><section className={styles.section}><ListSkeleton rows={4} /></section></>}
    {data && <><div className={styles.grid4}>{cards.map(({ value, label, Icon }) => <div className={`${styles.card} ${styles.stat}`} key={label}><span className={styles.statIcon}><Icon size={18} /></span><span><span className={styles.statValue}>{value}</span><span className={styles.statLabel}>{label}</span></span></div>)}</div>
      <section className={styles.section}><div className={styles.card}><div className={styles.sectionHead}><h2 className={styles.sectionTitle}>Recently created accounts</h2><button className={styles.ghost} onClick={() => navigate('/admin/accounts')}>Manage accounts</button></div><div className={styles.list}>{data.recent_accounts.map((account) => <div className={styles.listItem} key={account.id}><span><strong className={styles.listName}>{account.name}</strong><span className={styles.listMeta}>{account.email} · {account.school_name ?? 'No school'}</span></span><span className={account.account_status === 'active' ? styles.badge : styles.badgeGold}>{account.role} · {account.account_status}</span></div>)}</div></div></section>
    </>}
  </div></AdminShell>
}
