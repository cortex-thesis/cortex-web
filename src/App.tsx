import { SessionCard } from './components/molecules'

function App() {
  return (
    <div
      style={{
        background: '#FBF7EE',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '480px',
      }}
    >
      <SessionCard
        session={{
          classId: 'class-001',
          className: 'Life Skills — Getting Ready for School',
          iconEmoji: '🍳',
          iconBg: '#E1F5EE',
          taskIndex: 3,
          taskTotal: 5,
          progress: 65,
        }}
        onResume={() => console.log('Resuming...')}
      />

      <SessionCard
        session={null}
        onStart={() => console.log('Starting new session...')}
      />
    </div>
  )
}

export default App
