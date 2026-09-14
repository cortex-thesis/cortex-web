export type LessonSound = 'correct' | 'incorrect' | 'transition' | 'finished'

const sources: Record<LessonSound, string> = {
  correct: '/assets/sounds/correct.wav',
  incorrect: '/assets/sounds/incorrect.wav',
  transition: '/assets/sounds/transition-whoosh.wav',
  finished: '/assets/sounds/lesson-finished.wav',
}

const volumes: Record<LessonSound, number> = { correct: 0.32, incorrect: 0.24, transition: 0.18, finished: 0.36 }
const sounds = new Map<LessonSound, HTMLAudioElement>()

export function playLessonSound(kind: LessonSound) {
  if (typeof Audio === 'undefined') return
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
