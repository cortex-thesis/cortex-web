import { useEffect, useRef, useState } from 'react'
import { Check, Image as ImageIcon, Pause, Play, Sparkles, Volume2 } from 'lucide-react'
import type { Task } from '../../../types'
import BreathingGuide from '../BreathingGuide'
import styles from './ActivityTemplate.module.css'

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

function ActivityTemplate({ task, onCompleted }: ActivityTemplateProps) {
  const [playing, setPlaying] = useState(false)
  const template = task.template ?? 'multiple_choice'
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  useEffect(() => {
    const media = mediaRef.current
    return () => { media?.pause() }
  }, [])

  if (onCompleted && task.mediaUrl && (task.contentType === 'audio' || task.contentType === 'video' || template === 'instructional_video' || template === 'calming_soundscape')) {
    return <section className={styles.panel}>
      {task.contentType === 'audio' || template === 'calming_soundscape'
        ? <audio ref={(node) => { mediaRef.current = node }} src={task.mediaUrl} controls preload="metadata" onEnded={onCompleted} aria-label={task.contentLabel ?? task.title} />
        : <video ref={(node) => { mediaRef.current = node }} className={styles.video} src={task.mediaUrl} controls preload="metadata" onEnded={onCompleted} aria-label={task.contentLabel ?? task.title} />}
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
      <ol className={`${styles.steps} ${onCompleted ? styles.lessonSteps : ''}`} aria-label="Step-by-step visual narrative">
        {(task.steps ?? []).map((step, index) => (
          <li className={styles.step} key={step.id}>
            <div className={styles.stepVisual}>
              {step.imageUrl ? <img src={step.imageUrl} alt={step.altText ?? ''} /> : <ImageIcon size={28} aria-hidden="true" />}
            </div>
            <span className={styles.stepNumber}>{index + 1}</span>
            <div><strong>{step.title}</strong>{step.description && <span>{step.description}</span>}</div>
          </li>
        ))}
      </ol>
    )
  }

  if (template === 'reengagement_prompt') {
    return (
      <section className={`${styles.panel} ${styles.reengagement}`} aria-live="polite">
        <span className={styles.spark}><Sparkles size={30} aria-hidden="true" /></span>
        <div><strong>{task.instruction ?? 'Look here for the next small step.'}</strong><span>{task.contentDescription}</span></div>
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
      {playing && <Check className={styles.playingMark} size={18} aria-label="Soundscape playing" />}
    </section>
  )
}

export default ActivityTemplate
