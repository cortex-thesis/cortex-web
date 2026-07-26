import { StateBadge } from './components/atoms'

function App() {
  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <StateBadge state="focused" />
      <StateBadge state="relaxed" />
      <StateBadge state="distracted" />
      <StateBadge state="overstimulated" />
      <StateBadge state="focused" size="sm" />
      <StateBadge state="distracted" size="lg" />
    </div>
  )
}

export default App
