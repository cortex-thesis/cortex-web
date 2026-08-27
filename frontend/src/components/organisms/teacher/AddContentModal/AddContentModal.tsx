import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { InputField } from '../../../molecules'
import type { CurriculumPackage } from '../../../../constants/states'
import { CURRICULUM_PACKAGES } from '../../../../constants/states'
import type { ContentItem } from '../../../../types'
import styles from './AddContentModal.module.css'

type ContentType = 'image' | 'audio' | 'video' | 'interactive'
type ContentMode = 'focus' | 'relax' | 'both'

interface AddContentModalProps {
  initialData?: ContentItem | null
  onSave: (data: {
    title: string
    type: ContentType
    package: CurriculumPackage
    mode: ContentMode
    file?: File
  }) => void
  onClose: () => void
}

function AddContentModal({
  initialData,
  onSave,
  onClose,
}: AddContentModalProps) {
  const isEditing = Boolean(initialData)

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [type, setType] = useState<ContentType>(initialData?.type ?? 'image')
  const [pkg, setPkg] = useState<CurriculumPackage>(
    initialData?.package ?? 'life'
  )
  const [mode, setMode] = useState<ContentMode>(initialData?.mode ?? 'focus')
  const [titleError, setTitleError] = useState('')
  const [file, setFile] = useState<File | undefined>()

  function handleSave() {
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    onSave({ title, type, package: pkg, mode, file })
  }

  const CONTENT_TYPES: { value: ContentType; emoji: string; label: string }[] =
    [
      { value: 'image', emoji: '🖼️', label: 'Image' },
      { value: 'audio', emoji: '🎵', label: 'Audio' },
      { value: 'video', emoji: '🎬', label: 'Video' },
      { value: 'interactive', emoji: '🎮', label: 'Interactive' },
    ]

  const MODES: { value: ContentMode; label: string; desc: string }[] = [
    {
      value: 'focus',
      label: 'Focus Mode',
      desc: 'Shown during active learning',
    },
    {
      value: 'relax',
      label: 'Relax Mode',
      desc: 'Shown during calming breaks',
    },
    { value: 'both', label: 'Both modes', desc: 'Available in any state' },
  ]

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit content' : 'Add content'}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditing ? 'Edit content' : 'Add content'}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.body}>
          <InputField
            label="Content title"
            placeholder="e.g. Morning Routine Steps"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setTitleError('')
            }}
            fieldState={titleError ? 'error' : 'default'}
            errorText={titleError}
            required
          />

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Content type</span>
            <div className={styles.typeGrid}>
              {CONTENT_TYPES.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.typeBtn} ${type === value ? styles.typeBtnActive : ''}`}
                  onClick={() => setType(value)}
                  aria-pressed={type === value}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Curriculum package</span>
            <select
              className={styles.select}
              value={pkg}
              onChange={(e) => setPkg(e.target.value as CurriculumPackage)}
              aria-label="Curriculum package"
            >
              {CURRICULUM_PACKAGES.map((p) => (
                <option key={p} value={p}>
                  {p.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Session mode</span>
            <div className={styles.modeRow}>
              {MODES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.modeBtn} ${mode === value ? styles.modeBtnActive : ''}`}
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                >
                  <span className={styles.modeName}>{label}</span>
                  <span className={styles.modeDesc}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <label className={styles.uploadArea}>
            <Upload size={24} strokeWidth={1.5} color="#B4B2A9" />
            <span className={styles.uploadText}>
              {file?.name ?? (isEditing ? 'Replace current file' : 'Click to upload file')}
            </span>
            <span className={styles.uploadSub}>
              PNG, JPG, MP3, MP4 up to 10MB
            </span>
            <input type="file" accept="image/*,audio/*,video/mp4,video/webm,application/pdf" onChange={(event) => setFile(event.target.files?.[0])} />
          </label>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {isEditing ? 'Save changes' : 'Add content'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddContentModal
