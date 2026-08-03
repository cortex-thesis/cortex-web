import { useState } from 'react'
import { TaskCard } from './components/molecules'
import { mockTask } from './mocks'

function App() {
  const [result, setResult] = useState<string | null>(null)

  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <TaskCard
          task={mockTask}
          showNudge
          onAnswered={(correct, selected) =>
            setResult(
              correct ? `Correct! "${selected}"` : `Wrong. "${selected}"`
            )
          }
        />
      </div>

      {result && (
        <p
          style={{
            fontFamily: 'Lexend',
            fontSize: '14px',
            color: result.startsWith('Correct') ? '#1D9E75' : '#D85A30',
          }}
        >
          {result}
        </p>
      )}
    </div>
  )
}

export default App
