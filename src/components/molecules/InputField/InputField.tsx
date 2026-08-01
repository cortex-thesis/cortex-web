import { useState, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './InputField.module.css'
import clsx from 'clsx'
import { Eye, EyeOff } from 'lucide-react'

type InputFieldState = 'default' | 'error' | 'success'

interface InputFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  label?: string
  helperText?: string
  errorText?: string
  successText?: string
  fieldState?: InputFieldState
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  required?: boolean
  className?: string
}

function InputField({
  label,
  helperText,
  errorText,
  successText,
  fieldState = 'default',
  leftIcon,
  rightIcon,
  required = false,
  className,
  type = 'text',
  disabled = false,
  ...rest
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const id = useId()

  const isPassword = type === 'password'
  const resolvedType = isPassword && showPassword ? 'text' : type

  const resolvedState = disabled ? 'disabled' : fieldState

  const bottomText =
    resolvedState === 'error' && errorText
      ? errorText
      : resolvedState === 'success' && successText
        ? successText
        : (helperText ?? null)

  const bottomTextClass =
    resolvedState === 'error'
      ? styles.errorText
      : resolvedState === 'success'
        ? styles.successText
        : styles.helperText

  return (
    <div className={clsx(styles.field, className)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className={styles.inputWrapper}>
        {leftIcon && (
          <span className={styles.iconLeft} aria-hidden="true">
            {leftIcon}
          </span>
        )}

        <input
          id={id}
          type={resolvedType}
          disabled={disabled}
          aria-invalid={resolvedState === 'error'}
          aria-describedby={bottomText ? `${id}-hint` : undefined}
          className={clsx(
            styles.input,
            styles[resolvedState],
            isFocused && resolvedState === 'default' && styles.focused,
            leftIcon && styles.hasLeft,
            (rightIcon || isPassword) && styles.hasRight
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            className={styles.iconRight}
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff size={16} strokeWidth={1.75} />
            ) : (
              <Eye size={16} strokeWidth={1.75} />
            )}
          </button>
        ) : rightIcon ? (
          <span className={styles.iconRight} aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </div>

      {bottomText && (
        <span id={`${id}-hint`} className={bottomTextClass}>
          {bottomText}
        </span>
      )}
    </div>
  )
}

export default InputField
