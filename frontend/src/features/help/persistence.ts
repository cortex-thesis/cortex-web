export type HelpRole = 'student' | 'teacher'
export const onboardingKey = (id: string, role: HelpRole) => `cortex:onboarding:v1:${role}:${encodeURIComponent(id)}`
const memory = new Set<string>()
export function hasSeenOnboarding(id: string, role: HelpRole) {
  const key = onboardingKey(id, role)
  try { return memory.has(key) || ['completed', 'dismissed'].includes(localStorage.getItem(key) ?? '') } catch { return memory.has(key) }
}
export function rememberOnboarding(id: string, role: HelpRole, status: 'completed' | 'dismissed') {
  const key = onboardingKey(id, role)
  memory.add(key)
  try { localStorage.setItem(key, status) } catch { /* Session fallback when storage is unavailable. */ }
}
