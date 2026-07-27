import { Skeleton, Dot, Divider } from './components/atoms'

function App() {
  return (
    <div
      style={{
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        maxWidth: '400px',
      }}
    >
      {/* Skeleton — card placeholder */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton circle width={40} height={40} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={14} />
        </div>
      </div>
      <Skeleton height={80} borderRadius={12} />

      <Divider />

      {/* Dot — pagination */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Dot size="sm" color="active" />
        <Dot size="sm" color="inactive" />
        <Dot size="sm" color="inactive" />
      </div>

      {/* Dot — state colors */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Dot size="md" color="focused" />
        <Dot size="md" color="relaxed" />
        <Dot size="md" color="distracted" />
        <Dot size="md" color="overstimulated" />
      </div>

      <Divider label="or" />

      {/* Divider — vertical */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '13px' }}>Home</span>
        <Divider orientation="vertical" />
        <span style={{ fontSize: '13px' }}>Classes</span>
        <Divider orientation="vertical" />
        <span style={{ fontSize: '13px' }}>Profile</span>
      </div>
    </div>
  )
}

export default App
