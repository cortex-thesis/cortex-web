import { useState } from 'react'
import type { CSSProperties } from 'react'
import { GripVertical, Image as ImageIcon, Pause, Play, Volume2 } from 'lucide-react'
import type { Task } from '../../../types'
import AnswerChoice from '../AnswerChoice'
import { ProgressBar } from '../../atoms'
import ActivityTemplate from '../ActivityTemplate'
import TaskInteraction from '../TaskInteraction'
import { ACTIVITY_TEMPLATE_BY_ID, TASK_TEMPLATE_BY_ID } from '../../../constants/activityTemplates'
import styles from './TaskCard.module.css'

type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect'

interface TaskCardProps {
  task: Task
  onAnswered?: (correct: boolean, selected: string) => void
  nudgeText?: string
  showNudge?: boolean
  className?: string
  showProgress?: boolean
  deliveryStrategy?: 'steady_instruction' | 'attention_reengagement' | 'gentle_reactivation' | 'sensory_cooldown'
}

function TaskCard({
  task,
  onAnswered,
  nudgeText = 'Focus music playing softly. Keep going!',
  showNudge = false,
  className,
  showProgress = true,
  deliveryStrategy = 'steady_instruction',
}: TaskCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [interactionResult, setInteractionResult] = useState<'correct' | 'incorrect' | null>(null)

  function handleInteraction(correct: boolean, response: string) {
    setInteractionResult(correct ? 'correct' : 'incorrect')
    onAnswered?.(correct, response)
  }

  function handleSelect(choice: string) {
    if (revealed) return
    setSelected(choice)
    setRevealed(true)
    onAnswered?.(choice === task.answer, choice)
  }

  function getAnswerState(choice: string): AnswerState {
    if (!revealed) {
      return selected === choice ? 'selected' : 'default'
    }
    if (choice === task.answer) return 'correct'
    if (choice === selected) return 'incorrect'
    return 'default'
  }

  const safeTotal = Math.max(task.total, 1)
  const progress = Math.min(100, Math.max(0, ((task.index - 1) / safeTotal) * 100))
  const contentType = task.contentType ?? 'image'
  const template = task.template ?? 'multiple_choice'
  const isKnowledgeCheck = template === 'multiple_choice'
  const hasTaskInteraction = Boolean(task.taskTemplate)
  const templateLabel = task.taskTemplate ? TASK_TEMPLATE_BY_ID[task.taskTemplate].label : ACTIVITY_TEMPLATE_BY_ID[template].label
  const maxWidths = { compact: '560px', standard: '760px', wide: '1040px', immersive: 'min(1280px, 100%)' }
  const taskStyle = {
    '--activity-max-width': maxWidths[task.layout?.size ?? 'standard'],
    '--activity-columns': task.layout?.preferredColumns ?? 'auto-fit',
    '--activity-board-min-height': `${task.layout?.boardMinHeight ?? 220}px`,
    '--activity-media-fit': task.layout?.mediaFit ?? 'contain',
  } as CSSProperties

  const contentPreview = task.contentType && (
    <div className={`${styles.contentPreview} ${styles[contentType]}`}>
      {contentType === 'image' && (
        <div className={styles.visualPreview} role="img" aria-label={task.contentLabel}>
          <span className={styles.visualSun} />
          <ImageIcon size={38} strokeWidth={1.5} aria-hidden="true" />
          <span className={styles.previewLabel}>{task.contentLabel}</span>
        </div>
      )}

      {contentType === 'video' && (
        <div className={styles.videoPreview}>
          <button className={styles.mediaButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pause video' : 'Play video'}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <div className={styles.mediaInfo}><strong>{task.contentLabel}</strong><span>{task.contentDescription}</span></div>
          <span className={styles.duration}>0:{String(task.durationSeconds ?? 0).padStart(2, '0')}</span>
        </div>
      )}

      {contentType === 'audio' && (
        <div className={styles.audioPreview}>
          <button className={styles.mediaButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Volume2 size={20} />}
          </button>
          <div className={styles.mediaInfo}><strong>{task.contentLabel}</strong><span>{task.contentDescription}</span></div>
          <div className={styles.waveform} aria-hidden="true">{[8, 15, 22, 12, 26, 18, 10, 20, 14, 8].map((height, index) => <span key={index} style={{ height }} />)}</div>
        </div>
      )}

      {contentType === 'interactive' && (
        <div className={styles.sequence} aria-label="Interactive morning sequence preview">
          {['Wake up', 'Get dressed', 'Pack bag'].map((step, index) => (
            <div className={styles.sequenceStep} key={step}><GripVertical size={15} aria-hidden="true" /><span>{index + 1}</span><strong>{step}</strong></div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={`${styles.card} ${styles[deliveryStrategy]} ${className ?? ''}`} style={taskStyle} data-delivery-strategy={deliveryStrategy}>
      {showProgress && <ProgressBar
        value={progress}
        state="focused"
        size="xs"
        ariaLabel={`Task ${task.index} of ${task.total}`}
      />}

      <div className={styles.contentHeading}>
        <div><span className={styles.typeLabel}>{templateLabel}</span><h2>{task.title}</h2></div>
        <span className={styles.contentHint}>{task.contentDescription}</span>
      </div>

      {!hasTaskInteraction && task.template ? <ActivityTemplate task={task} /> : !hasTaskInteraction ? contentPreview : null}

      {task.imageUrl && (
        <div className={styles.imageWrap}>
          <img src={task.imageUrl} alt={task.title} className={styles.image} />
        </div>
      )}

      {hasTaskInteraction ? (
        <>
          <p className={styles.question}>{task.question}</p>
          <TaskInteraction task={task} onAnswered={handleInteraction} onChanged={() => { setInteractionResult(null); onAnswered?.(false, '') }} />
          {interactionResult && <div className={`${styles.feedback} ${styles[interactionResult]}`} role="status">{interactionResult === 'correct' ? (task.correctFeedback ?? 'Nice work! You found it.') : (task.retryFeedback ?? 'Almost. Try another move.')}</div>}
        </>
      ) : isKnowledgeCheck ? (
        <>
          <p className={styles.question}>{task.question}</p>
          <div className={styles.choices}>
            {task.choices.map((choice) => (
              <AnswerChoice key={choice} label={choice} answerState={getAnswerState(choice)} disabled={revealed && choice !== task.answer && choice !== selected} onClick={() => handleSelect(choice)} />
            ))}
          </div>
          {revealed && <div className={`${styles.feedback} ${selected === task.answer ? styles.correct : styles.incorrect}`} role="status">{selected === task.answer ? (task.correctFeedback ?? 'Correct.') : (task.retryFeedback ?? 'Try again.')}</div>}
        </>
      ) : (
        <button type="button" className={styles.continueButton} onClick={() => onAnswered?.(true, 'completed')}>
          {task.actionLabel ?? (template === 'reengagement_prompt' ? "I'm ready" : 'Continue')}
        </button>
      )}

      {showNudge && nudgeText && (
        <div className={styles.nudge} aria-live="polite">
          <span className={styles.nudgeDot} aria-hidden="true" />
          <span>{nudgeText}</span>
        </div>
      )}
    </div>
  )
}

export default TaskCard
