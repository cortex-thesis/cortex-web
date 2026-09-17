import { useEffect, useRef, useState } from 'react'
import { cachedApiValue } from '../../lib/api'

export default function BinauralAmbient({ paused = false }: { paused?: boolean }) {
  const audio = useRef<AudioContext | null>(null)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const enabled = cachedApiValue<{ sound_enabled: boolean }>('/student/preferences/')?.sound_enabled ?? true
  useEffect(() => {
    if (!enabled || typeof AudioContext === 'undefined') return
    const context = new AudioContext()
    audio.current = context
    const merger = context.createChannelMerger(2)
    const volume = context.createGain()
    volume.gain.setValueAtTime(0, context.currentTime)
    volume.gain.linearRampToValueAtTime(.012, context.currentTime + 2)
    merger.connect(volume); volume.connect(context.destination)
    const tones = [180, 186].map((frequency, index) => {
      const tone = context.createOscillator(); tone.frequency.value = frequency
      tone.connect(merger, 0, index); tone.start(); return tone
    })
    context.onstatechange = () => setPlaying(context.state === 'running')
    return () => { context.onstatechange = null; tones.forEach(tone => tone.stop()); void context.close(); audio.current = null }
  }, [enabled])
  useEffect(() => {
    const context = audio.current
    if (!context) return
    if (paused || muted) void context.suspend().catch(() => {})
    else void context.resume().catch(() => {})
  }, [paused, muted, enabled])
  return <button type="button" disabled={!enabled || paused} aria-pressed={playing} onClick={() => {
    if (!audio.current) return
    if (playing) { setMuted(true); void audio.current.suspend() }
    else { setMuted(false); void audio.current.resume() }
  }}>{!enabled ? 'Sound disabled in settings' : playing ? 'Pause quiet ambient audio' : 'Play quiet ambient audio'}</button>
}
