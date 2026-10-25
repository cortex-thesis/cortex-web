// Browser-local commit measurements only; these are not network or pipeline latency.
// No student identifiers, cognitive states, or samples are included.
export function measurePresentation(receivedAt: number, phase: 'state-render' | 'adaptation' | 'dashboard-render', sequence?: number) {
  const end = performance.now()
  if (!Number.isFinite(receivedAt) || receivedAt < 0 || end < receivedAt) return
  const name = `cortex:${phase}`
  // Keep a single entry per phase rather than growing the performance buffer.
  performance.clearMeasures(name)
  performance.measure(name, { start: receivedAt, end, detail: { sequence: sequence ?? null, clock: 'browser-monotonic', boundary: 'react-effect' } })
}
