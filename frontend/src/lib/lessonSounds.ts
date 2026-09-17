import { cachedApiValue } from './api'
export type LessonSound = 'correct' | 'incorrect' | 'transition' | 'finished' | 'goodJob' | 'nudge'

const sources: Record<LessonSound, string> = {
  correct: '/assets/sounds/correct.wav',
  incorrect: '/assets/sounds/incorrect.wav',
  transition: '/assets/sounds/transition-whoosh.wav',
  finished: '/assets/sounds/lesson-finished.wav',
  goodJob: '/assets/sounds/good-job.wav',
  nudge: '/assets/sounds/transition-whoosh.wav',
}

const volumes: Record<LessonSound, number> = { correct: 0.32, incorrect: 0.24, transition: 0.18, finished: 0.36, goodJob: 0.32, nudge: 0.08 }
const sounds = new Map<LessonSound, HTMLAudioElement>()

export function playLessonSound(kind: LessonSound) {
  if (typeof Audio === 'undefined') return
  if (cachedApiValue<{ sound_enabled: boolean }>('/student/preferences/')?.sound_enabled === false) return
  let audio = sounds.get(kind)
  if (!audio) {
    audio = new Audio(sources[kind])
    audio.preload = 'auto'
    sounds.set(kind, audio)
  }
  audio.pause()
  audio.currentTime = 0
  audio.volume = volumes[kind]
  void audio.play().catch(() => undefined)
}
