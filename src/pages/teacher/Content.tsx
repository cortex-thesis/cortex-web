import { useState } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Image as ImageIcon,
  Music,
  Video,
  Gamepad2,
  FileText,
  FolderOpen,
} from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { AlertBanner } from '../../components/molecules'
import { AddContentModal } from '../../components/organisms/teacher'
import type { ContentItem } from '../../types'
import { CURRICULUM_PACKAGES } from '../../constants/states'
import type { CurriculumPackage } from '../../constants/states'
import { PACKAGE_META } from '../../constants/packages'
import { mockTeacher } from '../../mocks'
import styles from './Content.module.css'

type ModeFilter = 'all' | 'focus' | 'relax'
type PackageFilter = 'all' | CurriculumPackage

// Mock library across every package — replace with GET /api/content/
// once the backend is up. Same ContentItem shape ClassContent.tsx uses.
const MOCK_LIBRARY: ContentItem[] = [
  {
    id: 'c1',
    title: 'Morning Routine Steps',
    type: 'image',
    package: 'life',
    mode: 'focus',
    cognitiveStateTarget: 'focused',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 0,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c2',
    title: 'Calming Rain Sounds',
    type: 'audio',
    package: 'life',
    mode: 'relax',
    cognitiveStateTarget: 'relaxed',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 180,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c3',
    title: 'Packing My School Bag',
    type: 'interactive',
    package: 'life',
    mode: 'focus',
    cognitiveStateTarget: 'focused',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 120,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c4',
    title: 'Brushing Teeth Checklist',
    type: 'image',
    package: 'care',
    mode: 'focus',
    cognitiveStateTarget: 'focused',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 0,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c5',
    title: 'Breathing Break',
    type: 'video',
    package: 'care',
    mode: 'relax',
    cognitiveStateTarget: 'overstimulated',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 90,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c6',
    title: 'Counting Coins',
    type: 'interactive',
    package: 'functional_academics',
    mode: 'focus',
    cognitiveStateTarget: 'focused',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 150,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'c7',
    title: 'Job Interview Basics',
    type: 'video',
    package: 'career',
    mode: 'focus',
    cognitiveStateTarget: 'distracted',
    fileUrl: '',
    thumbnailUrl: null,
    durationSeconds: 210,
    createdBy: 'teacher-001',
    createdAt: new Date().toISOString(),
  },
]

interface ContentTypeConfig {
  icon: React.ElementType
  bg: string
  color: string
}

const TYPE_CONFIG: Record<string, ContentTypeConfig> = {
  image: { icon: ImageIcon, bg: '#E1F5EE', color: '#085041' },
  audio: { icon: Music, bg: '#E6F1FB', color: '#005A9E' },
  video: { icon: Video, bg: '#FAEEDA', color: '#854D0E' },
  interactive: { icon: Gamepad2, bg: '#EEEDFE', color: '#534AB7' },
}

export default function Content() {
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [pkgFilter, setPkgFilter] = useState<PackageFilter>('all')
  const [items, setItems] = useState<ContentItem[]>(MOCK_LIBRARY)
  const [deleted, setDeleted] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)

  const filtered = items.filter((item) => {
    const matchesMode =
      modeFilter === 'all' || item.mode === modeFilter || item.mode === 'both'
    const matchesPkg = pkgFilter === 'all' || item.package === pkgFilter
    const matchesSearch = item.title
      .toLowerCase()
      .includes(search.toLowerCase())
    return matchesMode && matchesPkg && matchesSearch
  })

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleted(id)
    setTimeout(() => setDeleted(null), 3000)
  }

  function handleSaveContent(data: {
    title: string
    type: ContentItem['type']
    package: ContentItem['package']
    mode: ContentItem['mode']
  }) {
    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...data } : item
        )
      )
    } else {
      const newItem: ContentItem = {
        id: `c-${Date.now()}`,
        ...data,
        cognitiveStateTarget: data.mode === 'relax' ? 'relaxed' : 'focused',
        fileUrl: '',
        thumbnailUrl: null,
        durationSeconds: 0,
        createdBy: 'teacher-001',
        createdAt: new Date().toISOString(),
      }
      setItems((prev) => [...prev, newItem])
    }
    setShowAdd(false)
    setEditingItem(null)
  }

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.content}>
        {deleted && (
          <AlertBanner
            variant="info"
            message="Content item removed from the library."
            dismissible
            onDismiss={() => setDeleted(null)}
          />
        )}

        <div className={styles.header}>
          <h1 className={styles.title}>Content Library</h1>
          <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={14} strokeWidth={2} />
            Add content
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
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search content"
            />
          </div>
          <div className={styles.filters}>
            {(['all', 'focus', 'relax'] as ModeFilter[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${
                  modeFilter === f ? styles.filterActive : ''
                }`}
                onClick={() => setModeFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chipRow}>
          <button
            className={`${styles.chip} ${pkgFilter === 'all' ? styles.chipActive : ''}`}
            onClick={() => setPkgFilter('all')}
          >
            All packages
          </button>
          {CURRICULUM_PACKAGES.map((pkg) => (
            <button
              key={pkg}
              className={`${styles.chip} ${pkgFilter === pkg ? styles.chipActive : ''}`}
              onClick={() => setPkgFilter(pkg)}
            >
              <span aria-hidden="true">
                {(() => {
                  const PackageIcon = PACKAGE_META[pkg].icon
                  return <PackageIcon />
                })()}
              </span>
              {PACKAGE_META[pkg].label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className={styles.grid}>
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type] ?? {
                icon: FileText,
                bg: '#F8F8FC',
                color: '#5F5E5A',
              }
              const IconComponent = config.icon

              return (
                <div key={item.id} className={styles.card}>
                  <div
                    className={styles.thumb}
                    style={{ background: config.bg }}
                  >
                    <IconComponent
                      size={24}
                      strokeWidth={1.75}
                      color={config.color}
                    />
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.contentType}>{item.type}</span>
                    <span className={styles.contentTitle}>{item.title}</span>
                    <span className={styles.contentPkg}>
                      {PACKAGE_META[item.package].label} ·{' '}
                      {item.mode === 'focus'
                        ? 'Focus Mode'
                        : item.mode === 'relax'
                          ? 'Relax Mode'
                          : 'Both modes'}
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => setEditingItem(item)}
                    >
                      <Pencil size={12} strokeWidth={1.75} />
                      Edit
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <FolderOpen size={36} strokeWidth={1.5} color="#B4B2A9" />
            <div className={styles.emptyText}>
              <h3>No content items found</h3>
              <p>Try a different filter, or add new content to the library.</p>
            </div>
            <button
              className={styles.emptyAddBtn}
              onClick={() => setShowAdd(true)}
            >
              <Plus size={14} strokeWidth={2} />
              Add content
            </button>
          </div>
        )}
      </div>

      {(showAdd || editingItem) && (
        <AddContentModal
          initialData={editingItem}
          onSave={handleSaveContent}
          onClose={() => {
            setShowAdd(false)
            setEditingItem(null)
          }}
        />
      )}
    </TeacherDashboardTemplate>
  )
}
