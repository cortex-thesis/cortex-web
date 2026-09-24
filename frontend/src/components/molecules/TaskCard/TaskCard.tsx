import { useEffect, useEffectEvent, useState } from 'react'
import type { CSSProperties } from 'react'
import { GripVertical, Image as ImageIcon, Pause, Play, Volume2 } from 'lucide-react'
import type { Task } from '../../../types'
import AnswerChoice from '../AnswerChoice'
import { ProgressBar } from '../../atoms'
import ActivityTemplate from '../ActivityTemplate'
import TaskInteraction from '../TaskInteraction'
import { AudioNarration, DiscussionCards } from '../TaskInteraction/DiscoveryActivities'
import { playLessonSound } from '../../../lib/lessonSounds'
import styles from './TaskCard.module.css'
import type { FocusTemplate } from '../../../lib/eegTransitions'
import { AdaptiveLessonText, anchorTerms, FocusSupportContext } from './FocusSupport'

type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect'

interface TaskCardProps {
  task: Task
  onAnswered?: (correct: boolean, selected: string) => void
  onChanged?: () => void
  nudgeText?: string
  showNudge?: boolean
  className?: string
  showProgress?: boolean
  lessonNavigation?: boolean
  focusTemplate?: FocusTemplate
  focusHolding?: boolean
  onFocusGateChange?: (blocked: boolean) => void
  deliveryStrategy?: 'steady_instruction' | 'attention_reengagement' | 'gentle_reactivation' | 'sensory_cooldown'
}

function TaskCard({
  task,
  onAnswered,
  onChanged,
  nudgeText = 'Focus music playing softly. Keep going!',
  showNudge = false,
  className,
  showProgress = true,
  lessonNavigation = false,
  deliveryStrategy = 'steady_instruction',
  focusTemplate = 'none',
  focusHolding = false,
  onFocusGateChange,
}: TaskCardProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [microDone, setMicroDone] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [checkSeconds, setCheckSeconds] = useState(3)
  const [microFeedback, setMicroFeedback] = useState('')
  const microKind = task.index % 3
  const blocked = focusTemplate === 'active' && (!microDone || (microKind === 1 && checkSeconds > 0))
  const notifyGate = useEffectEvent(() => onFocusGateChange?.(blocked))
  useEffect(() => { notifyGate() }, [blocked, focusTemplate])
  useEffect(() => {
    if (focusTemplate === 'none' || focusTemplate === 'rest') return
    playLessonSound('nudge')
  }, [focusTemplate])
  useEffect(() => {
    if (focusTemplate !== 'active' || microKind !== 1 || checkSeconds <= 0) return
    const timer = window.setTimeout(() => setCheckSeconds(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [focusTemplate, microKind, checkSeconds])
  const cueText = task.instruction || task.question || task.steps?.[0]?.description || task.steps?.[0]?.title || task.contentDescription || task.title
  const terms = anchorTerms(cueText)
  const recall = task.steps && task.steps.length > 1
    ? { question: 'Which step comes first?', choices: task.steps.slice(0, 3).map(step => step.title), answer: task.steps[0].title }
    : task.question && task.answer && task.choices.includes(task.answer)
      ? { question: task.question, choices: task.choices, answer: task.answer }
      : { question: 'What is the goal of this step?', choices: [task.title], answer: task.title }
  function revealCue() { setMicroDone(true); playLessonSound('nudge') }
  function handleInteraction(correct: boolean, response: string) {
    window.dispatchEvent(new Event('cortex-stop-narration'))
    if (task.evidenceRole !== 'self_report' && deliveryStrategy !== 'sensory_cooldown') playLessonSound(correct ? 'correct' : 'incorrect')
    onAnswered?.(correct, response)
  }

  function handleSelect(choice: string) {
    if (revealed) return
    setSelected(choice)
    setRevealed(true)
    const correct = choice === task.answer
    playLessonSound(correct ? 'correct' : 'incorrect')
    onAnswered?.(correct, choice)
  }

  function getAnswerState(choice: string): AnswerState {
    if (!revealed) {
      return selected === choice ? 'selected' : 'default'
    }
    if (choice === selected) return choice === task.answer ? 'correct' : 'incorrect'
    return 'default'
  }

  const safeTotal = Math.max(task.total, 1)
  const progress = Math.min(100, Math.max(0, ((task.index - 1) / safeTotal) * 100))
  const contentType = task.contentType ?? 'image'
  const template = task.template ?? 'multiple_choice'
  const isKnowledgeCheck = template === 'multiple_choice'
  const hasTaskInteraction = Boolean(task.taskTemplate)
  const isLessonOverview = lessonNavigation && template === 'visual_narrative' && !hasTaskInteraction && task.steps?.length === 1
  const headingInstruction = (hasTaskInteraction || isKnowledgeCheck) ? task.question : ''
  const maxWidths = { compact: '560px', standard: '760px', wide: '1040px', immersive: 'min(1280px, 100%)' }
  const taskStyle = {
    '--activity-max-width': maxWidths[task.layout?.size ?? 'standard'],
    '--activity-columns': task.layout?.preferredColumns ?? 'auto-fit',
    '--activity-board-min-height': `${task.layout?.boardMinHeight ?? 220}px`,
    '--activity-media-fit': task.layout?.mediaFit ?? 'contain',
    '--activity-pair-count': Math.max(task.pairs?.length ?? 0, 1),
  } as CSSProperties

  const contentPreview = task.contentType && (
    <div className={`${styles.contentPreview} ${styles[contentType]}`}>
      {contentType === 'image' && (
        <div className={styles.visualPreview} role="img" aria-label={task.contentLabel}>
          <span className={styles.visualSun} />
          <ImageIcon size={38} strokeWidth={1.5} aria-hidden="true" />
          <span className={styles.previewLabel}>{task.contentLabel}</span>
        </div>
      )}

      {contentType === 'video' && (
        <div className={styles.videoPreview}>
          <button className={styles.mediaButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pause video' : 'Play video'}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <div className={styles.mediaInfo}><strong>{task.contentLabel}</strong><span>{task.contentDescription}</span></div>
          <span className={styles.duration}>0:{String(task.durationSeconds ?? 0).padStart(2, '0')}</span>
        </div>
      )}

      {contentType === 'audio' && (
        <div className={styles.audioPreview}>
          <button className={styles.mediaButton} onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Volume2 size={20} />}
          </button>
          <div className={styles.mediaInfo}><strong>{task.contentLabel}</strong><span>{task.contentDescription}</span></div>
          <div className={styles.waveform} aria-hidden="true">{[8, 15, 22, 12, 26, 18, 10, 20, 14, 8].map((height, index) => <span key={index} style={{ height }} />)}</div>
        </div>
      )}

      {contentType === 'interactive' && (
        <div className={styles.sequence} aria-label="Interactive morning sequence preview">
          {['Wake up', 'Get dressed', 'Pack bag'].map((step, index) => (
            <div className={styles.sequenceStep} key={step}><GripVertical size={15} aria-hidden="true" /><span>{index + 1}</span><strong>{step}</strong></div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <FocusSupportContext.Provider value={{ level: focusTemplate, holding: focusHolding, terms, masked: blocked && microKind === 0, reveal: revealCue }}>
    <div className={`${styles.card} ${styles[deliveryStrategy]} ${focusTemplate !== 'none' ? styles.supportTypography : ''} ${focusTemplate === 'passive' ? styles.anchorPulse : ''} ${focusTemplate === 'rest' ? styles.restTheme : ''} ${lessonNavigation && template === 'visual_narrative' && !hasTaskInteraction ? styles.fitSteps : ''} ${isLessonOverview ? styles.lessonOverview : ''} ${className ?? ''}`} style={taskStyle} data-delivery-strategy={deliveryStrategy} data-focus-template={focusTemplate} data-lesson-overview={isLessonOverview || undefined}>
      <section className={`${styles.microGate} ${blocked ? styles.microGateVisible : ''} ${flipped ? styles.flippedRecall : ''}`} aria-hidden={!blocked} inert={!blocked} aria-label="A quick focus check">
        {microKind === 0 ? <><h3>Tap to reveal your next action</h3><p><AdaptiveLessonText text={cueText} /></p>{!terms.length && <button onClick={revealCue}>Reveal instruction</button>}</>
          : microKind === 2 && !flipped ? <><h3>A quick recall</h3><p>Think about the step you are working on.</p><button onClick={() => { setFlipped(true); playLessonSound('nudge') }}>Flip card</button></>
            : <><h3>{microKind === 1 ? 'A quick check' : 'Recall this step'}</h3><p>{recall.question}</p><div className={styles.microChoices}>{recall.choices.map(choice => <button key={choice} disabled={microDone} onClick={() => { if (choice === recall.answer) { revealCue(); setMicroFeedback('Ready to continue.'); setFlipped(false) } else { setMicroFeedback('Look at your instruction and try again.'); playLessonSound('nudge') } }}>{choice}</button>)}</div>{microKind === 1 && checkSeconds > 0 && <small>Take a moment · {checkSeconds}s</small>}<p role="status">{microFeedback}</p></>}
      </section>
      <div className={styles.focusContent} inert={blocked}>
      {showProgress && <ProgressBar
        value={progress}
        state="focused"
        size="xs"
        ariaLabel={`Task ${task.index} of ${task.total}`}
      />}

      <div className={styles.contentHeading}>
        <div className={styles.headingGroup}>
          <div className={styles.titleRow}>
            <h2><AdaptiveLessonText text={task.title} /></h2>
          </div>
          {headingInstruction && <p className={styles.inlineInstruction}><AdaptiveLessonText text={headingInstruction} /></p>}
        </div>
        {!headingInstruction && task.contentDescription && <span className={styles.contentHint}><AdaptiveLessonText text={task.contentDescription} /></span>}
      </div>

      {task.narrationScript && <AudioNarration script={task.narrationScript} />}
      {task.discussion ? <DiscussionCards task={task} quiet={deliveryStrategy === 'sensory_cooldown'} narrowed={deliveryStrategy === 'attention_reengagement' || focusTemplate === 'active'} /> : !hasTaskInteraction && (task.template || task.mediaUrl) ? <ActivityTemplate task={task} onCompleted={lessonNavigation ? () => onAnswered?.(true, 'completed') : undefined} /> : !hasTaskInteraction ? contentPreview : null}
      {task.videoOptional && <p>Video unavailable? You can continue and reflect on the lesson examples instead.</p>}

      {task.imageUrl && (
        <div className={`${styles.imageWrap} ${task.priceTag ? styles.pricedItem : ''}`}>
          <img src={task.imageUrl} alt={task.altText ?? task.title} className={styles.image} />
          {task.priceTag && <span className={styles.priceTag} aria-label={`Price tag: ${task.priceTag}`}>{task.priceTag}</span>}
        </div>
      )}

      {hasTaskInteraction ? (
        <>
          <TaskInteraction task={task} onAnswered={handleInteraction} onChanged={onChanged} quiet={deliveryStrategy === 'sensory_cooldown'} narrowed={deliveryStrategy === 'attention_reengagement' || focusTemplate === 'active'} />
        </>
      ) : isKnowledgeCheck ? (
        <>
          <div className={styles.choices}>
            {task.choices.map((choice) => (
              <AnswerChoice key={choice} label={choice} answerState={getAnswerState(choice)} disabled={revealed && choice !== task.answer && choice !== selected} onClick={() => handleSelect(choice)} />
            ))}
          </div>
          {revealed && <div className={`${styles.feedback} ${selected === task.answer ? styles.correct : styles.incorrect}`} role="status">{selected === task.answer ? (task.correctFeedback ?? 'Correct.') : (task.retryFeedback ?? 'Try again.')}</div>}
        </>
      ) : lessonNavigation ? null : (
        <button type="button" className={styles.continueButton} onClick={() => onAnswered?.(true, 'completed')}>
          {task.actionLabel ?? (template === 'reengagement_prompt' ? "I'm ready" : 'Continue')}
        </button>
      )}

      {showNudge && nudgeText && (
        <div className={styles.nudge} aria-live="polite">
          <span className={styles.nudgeDot} aria-hidden="true" />
          <span>{nudgeText}</span>
        </div>
      )}
      </div>
    </div>
    </FocusSupportContext.Provider>
  )
}

export default TaskCard
