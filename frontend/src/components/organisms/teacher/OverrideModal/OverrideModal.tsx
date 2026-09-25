import { X } from 'lucide-react'
import { StudentFlowerAvatar, StateBadge } from '../../../atoms'
import type { StudentLive } from '../../../../types'
import type { InterventionAction } from '../../../../types'
import type { CognitiveState } from '../../../../constants/states'
import styles from './OverrideModal.module.css'

interface OverrideModalProps {
  student: StudentLive
  onConfirm: (action: InterventionAction, mode?: 'focus' | 'relax') => void
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
          <StudentFlowerAvatar
            name={student.name}
            color={student.avatar_color}
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
            onClick={() => onConfirm('set_mode', 'focus')}
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
            onClick={() => onConfirm('set_mode', 'relax')}
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

        <div className={styles.options}>
          <button className={styles.optionBtn} onClick={() => onConfirm('pause')}><span className={styles.optionName}>Pause session</span><span className={styles.optionDesc}>Hold the current activity</span></button>
          <button className={styles.optionBtn} onClick={() => onConfirm('resume')}><span className={styles.optionName}>Resume session</span><span className={styles.optionDesc}>Continue the current activity</span></button>
          <button className={styles.optionBtn} onClick={() => onConfirm('return_auto')}><span className={styles.optionName}>Return to automatic</span><span className={styles.optionDesc}>Let EEG adaptation control the mode</span></button>
          <button className={styles.optionBtn} onClick={() => onConfirm('set_content')}><span className={styles.optionName}>Change content</span><span className={styles.optionDesc}>Send a content change command</span></button>
        </div>

        <button className={styles.cancelBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default OverrideModal
