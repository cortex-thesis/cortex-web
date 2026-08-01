import { useState } from 'react'
import { CodeInput } from './components/molecules'

function App() {
  const [code, setCode] = useState('')
  const [codeState, setCodeState] = useState<'default' | 'error' | 'success'>(
    'default'
  )

  function handleComplete(value: string) {
    if (value === 'K79F') {
      setCodeState('success')
    } else {
      setCodeState('error')
    }
  }

  function handleChange(value: string) {
    setCode(value)
    if (codeState !== 'default') setCodeState('default')
  }

  return (
    <div
      style={{
        padding: '60px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '32px',
        background: '#FBF7EE',
        minHeight: '100vh',
      }}
    >
      <CodeInput
        value={code}
        onChange={handleChange}
        onComplete={handleComplete}
        fieldState={codeState}
        errorText="Class code not found. Please try again."
        successText="Joining Life Skills..."
      />

      <p style={{ fontSize: '13px', color: '#5F5E5A' }}>
        Try typing: K79F (correct) or anything else (error)
      </p>
    </div>
  )
}

export default App
