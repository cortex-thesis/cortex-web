import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { CURRICULUM_PACKAGES } from '../../constants/states'
import type { CurriculumPackage } from '../../constants/states'
import { PACKAGE_META } from '../../constants/packages'
import { mockTeacher, mockClasses } from '../../mocks'
import styles from './Classes.module.css'

type PackageFilter = 'all' | CurriculumPackage

export default function Classes() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PackageFilter>('all')

  const classes = mockClasses.filter((c) => c.teacherId === mockTeacher.id)

  const filtered = classes.filter((c) => {
    const matchesFilter = filter === 'all' || c.package === filter
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Classes</h1>
          <button
            className={styles.addBtn}
            onClick={() => navigate('/teacher/classes/new')}
          >
            <Plus size={14} strokeWidth={2} />
            New class
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search
              size={14}
              strokeWidth={1.75}
              className={styles.searchIcon}
            />
            <input
              className={styles.searchInput}
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search classes"
            />
          </div>
        </div>

        <div className={styles.chipRow}>
          <button
            type="button"
            className={`${styles.chip} ${filter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
          >
            All
          </button>
          {CURRICULUM_PACKAGES.map((pkg) => (
            <button
              key={pkg}
              type="button"
              className={`${styles.chip} ${filter === pkg ? styles.chipActive : ''}`}
              onClick={() => setFilter(pkg)}
              aria-pressed={filter === pkg}
            >
              {PACKAGE_META[pkg].label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((c) => (
              <button
                key={c.id}
                className={styles.card}
                onClick={() => navigate(`/teacher/class/${c.id}/overview`)}
              >
                <span
                  className={styles.cardIcon}
                  style={{ background: c.iconBg }}
                >
                  {c.iconEmoji}
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardName}>{c.name}</span>
                  <span className={styles.cardMeta}>
                    {c.studentIds.length} students · Code {c.code}
                  </span>
                  <span
                    className={styles.packagePill}
                    style={{ background: PACKAGE_META[c.package].bg }}
                  >
                    {PACKAGE_META[c.package].label}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  strokeWidth={1.75}
                  className={styles.cardChevron}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No classes in this category yet.</p>
          </div>
        )}
      </div>
    </TeacherDashboardTemplate>
  )
}
