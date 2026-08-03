import { Check, X } from 'lucide-react'
import styles from './AnswerChoice.module.css'
import clsx from 'clsx'

type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect'

interface AnswerChoiceProps {
  label: string
  answerState?: AnswerState
  disabled?: boolean
  onClick?: () => void
  className?: string
}

function AnswerChoice({
  label,
  answerState = 'default',
  disabled = false,
  onClick,
  className,
}: AnswerChoiceProps) {
  return (
    <button
      className={clsx(
        styles.choice,
        styles[answerState],
        disabled && styles.disabled,
        className
      )}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={
        answerState === 'selected' ||
        answerState === 'correct' ||
        answerState === 'incorrect'
      }
      aria-label={`Answer: ${label}${
        answerState === 'correct'
          ? ' — correct'
          : answerState === 'incorrect'
            ? ' — incorrect'
            : ''
      }`}
    >
      {answerState === 'correct' && (
        <span
          className={clsx(styles.icon, styles.iconCorrect)}
          aria-hidden="true"
        >
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {answerState === 'incorrect' && (
        <span
          className={clsx(styles.icon, styles.iconIncorrect)}
          aria-hidden="true"
        >
          <X size={12} strokeWidth={3} />
        </span>
      )}
      <span>{label}</span>
    </button>
  )
}

export default AnswerChoice
