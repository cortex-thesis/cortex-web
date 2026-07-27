import ProgressBar from './components/atoms/ProgressBar/ProgressBar'
import SignalBar from './components/atoms/SignalBar/SignalBar'

function App() {
  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '400px',
        }}
      >
        <ProgressBar value={65} state="focused" showLabel />
        <ProgressBar value={40} state="relaxed" showLabel />
        <ProgressBar value={80} color="purple" size="md" showLabel />
        <ProgressBar value={25} state="overstimulated" size="lg" showLabel />
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end' }}>
        <SignalBar strength={0} />
        <SignalBar strength={1} />
        <SignalBar strength={2} />
        <SignalBar strength={3} />
        <SignalBar strength={4} />
      </div>
    </div>
  )
}

export default App
