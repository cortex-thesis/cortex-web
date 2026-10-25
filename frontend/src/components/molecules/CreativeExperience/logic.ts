import type { Draft } from './types'
import type { Task } from '../../../types'
export const ART_COLORS = ['#534ab7','#1d7a65','#cb5477','#e5aa35','#173b53']
export function restoredDraft(task: Task): Draft {
  const empty = { version: task.contentVersion ?? '' }
  try {
    const local = task.checkpointKey ? sessionStorage.getItem('cortex-creative:' + task.checkpointKey) : null
    const record = local ? JSON.parse(local) : null
    const value = record?.signature === JSON.stringify(task.experience) ? record.value : JSON.parse(task.initialResponse ?? 'null')
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== empty.version) return empty
    if (value.grid && (!Array.isArray(value.grid) || value.grid.length !== 2 || value.grid.some((r:unknown) => !Array.isArray(r) || r.length !== 4 || r.some(x=>typeof x!=='boolean')))) return empty
    if (value.objects && (!Array.isArray(value.objects) || value.objects.length > 12 || value.objects.some((o:unknown) => !o || typeof o!=='object' || !('shape' in o)))) return empty
    for (const key of ['visited','order','reflection','explored','path']) if (value[key] && !Array.isArray(value[key])) return empty
    for (const key of ['selections','links']) if (value[key] && (typeof value[key]!=='object' || Array.isArray(value[key]) || Object.values(value[key]).some(x=>!Array.isArray(x)))) return empty
    return value as Draft
  } catch { return empty }
}
export function checkpoint(task: Task, value: Draft) {
  if (!task.checkpointKey) return
  try { sessionStorage.setItem('cortex-creative:' + task.checkpointKey, JSON.stringify({ signature:JSON.stringify(task.experience), value })) } catch { /* In-memory work is still available. */ }
}
export function toggleSelection(selected:string[],id:string) { return selected.includes(id) ? selected.filter(x=>x!==id) : [...selected,id] }
export function beatEvents(grid:boolean[][], tempo:number) {
  const interval=60000/tempo
  return Array.from({length:4},(_,step)=>({at:step*interval,step,notes:grid.flatMap((row,track)=>row[step]?[track===0?220:440]:[])}))
}
