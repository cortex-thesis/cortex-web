import type { Task } from '../types'

// Tab-local, account/context-scoped recovery. Not a server progress award.
function signature(task: Task) { return JSON.stringify([task.taskTemplate, task.items, task.missions, task.correctItemIds, task.clockRounds, task.clockMode]) }
export function loadGardenCheckpoint<T>(task: Task, validate: (value: unknown) => value is T): T | null {
  if (!task.checkpointKey) return null
  try {
    const record = JSON.parse(sessionStorage.getItem('cortex-garden:' + task.checkpointKey) ?? 'null')
    return record?.signature === signature(task) && validate(record.value) ? record.value : null
  } catch { return null }
}
export function saveGardenCheckpoint(task: Task, value: unknown) {
  if (!task.checkpointKey) return
  try { sessionStorage.setItem('cortex-garden:' + task.checkpointKey, JSON.stringify({ signature: signature(task), value })) } catch { /* In-session React state remains usable when storage is blocked. */ }
}
