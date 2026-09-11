import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CardGridSkeleton, ClassTile } from '../../components/molecules'
import { CURRICULUM_PACKAGES } from '../../constants/states'
import type { CurriculumPackage } from '../../constants/states'
import { PACKAGE_META } from '../../constants/packages'
import { classPresentation, getStudentClasses } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import type { StudentClass } from '../../lib/studentApi'
import styles from './Classes.module.css'

type PackageFilter = 'all' | CurriculumPackage

export default function Classes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PackageFilter>('all')

  const cached = cachedApiValue<{ classes: StudentClass[] }>('/classes/')
  const [classes, setClasses] = useState<ReturnType<typeof classPresentation>[]>(() => (cached?.classes ?? []).map(classPresentation))
  const [loading, setLoading] = useState(!cached)
  useEffect(() => { void getStudentClasses().then((data) => setClasses(data.classes.map(classPresentation))).finally(() => setLoading(false)) }, [])

  const filtered = classes.filter((c) => {
    const matchesFilter = filter === 'all' || c.package === filter
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

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

        <div className={styles.chipRow}>
          <button
            className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {CURRICULUM_PACKAGES.map((pkg) => (
            <button
              key={pkg}
              className={`${styles.chip} ${filter === pkg ? styles.chipActive : ''}`}
              onClick={() => setFilter(pkg)}
            >
              {PACKAGE_META[pkg].label}
            </button>
          ))}
        </div>

        {loading ? <CardGridSkeleton count={4} /> : filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((cls) => (
              <div key={cls.id} className={styles.tileWrap}>
                <ClassTile
                  name={cls.name}
                  iconEmoji={cls.iconEmoji}
                  iconBg={cls.iconBg}
                  onClick={() => navigate(`/student/class/${cls.id}`)}
                />
                <span
                  className={styles.packagePill}
                  style={{ background: PACKAGE_META[cls.package].bg }}
                >
                  {PACKAGE_META[cls.package].label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No classes in this category yet.</p>
          </div>
        )}
      </div>
    </PlayfulZoneTemplate>
  )
}
