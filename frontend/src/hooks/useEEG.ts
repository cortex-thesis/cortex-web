import { useState, useEffect, useRef, useCallback } from 'react'
import { createMockEEGStream } from '../mocks'
import type { CognitiveState } from '../constants/states'
import type { BandPowers } from '../types'

interface EEGData {
  state: CognitiveState | null
  bandPowers: BandPowers | null
  signalStrength: 0 | 1 | 2 | 3 | 4
  lastUpdated: number | null
}

interface UseEEGReturn {
  eegData: EEGData
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  // Mock-only controls, used by DevEEGPanel for manual testing. Both
  // are safe no-ops when IS_MOCK is false (real WebSocket mode) —
  // there's nothing to override once real EEG data is flowing.
  isManualOverride: boolean
  setMockState: (state: CognitiveState) => void
  resumeAutoCycle: () => void
}

const IS_MOCK = import.meta.env.VITE_EEG_MOCK !== 'false'

function randomBandPowers(): BandPowers {
  return {
    theta: Math.random() * 10 + 1,
    alpha: Math.random() * 8 + 1,
    beta: Math.random() * 12 + 2,
    gamma: Math.random() * 5 + 0.5,
    tbr: Math.random() * 3 + 0.3,
  }
}

export function useEEG(_sessionId: string): UseEEGReturn {
  const [eegData, setEegData] = useState<EEGData>({
    state: 'focused',
    bandPowers: null,
    signalStrength: 3,
    lastUpdated: null,
  })

  const [connectionStatus, setConnectionStatus] = useState<
    UseEEGReturn['connectionStatus']
  >(IS_MOCK ? 'connected' : 'connecting')

  const [isManualOverride, setIsManualOverride] = useState(false)
  const stopStreamRef = useRef<(() => void) | null>(null)

  const startAutoCycle = useCallback(() => {
    stopStreamRef.current?.()
    stopStreamRef.current = createMockEEGStream((state: CognitiveState) => {
      setEegData({
        state,
        bandPowers: randomBandPowers(),
        signalStrength: 3,
        lastUpdated: Date.now(),
      })
    }, 5000)
  }, [])

  useEffect(() => {
    if (IS_MOCK) {
      startAutoCycle()
      return () => stopStreamRef.current?.()
    }

    const wsUrl = import.meta.env.VITE_WS_URL
    const ws = new WebSocket(`${wsUrl}/ws/session/${_sessionId}/`)

    ws.onopen = () => setConnectionStatus('connected')
    ws.onerror = () => setConnectionStatus('error')
    ws.onclose = () => setConnectionStatus('disconnected')

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'eeg_update') {
        setEegData({
          state: data.state,
          bandPowers: data.band_powers,
          signalStrength: data.signal_strength,
          lastUpdated: Date.now(),
        })
      }
    }

    const pollCommands = window.setInterval(() => {
      fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/sessions/${_sessionId}/interventions/delivery/`, { credentials: 'include' })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((payload: { commands: Array<{ id: string; action: string; mode?: string; status: string }> }) => {
          payload.commands.forEach((command) => {
            if (command.action === 'set_mode' && (command.mode === 'focus' || command.mode === 'relax')) {
              setEegData((previous) => ({ ...previous, state: command.mode === 'focus' ? 'focused' : 'relaxed', lastUpdated: Date.now() }))
            }
            fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/sessions/${_sessionId}/interventions/delivery/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ intervention_id: command.id, status: 'applied' }) }).catch(() => undefined)
          })
        })
        .catch(() => undefined)
    }, 1000)

    return () => {
      window.clearInterval(pollCommands)
      ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_sessionId])

  // Forces a specific state and stops the automatic cycle from
  // overwriting it — otherwise whatever you set would get clobbered
  // by the next scheduled tick within 5s.
  const setMockState = useCallback((state: CognitiveState) => {
    if (!IS_MOCK) return
    stopStreamRef.current?.()
    setIsManualOverride(true)
    setEegData({
      state,
      bandPowers: randomBandPowers(),
      signalStrength: 3,
      lastUpdated: Date.now(),
    })
  }, [])

  const resumeAutoCycle = useCallback(() => {
    if (!IS_MOCK) return
    setIsManualOverride(false)
    startAutoCycle()
  }, [startAutoCycle])

  return {
    eegData,
    connectionStatus,
    isManualOverride,
    setMockState,
    resumeAutoCycle,
  }
}
