import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { CardGridSkeleton } from '../../components/molecules'
import { useAuthStore } from '../../store/authStore'
import { getTeacherClasses, type TeacherClass } from '../../lib/teacherApi'
import { cachedApiValue } from '../../lib/api'
import styles from './Classes.module.css'

export default function Classes() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)!
  const [search, setSearch] = useState('')
  const cached = cachedApiValue<{ classes: TeacherClass[] }>('/classes/')
  const [classes, setClasses] = useState<TeacherClass[]>(() => cached?.classes ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  useEffect(() => {
    getTeacherClasses().then((data) => setClasses(data.classes)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [])

  const filtered = classes.filter((item) => item.status === 'active' && item.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <TeacherDashboardTemplate user={user}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Classes</h1>
          <button className={styles.addBtn} onClick={() => navigate('/teacher/classes/new')}><Plus size={14} strokeWidth={2} /> New class</button>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={14} strokeWidth={1.75} className={styles.searchIcon} />
            <input className={styles.searchInput} placeholder="Search classes..." value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search classes" />
          </div>
        </div>
        {error && <div className={styles.emptyState}><p>{error}</p></div>}
        {loading ? <CardGridSkeleton count={4} /> : filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((item) => (
              <button key={item.id} className={styles.card} onClick={() => navigate(`/teacher/class/${item.id}/overview`)}>
                <span className={styles.cardIcon} style={{ background: '#EEEDFE' }}>🏫</span>
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{item.name}</span>
                  <span className={styles.cardMeta}>{item.student_count} students · Code {item.code}</span>
                  <span className={styles.packagePill} style={{ background: '#F8F8FC' }}>All 7 learning packages</span>
                </span>
                <ChevronRight size={16} strokeWidth={1.75} className={styles.cardChevron} />
              </button>
            ))}
          </div>
        ) : !error ? <div className={styles.emptyState}><p>No classes yet. Create a section to enroll students.</p></div> : null}
      </div>
    </TeacherDashboardTemplate>
  )
}
