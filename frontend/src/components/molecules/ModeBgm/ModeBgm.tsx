import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cachedApiValue } from '../../../lib/api'
import styles from './ModeBgm.module.css'
import { fadeVolume } from './fadeVolume'

interface ModeBgmProps { mode: 'focus' | 'relax'; suspended?: boolean }

export default function ModeBgm({ mode, suspended = false }: ModeBgmProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const cancelFade = useRef<(() => void) | null>(null)
  const otherMedia = useRef(new Set<HTMLMediaElement>())
  const [volumePercent, setVolumePercent] = useState(() => {
    try {
      const stored = localStorage.getItem('cortex-bgm-volume')
      if (stored !== null && stored.trim() !== '' && Number.isFinite(Number(stored))) return Math.min(100, Math.max(0, Number(stored)))
    } catch { /* Private browsing can disable storage. */ }
    return mode === 'focus' ? 10 : 13
  })
  const soundEnabled = cachedApiValue<{ sound_enabled: boolean }>('/student/preferences/')?.sound_enabled ?? true
  const volume = volumePercent / 100

  function updateVolume(value: number) {
    setVolumePercent(value)
    try { localStorage.setItem('cortex-bgm-volume', String(value)) } catch { /* Keep the in-memory setting. */ }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    cancelFade.current?.()
    if (!soundEnabled || suspended || !musicEnabled) {
      cancelFade.current = fadeVolume(audio, 0, () => audio.pause())
      return () => cancelFade.current?.()
    }
    if (audio.paused) audio.volume = 0
    let cancelled = false
    const start = () => {
      if (cancelled) return
      void audio.play().then(() => {
        if (cancelled) { if (!audio.isConnected) audio.pause(); return }
        setPlaying(true)
        cancelFade.current?.()
        cancelFade.current = fadeVolume(audio, otherMedia.current.size ? volume * 0.28 : volume)
      }).catch(() => { if (!cancelled) setPlaying(false) })
    }
    start()
    // Browsers may block autoplay until the learner interacts with the page.
    const unlock = () => { if (audio.paused) start() }
    document.addEventListener('pointerdown', unlock)
    document.addEventListener('keydown', unlock)
    return () => {
      cancelled = true
      document.removeEventListener('pointerdown', unlock)
      document.removeEventListener('keydown', unlock)
      cancelFade.current?.()
    }
  }, [mode, soundEnabled, volume, suspended, musicEnabled])

  useEffect(() => {
    const audio = audioRef.current
    return () => { cancelFade.current?.(); audio?.pause() }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateDucking = (event: Event) => {
      if (event.target === audio) return
      const other = event.target
      if (!(other instanceof HTMLMediaElement)) return
      if (event.type === 'ended' || other.paused) otherMedia.current.delete(other)
      else otherMedia.current.add(other)
      if (!soundEnabled || suspended || !musicEnabled) return
      cancelFade.current?.()
      cancelFade.current = fadeVolume(audio, otherMedia.current.size ? volume * 0.28 : volume)
    }
    document.addEventListener('play', updateDucking, true)
    document.addEventListener('pause', updateDucking, true)
    document.addEventListener('ended', updateDucking, true)
    return () => {
      document.removeEventListener('play', updateDucking, true)
      document.removeEventListener('pause', updateDucking, true)
      document.removeEventListener('ended', updateDucking, true)
    }
  }, [volume, soundEnabled, suspended, musicEnabled])

  function toggle() {
    const audio = audioRef.current
    if (!audio || !soundEnabled || suspended) return
    if (musicEnabled && !audio.paused) setMusicEnabled(false)
    else {
      setMusicEnabled(true)
      audio.volume = 0
      void audio.play().then(() => {
        cancelFade.current?.()
        cancelFade.current = fadeVolume(audio, volume)
      }).catch(() => setPlaying(false))
    }
  }

  return <div className={`${styles.control} ${styles[mode]}`}>
    <audio ref={audioRef} src={`/assets/sounds/bgm/${mode}-mode.mp3`} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <Music2 size={16} aria-hidden="true" />
    <span>{mode === 'focus' ? 'Focus music' : 'Relax music'}</span>
    <button type="button" onClick={toggle} aria-pressed={playing} disabled={!soundEnabled || suspended} aria-label={!soundEnabled ? 'Sound is disabled in settings' : playing ? `Pause ${mode} music` : `Play ${mode} music`}>
      {!soundEnabled ? <VolumeX size={16} /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      <span>{!soundEnabled || !musicEnabled ? 'Off' : suspended ? 'Paused' : playing ? 'On' : 'Off'}</span>
    </button>
    <label className={styles.volume}>
      <Volume2 size={15} aria-hidden="true" />
      <input type="range" min="0" max="100" step="1" value={volumePercent} onChange={event => updateVolume(Number(event.target.value))} aria-label={`${mode === 'focus' ? 'Focus' : 'Relax'} music volume`} disabled={!soundEnabled} />
      <span>{volumePercent}%</span>
    </label>
  </div>
}
