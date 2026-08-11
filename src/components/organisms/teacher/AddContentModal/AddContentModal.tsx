import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { InputField } from '../../../molecules'
import type { JournalResponseType } from '../../../../types'
import type { CurriculumPackage } from '../../../../constants/states'
import { CURRICULUM_PACKAGES } from '../../../../constants/states'
import styles from './AddContentModal.module.css'

type ContentType = 'image' | 'audio' | 'video' | 'interactive'
type ContentMode = 'focus' | 'relax' | 'both'

interface AddContentModalProps {
  onSave: (data: {
    title: string
    type: ContentType
    package: CurriculumPackage
    mode: ContentMode
  }) => void
  onClose: () => void
}

function AddContentModal({ onSave, onClose }: AddContentModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ContentType>('image')
  const [pkg, setPkg] = useState<CurriculumPackage>('life')
  const [mode, setMode] = useState<ContentMode>('focus')
  const [titleError, setTitleError] = useState('')

  function handleSave() {
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    onSave({ title, type, package: pkg, mode })
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
      aria-label="Add content"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add content</h2>
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

          <div className={styles.uploadArea}>
            <Upload size={24} strokeWidth={1.5} color="#B4B2A9" />
            <span className={styles.uploadText}>Click to upload file</span>
            <span className={styles.uploadSub}>
              PNG, JPG, MP3, MP4 up to 50MB
            </span>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            Add content
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddContentModal
