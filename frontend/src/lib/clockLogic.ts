export function clockAngles(hour: number, minute: number) {
  return { hour: (hour % 12) * 30 + minute * .5, minute: minute * 6 }
}
export function clockLabel(hour: number, minute: number, period: string) {
  return `${hour}:${String(minute).padStart(2, '0')} ${period === 'am' ? 'a.m.' : 'p.m.'}`
}
// Snap to the nearest hour or five-minute interval; the centre is not a target.
export function clockPoint(x: number, y: number, hand: 'hour' | 'minute'): number | null {
  if (Math.hypot(x, y) < 20) return null
  const angle = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360
  const index = Math.round(angle / 30) % 12
  return hand === 'hour' ? index || 12 : index * 5
}
