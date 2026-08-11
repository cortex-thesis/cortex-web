import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Music,
  Video,
  Gamepad2,
  FileText,
} from 'lucide-react'
import { TeacherTabTemplate } from '../../../components/templates'
import { AlertBanner } from '../../../components/molecules'
import { AddContentModal } from '../../../components/organisms/teacher'
import type { ContentItem } from '../../../types'
import { mockTeacher, mockClasses } from '../../../mocks'
import styles from './ClassContent.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Content', path: `/teacher/class/${classId}/content` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

type ContentFilter = 'all' | 'focus' | 'relax'

const MOCK_CONTENT: ContentItem[] = [
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
]

interface ContentTypeConfig {
  icon: React.ElementType
  bg: string
  color: string
}

const TYPE_CONFIG: Record<string, ContentTypeConfig> = {
  image: {
    icon: ImageIcon,
    bg: '#E1F5EE',
    color: '#085041',
  },
  audio: {
    icon: Music,
    bg: '#E6F1FB',
    color: '#005A9E',
  },
  video: {
    icon: Video,
    bg: '#FAEEDA',
    color: '#854D0E',
  },
  interactive: {
    icon: Gamepad2,
    bg: '#EEEDFE',
    color: '#534AB7',
  },
}

export default function ClassContent() {
  const { classId = 'class-001' } = useParams()
  const [filter, setFilter] = useState<ContentFilter>('all')
  const [items, setItems] = useState<ContentItem[]>(MOCK_CONTENT)
  const [deleted, setDeleted] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const filtered = items.filter((item) =>
    filter === 'all' ? true : item.mode === filter || item.mode === 'both'
  )

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    setDeleted(id)
    setTimeout(() => setDeleted(null), 3000)
  }

  return (
    <TeacherTabTemplate
      user={mockTeacher}
      tabs={CLASS_TABS(classId)}
      title={`${classData.iconEmoji} ${classData.name}`}
    >
      <div className={styles.content}>
        {deleted && (
          <AlertBanner
            variant="info"
            message="Content item removed from this class."
            dismissible
            onDismiss={() => setDeleted(null)}
          />
        )}

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            {(['all', 'focus', 'relax'] as ContentFilter[]).map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${
                  filter === f ? styles.filterActive : ''
                }`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className={styles.addBtn} onClick={() => setShowAdd(true)}>
            <Plus size={14} strokeWidth={2} />
            Add content
          </button>
        </div>

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
                <div className={styles.thumb} style={{ background: config.bg }}>
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
                    {item.package.replace('_', ' ')} ·{' '}
                    {item.mode === 'focus'
                      ? 'Focus Mode'
                      : item.mode === 'relax'
                        ? 'Relax Mode'
                        : 'Both modes'}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.editBtn}>
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

          <button className={styles.addCard} onClick={() => setShowAdd(true)}>
            <Plus size={24} strokeWidth={1.5} color="#B4B2A9" />
            <span>Add new content</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <AddContentModal
          onSave={(data) => {
            console.log('New content:', data)
            setShowAdd(false)
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </TeacherTabTemplate>
  )
}
