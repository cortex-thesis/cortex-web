export type TourRun = { index: number; phase: 'welcome' | 'running' | 'complete'; route: string; history?: string[]; pending?: boolean }
const legacyStudentSteps = [0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10]
export const tourRunKey = (id: string, role: 'student' | 'teacher') => `cortex:tour:${role === 'student' ? 'v6' : 'v4'}:${role}:${encodeURIComponent(id)}`
export function readTourRun(key: string, count: number): TourRun | null {
  try {
    let value = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!value && key.includes(':v6:student:')) {
      for (const version of ['v5', 'v4']) {
        const legacyKey = key.replace(':v6:', `:${version}:`)
        const legacy = JSON.parse(sessionStorage.getItem(legacyKey) || 'null')
        if (!legacy || !Number.isInteger(legacy.index) || legacy.index < 0 || !['welcome', 'running'].includes(legacy.phase) || typeof legacy.route !== 'string') continue
        const mapped = version === 'v4' ? legacyStudentSteps[legacy.index] : legacy.index < 3 ? 0 : legacy.index + 2
        if (mapped === undefined || mapped >= count) continue
        // Popup-only practice had no selected lesson. Resume at the restored
        // entry; later features keep their place and completion flags stay intact.
        const route = mapped === 0 ? '/student/home' : legacy.route.includes('/practice') ? `${legacy.route.split('?')[0]}?context=onboarding&stage=${mapped === 4 ? 'finish' : 'activity'}` : legacy.route
        const history = Array.from({ length: mapped }, () => '/student/home')
        if (Array.isArray(legacy.history)) {
          for (let i = 0; i < legacy.index; i++) {
            const destination = version === 'v4' ? legacyStudentSteps[i] : i < 3 ? 0 : i + 2
            const oldRoute = legacy.history[i]
            if (destination < mapped && typeof oldRoute === 'string') history[destination] = oldRoute.includes('/practice') ? `${oldRoute.split('?')[0]}?context=onboarding&stage=${destination === 4 ? 'finish' : 'activity'}` : oldRoute
          }
        }
        value = { index: mapped, phase: legacy.phase, route, history }
        try { sessionStorage.setItem(key, JSON.stringify(value)); sessionStorage.removeItem(legacyKey) } catch { /* Use migrated progress in memory. */ }
        break
      }
    }
    return value && Number.isInteger(value.index) && value.index >= 0 && value.index < count && ['welcome', 'running'].includes(value.phase) && typeof value.route === 'string' && (value.history === undefined || (Array.isArray(value.history) && value.history.every((route: unknown) => typeof route === 'string'))) ? value : null
  } catch { return null }
}
