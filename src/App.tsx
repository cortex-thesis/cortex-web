import { useState, useEffect } from 'react'
import { EEGWaveDisplay } from './components/molecules'
import { createMockEEGStream } from './mocks'
import type { CognitiveState } from './constants/states'
import type { BandPowers } from './types'

function App() {
  const [state, setState] = useState<CognitiveState>('focused')
  const [bands, setBands] = useState<BandPowers>({
    theta: 3.2,
    alpha: 5.1,
    beta: 8.4,
    gamma: 2.1,
    tbr: 0.38,
  })

  useEffect(() => {
    const stop = createMockEEGStream((newState) => {
      setState(newState)
      setBands({
        theta: Math.random() * 10 + 1,
        alpha: Math.random() * 8 + 1,
        beta: Math.random() * 12 + 2,
        gamma: Math.random() * 5 + 0.5,
        tbr: Math.random() * 3 + 0.3,
      })
    }, 3000)
    return stop
  }, [])

  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: '300px' }}>
        <EEGWaveDisplay state={state} bandPowers={bands} />
      </div>
      <div style={{ width: '300px' }}>
        <EEGWaveDisplay state={null} bandPowers={null} />
      </div>
    </div>
  )
}

export default App
