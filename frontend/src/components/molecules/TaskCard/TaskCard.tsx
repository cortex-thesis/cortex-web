import { useState } from 'react'
import type { Task } from '../../../types'
import AnswerChoice from '../AnswerChoice'
import { ProgressBar } from '../../atoms'
import styles from './TaskCard.module.css'

type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect'

interface TaskCardProps {
  task: Task
  onAnswered?: (correct: boolean, selected: string) => void
  nudgeText?: string
  showNudge?: boolean
  className?: string
}

function TaskCard({
  task,
  onAnswered,
  nudgeText = 'Focus music playing softly. Keep going!',
  showNudge = false,
  className,
}: TaskCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

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

  const progress = ((task.index - 1) / task.total) * 100

  return (
    <div className={`${styles.card} ${className ?? ''}`}>
      <ProgressBar
        value={progress}
        state="focused"
        size="xs"
        ariaLabel={`Task ${task.index} of ${task.total}`}
      />

      {task.imageUrl && (
        <div className={styles.imageWrap}>
          <img src={task.imageUrl} alt={task.title} className={styles.image} />
        </div>
      )}

      <div className={styles.meta}>
        <span className={styles.counter}>
          Task {task.index} of {task.total}
          {task.package && (
            <span className={styles.package}>
              {' '}
              — {task.package.replace('_', ' ')}
            </span>
          )}
        </span>
      </div>

      <p className={styles.question}>{task.question}</p>

      <div className={styles.choices}>
        {task.choices.map((choice) => (
          <AnswerChoice
            key={choice}
            label={choice}
            answerState={getAnswerState(choice)}
            disabled={revealed && choice !== task.answer && choice !== selected}
            onClick={() => handleSelect(choice)}
          />
        ))}
      </div>

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
