import { StateBadge, Button } from './components/atoms'

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
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Button variant="primary">Primary</Button>
        <Button variant="coral">Let's go</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Delete</Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Button size="sm" variant="primary">
          Small
        </Button>
        <Button size="md" variant="primary">
          Medium
        </Button>
        <Button size="lg" variant="coral">
          Large
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </div>

      <Button fullWidth variant="coral" size="lg">
        Full width — Let's go
      </Button>

      <div style={{ display: 'flex', gap: '12px' }}>
        <StateBadge state="focused" />
        <StateBadge state="distracted" />
      </div>
    </div>
  )
}

export default App
