import { BreathingGuide } from './components/molecules'

function App() {
  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <BreathingGuide
          showAudio
          onCycleComplete={() => console.log('Cycle complete')}
        />
      </div>
    </div>
  )
}

export default App
