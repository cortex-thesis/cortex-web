import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export interface AppNotification { id: string; kind: string; title: string; body: string; link: string; createdAt: string; read: boolean }
interface Payload { notifications: AppNotification[]; unread_count: number }
export function useNotifications() {
  const userId = useAuthStore(state => state.user?.id)
  const [data, setData] = useState<Payload>({ notifications: [], unread_count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!userId) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    let generation = 0
    const refresh = async () => {
      clearTimeout(timer)
      const current = ++generation
      try {
        const result = await api<Payload>('/notifications/', { cache: 'no-store' })
        if (!disposed && current === generation) { setData(result); setError('') }
      } catch (reason) { if (!disposed) setError(reason instanceof Error ? reason.message : 'Unable to load notifications.') }
      finally { if (!disposed && current === generation) { setLoading(false); timer = setTimeout(() => void refresh(), 10000) } }
    }
    const onChange = () => void refresh()
    void refresh()
    window.addEventListener('cortex:notifications', onChange)
    return () => { disposed = true; clearTimeout(timer); window.removeEventListener('cortex:notifications', onChange) }
  }, [userId])
  async function markRead(id?: string) {
    setBusy(true)
    try {
      const result = await api<Payload>('/notifications/', { method: 'POST', body: JSON.stringify(id ? { notification_id: id } : { all: true }) })
      setData(result); setError('')
      window.dispatchEvent(new Event('cortex:notifications'))
      return true
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to mark notifications read.'); return false }
    finally { setBusy(false) }
  }
  return { ...data, loading, error, busy, markRead }
}
