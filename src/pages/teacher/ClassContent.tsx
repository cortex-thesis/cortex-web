import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { TeacherTabTemplate } from '../../components/templates'
import { AlertBanner } from '../../components/molecules'
import type { ContentItem } from '../../types'
import { mockTeacher, mockClasses } from '../../mocks'
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

const TYPE_EMOJI: Record<string, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  interactive: '🎮',
}

const TYPE_BG: Record<string, string> = {
  image: '#E1F5EE',
  audio: '#E6F1FB',
  video: '#FAEEDA',
  interactive: '#EEEDFE',
}

export default function ClassContent() {
  const { classId = 'class-001' } = useParams()
  const [filter, setFilter] = useState<ContentFilter>('all')
  const [items, setItems] = useState<ContentItem[]>(MOCK_CONTENT)
  const [deleted, setDeleted] = useState<string | null>(null)

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
          <button className={styles.addBtn}>
            <Plus size={14} strokeWidth={2} />
            Add content
          </button>
        </div>

        <div className={styles.grid}>
          {filtered.map((item) => (
            <div key={item.id} className={styles.card}>
              <div
                className={styles.thumb}
                style={{ background: TYPE_BG[item.type] ?? '#F8F8FC' }}
              >
                <span aria-hidden="true">{TYPE_EMOJI[item.type] ?? '📄'}</span>
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
          ))}

          <button className={styles.addCard}>
            <Plus size={24} strokeWidth={1.5} color="#B4B2A9" />
            <span>Add new content</span>
          </button>
        </div>
      </div>
    </TeacherTabTemplate>
  )
}
