import { StudentStateCard } from './components/molecules'
import { mockStudentsLive } from './mocks'

function App() {
  return (
    <div
      style={{
        background: '#F8F8FC',
        minHeight: '100vh',
        padding: '40px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}
    >
      {mockStudentsLive.map((student) => (
        <div key={student.id} style={{ width: '200px' }}>
          <StudentStateCard
            student={student}
            onOverride={(id) => console.log('Override:', id)}
          />
        </div>
      ))}

      <div style={{ width: '200px' }}>
        <StudentStateCard
          student={{
            id: 'student-004',
            name: 'Jana L.',
            avatar: null,
            currentState: null,
            signalStrength: 0,
            focusScore: 0,
            sessionDuration: 0,
            isConnected: false,
          }}
          onOverride={(id) => console.log('Override:', id)}
        />
      </div>
    </div>
  )
}

export default App
