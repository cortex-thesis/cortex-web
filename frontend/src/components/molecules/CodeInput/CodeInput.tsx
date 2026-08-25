import { useRef, useState, useEffect } from 'react'
import type { KeyboardEvent, ClipboardEvent } from 'react'
import styles from './CodeInput.module.css'
import clsx from 'clsx'

type CodeInputState = 'default' | 'error' | 'success'

interface CodeInputProps {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  fieldState?: CodeInputState
  errorText?: string
  successText?: string
  hint?: string
  disabled?: boolean
  className?: string
}

function CodeInput({
  length = 4,
  value = '',
  onChange,
  onComplete,
  fieldState = 'default',
  errorText,
  successText,
  hint = 'Enter the code your teacher gave you',
  disabled = false,
  className,
}: CodeInputProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.split('').slice(0, length)

  // auto-focus first empty box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function handleChange(index: number, newChar: string) {
    // only accept alphanumeric, convert to uppercase
    const cleaned = newChar.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (!cleaned) return

    const newChars = [...chars]
    newChars[index] = cleaned[0]

    // fill remaining chars if pasted multi-char (handled in paste but safety net)
    const newValue = newChars.join('').slice(0, length)
    onChange?.(newValue)

    // move focus to next box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    } else {
      inputRefs.current[index]?.blur()
      if (newValue.length === length) {
        onComplete?.(newValue)
      }
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (chars[index]) {
        // clear current box
        const newChars = [...chars]
        newChars[index] = ''
        onChange?.(newChars.join(''))
      } else if (index > 0) {
        // move to previous box and clear it
        const newChars = [...chars]
        newChars[index - 1] = ''
        onChange?.(newChars.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, length)

    if (!pasted) return

    onChange?.(pasted)

    // focus the next empty box after paste or last box
    const nextIndex = Math.min(pasted.length, length - 1)
    inputRefs.current[nextIndex]?.focus()

    if (pasted.length === length) {
      onComplete?.(pasted)
    }
  }

  const bottomText =
    fieldState === 'error' && errorText
      ? errorText
      : fieldState === 'success' && successText
        ? successText
        : null

  const bottomTextClass =
    fieldState === 'error'
      ? styles.errorText
      : fieldState === 'success'
        ? styles.successText
        : styles.hint

  return (
    <div className={clsx(styles.wrapper, className)}>
      <div className={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const char = chars[index] ?? ''
          const isFilled = char.length > 0
          const isActive = activeIndex === index
          const isError = fieldState === 'error'
          const isSuccess = fieldState === 'success'

          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={char}
              disabled={disabled}
              aria-label={`Code character ${index + 1} of ${length}`}
              className={clsx(
                styles.box,
                isFilled && !isError && !isSuccess && styles.filled,
                isActive && !isError && !isSuccess && styles.active,
                isError && styles.error,
                isSuccess && styles.success,
                disabled && styles.disabled
              )}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex(null)}
            />
          )
        })}
      </div>

      {(bottomText || hint) && (
        <span className={bottomTextClass}>{bottomText ?? hint}</span>
      )}
    </div>
  )
}

export default CodeInput
