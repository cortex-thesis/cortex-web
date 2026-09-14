import { Music2, Pause, Play, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cachedApiValue } from '../../../lib/api'
import styles from './ModeBgm.module.css'

interface ModeBgmProps { mode: 'focus' | 'relax' }

export default function ModeBgm({ mode }: ModeBgmProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const soundEnabled = cachedApiValue<{ sound_enabled: boolean }>('/student/preferences/')?.sound_enabled ?? true
  const volume = mode === 'focus' ? 0.1 : 0.13

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !soundEnabled) return
    audio.volume = volume
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    return () => { audio.pause() }
  }, [mode, soundEnabled, volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const updateDucking = (event: Event) => {
      if (event.target === audio) return
      const other = event.target
      if (other instanceof HTMLMediaElement) audio.volume = other.paused ? volume : volume * 0.28
    }
    document.addEventListener('play', updateDucking, true)
    document.addEventListener('pause', updateDucking, true)
    document.addEventListener('ended', updateDucking, true)
    return () => {
      document.removeEventListener('play', updateDucking, true)
      document.removeEventListener('pause', updateDucking, true)
      document.removeEventListener('ended', updateDucking, true)
    }
  }, [volume])

  function toggle() {
    const audio = audioRef.current
    if (!audio || !soundEnabled) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  return <div className={`${styles.control} ${styles[mode]}`}>
    <audio ref={audioRef} src={`/assets/sounds/bgm/${mode}-mode.mp3`} loop preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <Music2 size={16} aria-hidden="true" />
    <span>{mode === 'focus' ? 'Focus music' : 'Relax music'}</span>
    <button type="button" onClick={toggle} disabled={!soundEnabled} aria-label={!soundEnabled ? 'Sound is disabled in settings' : playing ? `Pause ${mode} music` : `Play ${mode} music`}>
      {!soundEnabled ? <VolumeX size={16} /> : playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
    </button>
  </div>
}
