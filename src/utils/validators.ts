export interface ValidationResult {
  valid: boolean
  message: string
}

export function validateEmail(value: string): ValidationResult {
  if (!value.trim()) {
    return { valid: false, message: 'Email is required' }
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return { valid: false, message: 'Please enter a valid email address' }
  }
  return { valid: true, message: '' }
}

export function validatePassword(value: string): ValidationResult {
  if (!value) {
    return { valid: false, message: 'Password is required' }
  }
  if (value.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  return { valid: true, message: '' }
}

export function validateRequired(
  value: string,
  fieldName = 'This field'
): ValidationResult {
  if (!value.trim()) {
    return { valid: false, message: `${fieldName} is required` }
  }
  return { valid: true, message: '' }
}

export function validateClassCode(value: string): ValidationResult {
  if (!value.trim()) {
    return { valid: false, message: 'Class code is required' }
  }
  if (value.length !== 4) {
    return { valid: false, message: 'Class code must be 4 characters' }
  }
  return { valid: true, message: '' }
}
