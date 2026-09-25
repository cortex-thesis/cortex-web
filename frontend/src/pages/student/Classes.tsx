import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Search, School } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton } from '../../components/molecules'
import { classPresentation, getStudentClasses } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import type { StudentClass } from '../../lib/studentApi'
import styles from './Classes.module.css'

export default function Classes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const cached = cachedApiValue<{ classes: StudentClass[] }>('/classes/')
  const [classes, setClasses] = useState<ReturnType<typeof classPresentation>[]>(() => (cached?.classes ?? []).map(classPresentation))
  const [loading, setLoading] = useState(!cached)
  useEffect(() => { void getStudentClasses().then((data) => setClasses(data.classes.map(classPresentation))).finally(() => setLoading(false)) }, [])

  const filtered = classes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/student/home', { replace: true })}
          aria-label="Back to home"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <h1 className={styles.title}>My Classes</h1>
        <button
          className={styles.joinBtn}
          onClick={() => navigate('/student/join-class')}
        >
          Join a class
        </button>
      </div>

      <div className={styles.body}>
        <p className={styles.intro}>Open your class to choose a learning package.</p>
        <div className={styles.searchWrap}>
          <Search size={14} strokeWidth={1.75} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search classes"
          />
        </div>

        {loading ? <CardGridSkeleton count={4} /> : filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((cls) => (
              <button key={cls.id} className={styles.classCard} onClick={() => navigate(`/student/class/${cls.id}`)}>
                <span className={styles.classIcon} aria-hidden="true"><School size={26} strokeWidth={1.75} /></span>
                <strong className={styles.className}>{cls.name}</strong>
                <span className={styles.viewClass}>View class <ArrowRight size={15} /></span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>{search ? 'No classes match your search.' : 'You have not joined a class yet.'}</p>
          </div>
        )}
      </div>
    </PlayfulZoneTemplate>
  )
}
