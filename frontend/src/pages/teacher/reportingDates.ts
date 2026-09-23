export function periodRange(start: string, end: string) {
  const last = new Date(end)
  last.setDate(last.getDate() - 1)
  return `${new Date(start).toLocaleDateString()} – ${last.toLocaleDateString()}`
}

