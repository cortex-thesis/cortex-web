import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Image as ImageIcon, Pause, Play, Sparkles, Volume2 } from 'lucide-react'
import type { Task } from '../../../types'
import BreathingGuide from '../BreathingGuide'
import styles from './ActivityTemplate.module.css'
import { AdaptiveLessonText } from '../TaskCard/FocusSupport'

interface ActivityTemplateProps {
  task: Task
  onCompleted?: () => void
  onContinueWithoutVideo?: () => void
}

function LessonImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  return failed ? <span role="status">Image unavailable. <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1) }}>Retry image</button></span>
    : <img key={attempt} src={src} alt={alt} onError={() => setFailed(true)} />
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
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const id = url.hostname === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)
        ? /^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : url.searchParams.get('v')
        : null
    const origin = typeof window === 'undefined' ? '' : `&origin=${encodeURIComponent(window.location.origin)}`
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}?rel=0&enablejsapi=1${origin}` : null
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
    YT?: { Player: new (element: HTMLIFrameElement, options: { events: { onReady: () => void; onError?: (event: { data: number }) => void } }) => YouTubePlayer }
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<NonNullable<Window['YT']>> | null = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      if (window.YT) resolve(window.YT)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => {
        script.remove()
        youtubeApiPromise = null
        reject(new Error('YouTube player could not be loaded.'))
      }
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

function VideoFallback({ onContinue }: { onContinue?: () => void }) {
  return <div className={styles.videoFallback} role="status">
    <AlertCircle size={28} aria-hidden="true" />
    <div>
      <strong>This video is unavailable</strong>
      <span>You can continue with the lesson. Your teacher can use the examples on the next slides instead.</span>
    </div>
    <button type="button" onClick={onContinue}>Continue without video</button>
  </div>
}

function YouTubeVideo({ src, title, onHalfWatched, onContinueWithoutVideo }: { src: string; title: string; onHalfWatched?: () => void; onContinueWithoutVideo?: () => void }) {
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [reload, setReload] = useState(0)
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
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    frame.allowFullscreen = true
    host.replaceChildren(frame)
    let player: YouTubePlayer | null = null
    let timer: number | null = null
    let cancelled = false
    const fail = (code: number) => {
      if (cancelled) return
      cancelled = true
      window.clearTimeout(readyTimeout)
      if (timer !== null) window.clearInterval(timer)
      setErrorCode(code)
    }
    // Blocked scripts/iframes may never emit a YouTube error event.
    const readyTimeout = window.setTimeout(() => fail(-1), 15000)
    const pause = () => player?.pauseVideo()
    window.addEventListener('cortex:pause-media', pause)
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !frame.isConnected) return
      player = new YT.Player(frame, { events: { onReady: () => {
        if (cancelled) return
        window.clearTimeout(readyTimeout)
        timer = window.setInterval(() => {
          if (!player || completedRef.current) return
          const duration = player.getDuration()
          if (duration > 0 && player.getCurrentTime() / duration >= 0.5) {
            completedRef.current = true
            callbackRef.current?.()
          }
        }, 750)
      }, onError: (event) => fail(event.data) } })
    }).catch(() => fail(-1))
    return () => {
      cancelled = true
      window.clearTimeout(readyTimeout)
      window.removeEventListener('cortex:pause-media', pause)
      if (timer !== null) window.clearInterval(timer)
      player?.destroy()
      frame.remove()
    }
  }, [src, title, reload])

  return <>
    {errorCode === null && <div ref={hostRef} className={styles.youtubeHost} />}
    {errorCode !== null && <div role="alert">
      <VideoFallback onContinue={onContinueWithoutVideo ?? (() => { if (!completedRef.current) { completedRef.current = true; callbackRef.current?.() } })} />
      <button type="button" className={styles.retryVideo} onClick={() => { setErrorCode(null); setReload(value => value + 1) }}>Try the video again</button>
    </div>}
  </>
}

function ActivityTemplate({ task, onCompleted, onContinueWithoutVideo }: ActivityTemplateProps) {
  const [playing, setPlaying] = useState(false)
  const [mediaUnavailable, setMediaUnavailable] = useState(false)
  const template = task.template ?? 'multiple_choice'
  const youtubeUrl = youtubeEmbedUrl(task.mediaUrl)
  const youtubeLink = Boolean(task.mediaUrl && /(?:youtube(?:-nocookie)?\.com|youtu\.be)/i.test(task.mediaUrl))
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  useEffect(() => {
    const media = mediaRef.current
    return () => { media?.pause() }
  }, [])

  if (youtubeUrl) {
    return <section className={`${styles.panel} ${styles.youtubePanel}`}>
      {task.videoGuidance?.length && task.contentDescription ? <p className={styles.videoIntroduction}>{task.contentDescription}</p> : null}
      <YouTubeVideo key={youtubeUrl} src={youtubeUrl} title={task.contentLabel ?? task.title} onHalfWatched={onCompleted} onContinueWithoutVideo={onContinueWithoutVideo} />
      {!!task.videoGuidance?.length && <aside className={styles.videoGuidance} aria-label="Lesson guidance">
        <strong>Lesson guidance</strong>
        <ul>{task.videoGuidance.map(item => <li key={item.id}>
          {item.imageUrl && <img src={item.imageUrl} alt={item.altText ?? ''} />}
          <span>{item.title}</span>
        </li>)}</ul>
      </aside>}
    </section>
  }

  if (youtubeLink) return <section className={styles.panel}><VideoFallback onContinue={onContinueWithoutVideo ?? onCompleted} /></section>

  if (task.mediaUrl && (task.contentType === 'audio' || task.contentType === 'video' || template === 'instructional_video' || template === 'calming_soundscape')) {
    if (task.contentType === 'audio' || template === 'calming_soundscape') {
      return <section className={`${styles.panel} ${styles.audioPanel}`}>
        <audio ref={(node) => { mediaRef.current = node }} className={styles.hiddenAudio} src={task.mediaUrl} preload="metadata"
          onError={() => { setPlaying(false); setMediaUnavailable(true) }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); onCompleted?.() }} />
        <MediaButton playing={playing} label={task.contentLabel ?? task.title} onClick={() => {
          const media = mediaRef.current
          if (!media) return
          if (media.paused) void media.play().catch(() => { setPlaying(false); setMediaUnavailable(true) })
          else media.pause()
        }} />
        {mediaUnavailable && <p role="alert">This audio could not be played. <button type="button" onClick={() => { setMediaUnavailable(false); mediaRef.current?.load() }}>Retry audio</button></p>}
        <div className={styles.mediaCopy}><strong>{task.contentLabel ?? task.title}</strong><span>{task.contentDescription}</span></div>
        <div className={`${styles.waveform} ${playing ? '' : styles.waveformPaused}`} aria-hidden="true">
          {[8, 15, 22, 12, 26, 18, 10, 20, 14, 8].map((height, index) => <span key={index} style={{ height, animationDelay: `${index * 80}ms` }} />)}
        </div>
      </section>
    }
    return <section className={styles.panel}>
      {mediaUnavailable
        ? <VideoFallback onContinue={onContinueWithoutVideo ?? onCompleted} />
        : <video ref={(node) => { mediaRef.current = node }} className={styles.video} src={task.mediaUrl} controls preload="metadata" onEnded={onCompleted} onError={() => setMediaUnavailable(true)} aria-label={task.contentLabel ?? task.title} />}
    </section>
  }

  if (template === 'multiple_choice') return null

  if (template === 'instructional_video' && task.contentVersion && !task.mediaUrl) {
    return <section className={styles.panel} aria-label="Pending instructional video"><h3>{task.contentLabel ?? 'Video awaiting teacher-approved selection'}</h3><p>{task.contentDescription}</p><p>No video is configured. Continue with the lesson activities; this does not record a watched video.</p><button type="button" onClick={onContinueWithoutVideo}>Continue without video</button></section>
  }

  if (template === 'instructional_video') {
    return (
      <section className={`${styles.panel} ${styles.videoPanel}`} aria-label="Instructional video">
        <VideoFallback onContinue={onContinueWithoutVideo ?? onCompleted} />
      </section>
    )
  }

  if (template === 'visual_narrative') {
    return (
      <>
        {task.mediaUrl && <audio className={styles.readingAudio} src={task.mediaUrl} controls preload="metadata" aria-label={task.contentLabel ?? `${task.title} narration`} />}
        <ol className={`${styles.steps} ${onCompleted ? styles.lessonSteps : ''} ${task.package === 'enrichment' && task.steps?.length === 1 && (task.index === 1 || task.index === task.total) ? styles.enrichmentBoundary : ''}`} aria-label="Step-by-step visual narrative">
          {(task.steps ?? []).map((step, index) => (
            <li className={`${styles.step} ${step.audioUrl ? styles.stepWithAudio : ''}`} key={step.id}>
              <div className={styles.stepVisual}>
                {step.imageUrl ? <LessonImage src={step.imageUrl} alt={step.altText ?? ''} /> : <ImageIcon size={28} aria-hidden="true" />}
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
      {mediaUnavailable && <p role="alert">This audio could not be played. <button type="button" onClick={() => { setMediaUnavailable(false); mediaRef.current?.load() }}>Retry audio</button></p>}
        <div className={styles.mediaCopy}><strong>{task.contentLabel ?? 'Calming soundscape'}</strong><span>{task.contentDescription}</span></div>
      <div className={styles.waveform} aria-hidden="true">{[8, 15, 22, 12, 26, 18, 10].map((height, index) => <span key={index} style={{ height }} />)}</div>
      {playing && <span aria-hidden="true" />}
    </section>
  )
}

export default ActivityTemplate
