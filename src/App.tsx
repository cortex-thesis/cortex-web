import { useState } from 'react'
import { BreadcrumbBar } from './components/molecules'
import type { CognitiveState } from './constants/states'

function App() {
  const [state, setState] = useState<CognitiveState>('focused')

  const states: CognitiveState[] = [
    'focused',
    'relaxed',
    'distracted',
    'overstimulated',
  ]

  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        paddingTop: '40px',
      }}
    >
      <BreadcrumbBar
        className_name="Life Skills"
        state={state}
        signalStrength={3}
        isLive
        taskIndex={1}
        taskTotal={5}
      />

      <BreadcrumbBar
        className_name="Self Care"
        state="relaxed"
        signalStrength={4}
        isLive
      />

      <BreadcrumbBar
        className_name="Work Habits"
        state="distracted"
        signalStrength={1}
        isLive
        taskIndex={3}
        taskTotal={5}
      />

      <BreadcrumbBar className_name="Advocacy" signalStrength={0} isLive />

      <div style={{ padding: '0 20px', display: 'flex', gap: '12px' }}>
        {states.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #E4E4EE',
              background: state === s ? '#534AB7' : '#fff',
              color: state === s ? '#fff' : '#1A1A2E',
              fontFamily: 'Lexend',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
