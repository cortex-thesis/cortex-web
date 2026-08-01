import { NavBarStudent, NavBarTeacher } from './components/molecules'
import { mockTeacher } from './mocks'

function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      {/* Student — bottom nav on cream background */}
      <div
        style={{
          background: '#FBF7EE',
          height: '200px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <NavBarStudent />
      </div>

      {/* Teacher — top nav on cool surface */}
      <div style={{ background: '#F8F8FC', minHeight: '200px' }}>
        <NavBarTeacher user={mockTeacher} hasNotification />
      </div>
    </div>
  )
}

export default App
