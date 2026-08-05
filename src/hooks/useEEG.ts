import { useState, useEffect } from 'react'
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
}

const IS_MOCK = true

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

  useEffect(() => {
    if (IS_MOCK) {
      const stop = createMockEEGStream((state: CognitiveState) => {
        setEegData({
          state,
          bandPowers: {
            theta: Math.random() * 10 + 1,
            alpha: Math.random() * 8 + 1,
            beta: Math.random() * 12 + 2,
            gamma: Math.random() * 5 + 0.5,
            tbr: Math.random() * 3 + 0.3,
          },
          signalStrength: 3,
          lastUpdated: Date.now(),
        })
      }, 5000)
      return stop
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

    return () => ws.close()
  }, [_sessionId])

  return { eegData, connectionStatus }
}
