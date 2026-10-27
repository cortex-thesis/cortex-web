export const registrationFieldNames: Record<string, string> = { first_name: 'firstName', middle_name: 'middleName', last_name: 'lastName', school_id: 'schoolId', student_number: 'studentNumber', guardian_name: 'guardianName', guardian_contact: 'guardianContact', guardian_email: 'guardianEmail', confirm_password: 'confirmPassword' }
export function validateRegistration(form: Record<string, string>, role: string) {
  const errors: Record<string, string> = {}
  for (const [key, limit] of Object.entries({ username: 150, email: 254, firstName: 150, middleName: 150, lastName: 150, studentNumber: 50, guardianName: 200, guardianContact: 30, guardianEmail: 254 })) {
    if (form[key].trim().length > limit) errors[key] = `Use at most ${limit} characters.`
  }
  for (const key of ['username', 'email', 'firstName', 'lastName', 'schoolId', 'password', 'confirmPassword', ...(role === 'student' ? ['studentNumber', 'birthdate', 'guardianName', 'guardianContact', 'guardianEmail'] : [])]) {
    if (!form[key].trim()) errors[key] = 'This field is required.'
  }
  for (const key of ['firstName', 'middleName', 'lastName', ...(role === 'student' ? ['guardianName'] : [])]) {
    if (form[key].trim() && (/\p{N}/u.test(form[key]) || !/\p{L}/u.test(form[key]))) errors[key] = 'Enter a name without numbers.'
  }
  for (const key of ['email', ...(role === 'student' ? ['guardianEmail'] : [])]) {
    const value = form[key].trim()
    if (value && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) || value.startsWith('.') || value.includes('..'))) errors[key] = 'Enter a valid email address with a domain.'
  }
  if (!/^[\p{L}\p{N}@.+_-]+$/u.test(form.username.trim()) && form.username.trim()) errors.username = 'Use letters, digits or @ . + - _ only.'
  if (role === 'student') {
    if (form.studentNumber.trim() && !/^[0-9]+$/.test(form.studentNumber.trim())) errors.studentNumber = 'Use digits only.'
    if (form.guardianContact.trim() && (!/^\+?[0-9 ()-]+$/.test(form.guardianContact.trim()) || !/[0-9]/.test(form.guardianContact))) errors.guardianContact = 'Use digits, spaces, parentheses or hyphens, with an optional leading +.'
    if (form.birthdate && (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthdate) || Number.isNaN(Date.parse(form.birthdate)) || (!Number.isNaN(Date.parse(form.birthdate)) && new Date(form.birthdate).toISOString().slice(0, 10) !== form.birthdate) || form.birthdate > new Date().toLocaleDateString('sv-SE'))) errors.birthdate = 'Enter a valid birthdate that is not in the future.'
  }
  if ([form.firstName, form.middleName, form.lastName].map(v => v.trim()).filter(Boolean).join(' ').length > 160) errors.firstName = 'Use at most 160 characters for the combined full name.'
  if (form.password && form.password.length < 12) errors.password = 'Password must be at least 12 characters.'
  if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
