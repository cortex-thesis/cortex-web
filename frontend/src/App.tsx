import { useEffect } from 'react'
import AppRouter from './router'
import { useAuthStore } from './store/authStore'

export default function App() {
  const initialize = useAuthStore((state) => state.initialize)
  const initialized = useAuthStore((state) => state.isInitialized)
  useEffect(() => { void initialize() }, [initialize])
  if (!initialized) return null
  return <AppRouter />
}
