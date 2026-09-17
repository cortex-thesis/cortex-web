/** Cancelable ease-out ramp: pause only after the volume reaches zero. */
export function fadeVolume(audio: HTMLMediaElement, target: number, done?: () => void, duration = 650) {
  const initial = audio.volume
  const started = performance.now()
  let frame = 0
  let cancelled = false
  const tick = (now: number) => {
    if (cancelled) return
    const progress = Math.min(1, Math.max(0, (now - started) / duration))
    const eased = 1 - (1 - progress) ** 3
    audio.volume = Math.min(1, Math.max(0, initial + (target - initial) * eased))
    if (progress < 1) frame = requestAnimationFrame(tick)
    else done?.()
  }
  frame = requestAnimationFrame(tick)
  return () => { cancelled = true; cancelAnimationFrame(frame) }
}
