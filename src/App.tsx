import { TeacherTabTemplate } from './components/templates'
import { StreakCard } from './components/molecules'

function App() {
  const mockTabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'students', label: 'Students', path: '/students' },
    { id: 'settings', label: 'Settings', path: '/settings' },
  ]

  return (
    <TeacherTabTemplate
      user={{
        name: 'Teacher Jane',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
      }}
      tabs={mockTabs}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
        }}
      >
        <StreakCard count={7} />
      </div>
    </TeacherTabTemplate>
  )
}

export default App
