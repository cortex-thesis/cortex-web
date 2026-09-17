import { createContext, useContext, useEffect, useState } from 'react'
import type { FocusTemplate } from '../../../lib/eegTransitions'
import { playLessonSound } from '../../../lib/lessonSounds'
import styles from './TaskCard.module.css'

export const FocusSupportContext = createContext({ level: 'none' as FocusTemplate, holding: false,
  terms: [] as string[], masked: false, reveal: () => {} })

export function anchorTerms(text: string) {
  const words = text.match(/[\p{L}][\p{L}'-]*/gu) ?? []
  const preferred = words.filter(word => /^(soap|water|wash|rinse|dry|wet|brush|choose|match|count|pick|tool|tools|first|next)$/i.test(word))
  const candidates = preferred.length ? preferred : words.filter(word => word.length > 4 && !/^(which|these|those|their|about|before|after|please)$/i.test(word))
  return [...new Set(candidates.map(word => word.toLowerCase()))].slice(0, 2)
}

export function AdaptiveLessonText({ text = '' }: { text?: string }) {
  const support = useContext(FocusSupportContext)
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text]
  const [visible, setVisible] = useState(1)
  const chunked = support.level === 'active' && sentences.length > 1 && text.length > 100
  useEffect(() => {
    if (!chunked || !support.holding || visible >= sentences.length) return
    const timer = window.setTimeout(() => setVisible(value => value + 1), 2000)
    return () => window.clearTimeout(timer)
  }, [chunked, support.holding, visible, sentences.length])
  function renderWords(value: string) {
    return value.split(/([\p{L}][\p{L}'-]*)/gu).map((word, index) => {
      if (!support.terms.includes(word.toLowerCase())) return word
      return support.masked
        ? <button key={index} className={styles.maskedWord} aria-label="Tap to reveal the hidden action word" onClick={support.reveal}><span aria-hidden="true" className={styles.maskedOriginal}>{word}</span><span aria-hidden="true" className={styles.maskDots}>••••</span></button>
        : <span key={index} className={styles.anchorWord}>{word}</span>
    })
  }
  return <span className={styles.adaptiveText}>{sentences.map((sentence, index) => <span key={index} className={`${styles.sentence} ${chunked && index >= visible ? styles.hiddenSentence : ''}`} inert={chunked && index >= visible} aria-hidden={chunked && index >= visible || undefined}>{renderWords(sentence)}</span>)}{chunked && visible < sentences.length && <button className={styles.chunkNext} onClick={() => { setVisible(value => value + 1); playLessonSound('nudge') }}>Reveal next sentence</button>}</span>
}
