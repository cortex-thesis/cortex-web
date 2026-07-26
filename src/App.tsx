import { StateBadge, Button, Avatar } from './components/atoms'

function App() {
  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Avatar name="Daniel M." size="xs" />
        <Avatar name="Kyla Reyes" size="sm" />
        <Avatar name="Marco T." size="md" />
        <Avatar name="Sofia L." size="lg" />
        <Avatar name="Ms Santos" size="xl" />
      </div>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Avatar name="Daniel M." showStatus isOnline />
        <Avatar name="Kyla Reyes" showStatus isOnline={false} />
        <Avatar name="Marco T." color="coral" showStatus isOnline />
      </div>
    </div>
  )
}

export default App
