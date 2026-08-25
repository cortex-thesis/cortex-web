import { X } from 'lucide-react'
import { Avatar, StateBadge } from '../../../atoms'
import type { StudentLive } from '../../../../types'
import type { CognitiveState } from '../../../../constants/states'
import styles from './OverrideModal.module.css'

interface OverrideModalProps {
  student: StudentLive
  onConfirm: (targetMode: 'focus' | 'relax') => void
  onClose: () => void
}

function OverrideModal({ student, onConfirm, onClose }: OverrideModalProps) {
  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Override mode for ${student.name}`}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Override mode</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.studentRow}>
          <Avatar
            name={student.name}
            imageUrl={student.avatar}
            size="md"
            showStatus
            isOnline={student.isConnected}
          />
          <div className={styles.studentInfo}>
            <span className={styles.studentName}>{student.name}</span>
            {student.currentState && (
              <div className={styles.currentState}>
                <span className={styles.currentLabel}>Currently</span>
                <StateBadge
                  state={student.currentState as CognitiveState}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        <p className={styles.desc}>
          Manually switch this student's learning mode. The EEG system will
          continue monitoring and may switch back automatically.
        </p>

        <div className={styles.options}>
          <button
            className={`${styles.optionBtn} ${styles.optionFocus}`}
            onClick={() => onConfirm('focus')}
          >
            <span className={styles.optionIcon}>⚡</span>
            <div className={styles.optionInfo}>
              <span className={styles.optionName}>Switch to Focus Mode</span>
              <span className={styles.optionDesc}>
                Resume task-based learning
              </span>
            </div>
          </button>

          <button
            className={`${styles.optionBtn} ${styles.optionRelax}`}
            onClick={() => onConfirm('relax')}
          >
            <span className={styles.optionIcon}>🌊</span>
            <div className={styles.optionInfo}>
              <span className={styles.optionName}>Switch to Relax Mode</span>
              <span className={styles.optionDesc}>
                Activate breathing exercise
              </span>
            </div>
          </button>
        </div>

        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default OverrideModal
