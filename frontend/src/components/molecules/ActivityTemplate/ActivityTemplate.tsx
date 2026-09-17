import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Pause, Play, Sparkles, Volume2 } from 'lucide-react'
import type { Task } from '../../../types'
import BreathingGuide from '../BreathingGuide'
import styles from './ActivityTemplate.module.css'
import { AdaptiveLessonText } from '../TaskCard/FocusSupport'

interface ActivityTemplateProps {
  task: Task
  onCompleted?: () => void
}

function MediaButton({ playing, label, onClick }: { playing: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.mediaButton} onClick={onClick} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`}>
      {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
    </button>
  )
}

function StepAudioButton({ src, label }: { src: string; label: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  return (
    <>
      <button type="button" className={`${styles.listenButton} ${isPlaying ? styles.listenButtonPlaying : ''}`} onClick={toggle} aria-label={`${isPlaying ? 'Pause' : 'Listen to'} ${label}`}>
        {isPlaying ? <Pause size={15} fill="currentColor" /> : <Volume2 size={16} />}
        <span>{isPlaying ? 'Pause' : 'Listen'}</span>
      </button>
      <audio className={styles.hiddenAudio} ref={audioRef} src={src} preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} />
    </>
  )
}

function youtubeEmbedUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    const id = url.hostname === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : url.hostname.endsWith('youtube.com')
        ? url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v')
        : null
    const origin = typeof window === 'undefined' ? '' : `&origin=${encodeURIComponent(window.location.origin)}`
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&enablejsapi=1${origin}` : null
  } catch {
    return null
  }
}

interface YouTubePlayer {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
  pauseVideo: () => void
}

declare global {
  interface Window {
    YT?: { Player: new (element: HTMLIFrameElement, options: { events: { onReady: () => void } }) => YouTubePlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<NonNullable<Window['YT']>> | null = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT) resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

function YouTubeVideo({ src, title, onHalfWatched }: { src: string; title: string; onHalfWatched?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const completedRef = useRef(false)
  const callbackRef = useRef(onHalfWatched)
  useEffect(() => { callbackRef.current = onHalfWatched }, [onHalfWatched])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // YouTube.destroy removes its iframe. Own it inside a stable React host
    // so Activity hide/show and Strict Mode can create a fresh frame safely.
    const frame = document.createElement('iframe')
    frame.className = styles.video
    frame.src = src
    frame.title = title
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    frame.allowFullscreen = true
    host.replaceChildren(frame)
    let player: YouTubePlayer | null = null
    let timer: number | null = null
    let cancelled = false
    const pause = () => player?.pauseVideo()
    window.addEventListener('cortex:pause-media', pause)
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !frame.isConnected) return
      player = new YT.Player(frame, { events: { onReady: () => {
        if (cancelled) return
        timer = window.setInterval(() => {
          if (!player || completedRef.current) return
          const duration = player.getDuration()
          if (duration > 0 && player.getCurrentTime() / duration >= 0.5) {
            completedRef.current = true
            callbackRef.current?.()
          }
        }, 750)
      } } })
    })
    return () => {
      cancelled = true
      window.removeEventListener('cortex:pause-media', pause)
      if (timer !== null) window.clearInterval(timer)
      player?.destroy()
      frame.remove()
    }
  }, [src, title])

  return <div ref={hostRef} className={styles.youtubeHost} />
}

function ActivityTemplate({ task, onCompleted }: ActivityTemplateProps) {
  const [playing, setPlaying] = useState(false)
  const template = task.template ?? 'multiple_choice'
  const youtubeUrl = youtubeEmbedUrl(task.mediaUrl)
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  useEffect(() => {
    const media = mediaRef.current
    return () => { media?.pause() }
  }, [])

  if (youtubeUrl) {
    return <section className={`${styles.panel} ${styles.youtubePanel}`}>
      <YouTubeVideo src={youtubeUrl} title={task.contentLabel ?? task.title} onHalfWatched={onCompleted} />
    </section>
  }

  if (task.mediaUrl && (task.contentType === 'audio' || task.contentType === 'video' || template === 'instructional_video' || template === 'calming_soundscape')) {
    if (task.contentType === 'audio' || template === 'calming_soundscape') {
      return <section className={`${styles.panel} ${styles.audioPanel}`}>
        <audio ref={(node) => { mediaRef.current = node }} className={styles.hiddenAudio} src={task.mediaUrl} preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); onCompleted?.() }} />
        <MediaButton playing={playing} label={task.contentLabel ?? task.title} onClick={() => {
          const media = mediaRef.current
          if (!media) return
          if (media.paused) void media.play().catch(() => setPlaying(false))
          else media.pause()
        }} />
        <div className={styles.mediaCopy}><strong>{task.contentLabel ?? task.title}</strong><span>{task.contentDescription}</span></div>
        <div className={`${styles.waveform} ${playing ? '' : styles.waveformPaused}`} aria-hidden="true">
          {[8, 15, 22, 12, 26, 18, 10, 20, 14, 8].map((height, index) => <span key={index} style={{ height, animationDelay: `${index * 80}ms` }} />)}
        </div>
      </section>
    }
    return <section className={styles.panel}>
      <video ref={(node) => { mediaRef.current = node }} className={styles.video} src={task.mediaUrl} controls preload="metadata" onEnded={onCompleted} aria-label={task.contentLabel ?? task.title} />
    </section>
  }

  if (template === 'multiple_choice') return null

  if (template === 'instructional_video') {
    return (
      <section className={`${styles.panel} ${styles.videoPanel}`} aria-label="Instructional video">
        {task.mediaUrl ? (
          <video className={styles.video} src={task.mediaUrl} controls preload="metadata" aria-label={task.contentLabel ?? task.title} />
        ) : (
          <>
            <MediaButton playing={playing} label="instructional video" onClick={() => setPlaying((value) => !value)} />
            <div className={styles.mediaCopy}><strong>{task.contentLabel ?? task.title}</strong><span>{task.contentDescription}</span></div>
            <span className={styles.duration}>{task.durationSeconds ? `${task.durationSeconds}s` : 'Short video'}</span>
          </>
        )}
      </section>
    )
  }

  if (template === 'visual_narrative') {
    return (
      <>
        {task.mediaUrl && <audio className={styles.readingAudio} src={task.mediaUrl} controls preload="metadata" aria-label={task.contentLabel ?? `${task.title} narration`} />}
        <ol className={`${styles.steps} ${onCompleted ? styles.lessonSteps : ''}`} aria-label="Step-by-step visual narrative">
          {(task.steps ?? []).map((step, index) => (
            <li className={`${styles.step} ${step.audioUrl ? styles.stepWithAudio : ''}`} key={step.id}>
              <div className={styles.stepVisual}>
                {step.imageUrl ? <img src={step.imageUrl} alt={step.altText ?? ''} /> : <ImageIcon size={28} aria-hidden="true" />}
              </div>
              <span className={styles.stepNumber}>{index + 1}</span>
              <div className={styles.stepCopy}>
                <div className={styles.stepTitleRow}>
                  <strong><AdaptiveLessonText text={step.title} /></strong>
                  {step.audioUrl && <StepAudioButton src={step.audioUrl} label={step.title} />}
                </div>
                {step.description && <span><AdaptiveLessonText text={step.description} /></span>}
              </div>
            </li>
          ))}
        </ol>
      </>
    )
  }

  if (template === 'reengagement_prompt') {
    return (
      <section className={`${styles.panel} ${styles.reengagement}`} aria-live="polite">
        <span className={styles.spark}><Sparkles size={30} aria-hidden="true" /></span>
        <div><strong><AdaptiveLessonText text={task.instruction ?? 'Look here for the next small step.'} /></strong><span><AdaptiveLessonText text={task.contentDescription} /></span></div>
        <Volume2 size={22} aria-label="Audio cue available" />
      </section>
    )
  }

  if (template === 'breathing_exercise') {
    return <BreathingGuide pace="slow" audioLabel={task.contentLabel ?? 'Calming sounds playing softly'} />
  }

  if (template === 'calming_visual') {
    return (
      <section className={`${styles.panel} ${styles.calmingVisual}`} aria-label="Calming visual">
        <span className={styles.calmOrb} aria-hidden="true" />
        <strong>{task.instruction ?? 'Watch the circle move slowly.'}</strong>
        <span>{task.contentDescription}</span>
      </section>
    )
  }

  return (
    <section className={`${styles.panel} ${styles.soundscape}`} aria-label="Calming soundscape">
      <MediaButton playing={playing} label="calming soundscape" onClick={() => setPlaying((value) => !value)} />
      <div className={styles.mediaCopy}><strong>{task.contentLabel ?? 'Calming soundscape'}</strong><span>{task.contentDescription}</span></div>
      <div className={styles.waveform} aria-hidden="true">{[8, 15, 22, 12, 26, 18, 10].map((height, index) => <span key={index} style={{ height }} />)}</div>
      {playing && <span aria-hidden="true" />}
    </section>
  )
}

export default ActivityTemplate
