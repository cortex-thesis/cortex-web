import type { HelpRole } from '../../features/help/persistence'

export const introductionKey = (id: string, role: HelpRole) => `cortex:introduction:v1:${role}:${encodeURIComponent(id)}`
type Introduction = { step: number; status?: 'completed' | 'dismissed' }
const memory = new Map<string, Introduction>()
const animations = new Set<string>()
export function readIntroduction(key: string): Introduction {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    if (value && Number.isInteger(value.step) && value.step >= 0 && value.step < 3 && (value.status === undefined || value.status === 'completed' || value.status === 'dismissed')) return value
  } catch { /* Storage may be unavailable. */ }
  return memory.get(key) ?? { step: 0 }
}
export function saveIntroduction(key: string, value: Introduction) {
  memory.set(key, value)
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory fallback for this page session. */ }
}
export function hasPlayedIntroduction(key: string) {
  try { return animations.has(key) || sessionStorage.getItem(`${key}:animation`) === 'played' } catch { return animations.has(key) }
}
export function rememberIntroductionAnimation(key: string) {
  animations.add(key)
  try { sessionStorage.setItem(`${key}:animation`, 'played') } catch { /* In-memory fallback. */ }
}
