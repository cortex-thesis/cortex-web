import { useEffect } from 'react'
import AppRouter from './router'
import ClassSessionInvitation from './components/organisms/student/ClassSessionInvitation'
import { useAuthStore } from './store/authStore'
import SyncStatus from './components/SyncStatus'

export default function App() {
  const initialize = useAuthStore((state) => state.initialize)
  const initialized = useAuthStore((state) => state.isInitialized)
  useEffect(() => { void initialize() }, [initialize])
  if (!initialized) return <><main role="status" style={{ padding: '2rem', textAlign: 'center' }}>Loading Cortex…</main><SyncStatus /></>
  return <><AppRouter /><ClassSessionInvitation /><SyncStatus /></>
}
