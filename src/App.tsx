import { useState } from 'react'
import { ToastNotification, AlertBanner } from './components/molecules'

function App() {
  const [toasts, setToasts] = useState<string[]>([])

  function addToast(variant: string) {
    const id = crypto.randomUUID()
    setToasts((t) => [...t, `${variant}|${id}`])
  }

  function removeToast(id: string) {
    setToasts((t) => t.filter((x) => x !== id))
  }

  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '440px',
      }}
    >
      <AlertBanner
        variant="success"
        title="Content validated"
        message="All items passed the validation check and are ready for use."
        dismissible
        onDismiss={() => console.log('dismissed')}
      />
      <AlertBanner
        variant="error"
        title="EEG signal lost"
        message="The headband connection was interrupted. Session is paused."
        dismissible
        onDismiss={() => console.log('dismissed')}
      />
      <AlertBanner
        variant="warning"
        message="Low signal strength. Ask the student to adjust their headband."
      />
      <AlertBanner
        variant="info"
        title="Mode overridden"
        message="You manually switched this student to Relax Mode."
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['success', 'error', 'warning', 'info'] as const).map((v) => (
          <button
            key={v}
            onClick={() => addToast(v)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E4E4EE',
              background: '#fff',
              fontFamily: 'Lexend',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Toast {v}
          </button>
        ))}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 999,
        }}
      >
        {toasts.map((t) => {
          const [variant, id] = t.split('|')
          return (
            <ToastNotification
              key={id}
              variant={variant as 'success' | 'error' | 'warning' | 'info'}
              message={`This is a ${variant} toast notification.`}
              onDismiss={() => removeToast(t)}
            />
          )
        })}
      </div>
    </div>
  )
}

export default App
