import { useMemo, useRef, useState } from 'react'
import { GripVertical, Image as ImageIcon, Puzzle, RotateCcw } from 'lucide-react'
import type { Task, TaskItem } from '../../../types'
import { playLessonSound } from '../../../lib/lessonSounds'
import styles from './TaskInteraction.module.css'
import CreativeTask from './CreativeTask'
import ToothBrushingTask from './ToothBrushingTask'
import { AudioSequence, FindIt, FlipMatching, Shopping, WordSearch } from './MiniGames'

interface TaskInteractionProps {
  task: Task
  onAnswered?: (correct: boolean, response: string) => void
  onChanged?: () => void
  quiet?: boolean
  narrowed?: boolean
}

function ItemVisual({ item }: { item: TaskItem }) {
  return item.imageUrl
    ? <img src={item.imageUrl} alt={item.altText ?? item.label} />
    : <span className={styles.imagePlaceholder}><ImageIcon size={26} aria-hidden="true" /></span>
}

function TaskInteraction({ task, onAnswered, onChanged, quiet = false, narrowed = false }: TaskInteractionProps) {
  const template = task.taskTemplate ?? 'multiple_choice'
  const [selected, setSelected] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [activePair, setActivePair] = useState<string | null>(null)
  const [attemptedRight, setAttemptedRight] = useState<string | null>(null)
  const [sortItem, setSortItem] = useState<string | null>(null)
  const [sorted, setSorted] = useState<Record<string, string>>({})
  const [attemptedCategory, setAttemptedCategory] = useState<string | null>(null)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const workArea = useRef<HTMLDivElement>(null)

  const items = task.items ?? []
  const expected = task.correctItemIds ?? []
  const shuffledRights = useMemo(() => {
    const pairs = task.pairs ?? []
    let seed = [...pairs.map(pair => pair.id).join('|')].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 7919)
    for (let attempt = 0; attempt < 40; attempt++) {
      const mixed = [...pairs]
      for (let index = mixed.length - 1; index > 0; index--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const other = seed % (index + 1)
        ;[mixed[index], mixed[other]] = [mixed[other], mixed[index]]
      }
      if (mixed.every((pair, index) => pair.id !== pairs[index].id) || pairs.length < 2) return mixed
    }
    return [...pairs.slice(1), ...pairs.slice(0, 1)]
  }, [task.pairs])
  if (template === 'tooth_brushing') return <ToothBrushingTask task={task} onAnswered={onAnswered} />
  if (template === 'word_search') return <WordSearch task={task} onAnswered={onAnswered} onChanged={onChanged} quiet={quiet} />
  if (template === 'find_it') return <FindIt task={task} onAnswered={onAnswered} onChanged={onChanged} quiet={quiet} narrowed={narrowed} />
  if (template === 'audio_sequence') return <AudioSequence task={task} onAnswered={onAnswered} onChanged={onChanged} quiet={quiet} narrowed={narrowed} />
  if (template === 'shopping') return <Shopping task={task} onAnswered={onAnswered} onChanged={onChanged} quiet={quiet} narrowed={narrowed} />
  if (template === 'memory_flip') return <FlipMatching task={task} onAnswered={onAnswered} onChanged={onChanged} quiet={quiet} />

  if (template === 'hotspot_hunt' || template === 'trace_route' || template === 'pattern_builder') {
    return <CreativeTask task={task} onAnswered={onAnswered} />
  }

  function finish(correct: boolean, response: string) {
    setResult(correct ? 'correct' : 'incorrect')
    onAnswered?.(correct, response)
  }

  const feedback = result && <div className={`${styles.feedback} ${styles[result]}`} role="status">
    {result === 'correct' ? (task.correctFeedback ?? 'Nice work! You found it.') : (task.retryFeedback ?? 'Almost. Try another move.')}
  </div>

  function resultClass(isPicked: boolean) {
    return isPicked && result ? styles[result] : ''
  }

  if (template === 'multiple_choice' || template === 'yes_no') {
    return (
      <div className={styles.stack}>
        <div className={styles.choiceGrid}>{task.choices.map((choice) => (
          <button key={choice} type="button" className={`${styles.choice} ${selected.includes(choice) ? styles.selected : ''} ${resultClass(selected.includes(choice))}`} aria-pressed={selected.includes(choice)} disabled={result !== null} onClick={() => { setSelected([choice]); finish(choice === task.answer, choice) }}>{choice}</button>
        ))}</div>
        {feedback}
      </div>
    )
  }

  if (template === 'picture_choice' || template === 'tap_target') {
    const multiple = task.selectionMode === 'multiple'
    function choosePicture(itemId: string) {
      if (!multiple) {
        setSelected([itemId])
        finish(expected.includes(itemId), itemId)
        return
      }
      setSelected((current) => current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId])
    }
    return (
      <div className={styles.stack}>
        <div className={`${styles.pictureGrid} ${template === 'tap_target' ? styles.targetGrid : ''}`}>
          {items.map((item) => (
            <button key={item.id} type="button" className={`${styles.pictureChoice} ${selected.includes(item.id) ? styles.selected : ''} ${result !== null && selected.includes(item.id) ? expected.includes(item.id) ? styles.correct : styles.incorrect : ''}`} aria-pressed={selected.includes(item.id)} disabled={result !== null} onClick={() => choosePicture(item.id)}>
              <ItemVisual item={item} /><strong>{result !== null && selected.includes(item.id) ? expected.includes(item.id) ? ' ' : '↻ ' : ''}{item.label}</strong>
            </button>
          ))}
        </div>
        <div className={styles.actions}>{feedback}{multiple && <button type="button" className={styles.check} disabled={!selected.length || result !== null} onClick={() => finish(task.scored === false || expected.length === 0 || (selected.length === expected.length && selected.every((id) => expected.includes(id))), selected.join(','))}><span aria-hidden="true" /> {task.scored === false || expected.length === 0 ? 'Save choices' : 'Check my choices'}</button>}</div>
      </div>
    )
  }

  if (template === 'sequence_order' || template === 'picture_puzzle') {
    const available = items.filter((item) => !selected.includes(item.id))
    function addToSequence(itemId: string | null) {
      if (itemId && !selected.includes(itemId)) { setSelected((value) => [...value, itemId]); setResult(null); onChanged?.() }
      setDragItem(null)
    }
    function moveBefore(targetId: string) {
      if (!dragItem || dragItem === targetId) return
      setSelected((value) => {
        const next = value.filter((id) => id !== dragItem)
        next.splice(next.indexOf(targetId), 0, dragItem)
        return next
      })
      setDragItem(null)
      setResult(null)
      onChanged?.()
    }
    function returnPiece(id: string) {
      setSelected((value) => value.filter((item) => item !== id))
      setDragItem(null)
      setResult(null)
      onChanged?.()
    }
    return (
      <div className={styles.stack}>
        <p className={styles.dragHint}><GripVertical size={15} /> Drag pieces into the work area, or tap them in order. Drag a piece out or tap it to return it.</p>
        <div ref={workArea} className={`${styles.sequenceAnswer} ${template === 'picture_puzzle' ? styles.puzzleBoard : ''} ${result ? styles[result] : ''}`} aria-label="Your work area" onDragOver={(event) => event.preventDefault()} onDrop={() => addToSequence(dragItem)}>
          {selected.length ? selected.map((id, index) => {
            const item = items.find(value => value.id === id)!
            return <button type="button" key={id} draggable aria-label={`Return ${item.label} to options`} onClick={() => returnPiece(id)} onDragStart={() => setDragItem(id)} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); moveBefore(id) }}><b>{template === 'picture_puzzle' ? <Puzzle size={14} /> : index + 1}</b>{item.imageUrl && <ItemVisual item={item} />}<strong>{item.label}</strong></button>
          }) : <em>Move the first piece here.</em>}
        </div>
        <div className={styles.itemRow} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragItem) returnPiece(dragItem) }}>{available.map((item) => <button type="button" draggable key={item.id} className={`${styles.itemButton} ${item.imageUrl ? styles.visualItemButton : ''}`} onDragStart={(event) => { setDragItem(item.id); event.dataTransfer.setData('text/plain', item.id) }} onDragEnd={() => setDragItem(null)} onClick={() => addToSequence(item.id)}><GripVertical size={15} />{item.imageUrl && <ItemVisual item={item} />}{item.label}</button>)}</div>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => { setSelected([]); setResult(null); onChanged?.() }}><RotateCcw size={15} /> Reset</button>{feedback}<button type="button" className={styles.check} disabled={selected.length !== items.length || result !== null} onClick={() => finish(JSON.stringify(selected) === JSON.stringify(task.correctOrder ?? []), selected.join(','))}><span aria-hidden="true" /> Check {template === 'picture_puzzle' ? 'puzzle' : 'order'}</button></div>
      </div>
    )
  }

  if (template === 'matching_pairs') {
    const pairs = task.pairs ?? []
    function chooseRight(pairId: string) {
      if (!activePair) return
      if (activePair === pairId) {
        const next = [...matched, pairId]
        setMatched(next)
        setActivePair(null)
        if (next.length === pairs.length) finish(true, next.join(','))
        else if (!quiet) playLessonSound('correct')
      } else {
        setAttemptedRight(pairId)
        finish(false, `${activePair},${pairId}`)
      }
    }
    return (
      <div className={styles.stack}><div className={styles.matchGrid}>
        <div>{pairs.map((pair) => <button type="button" draggable key={pair.id} disabled={matched.includes(pair.id) || result !== null} className={`${styles.matchButton} ${pair.left.imageUrl ? styles.visualMatchButton : ''} ${activePair === pair.id ? styles.selected : ''} ${resultClass(activePair === pair.id || matched.includes(pair.id))}`} onDragStart={() => setActivePair(pair.id)} onClick={() => setActivePair(pair.id)}><GripVertical size={15} />{pair.left.imageUrl && <ItemVisual item={pair.left} />}{(!task.hideImageLabels || !pair.left.imageUrl) && <strong>{pair.left.label}</strong>}{matched.includes(pair.id) && <span aria-label="Matched"></span>}</button>)}</div>
        <div>{shuffledRights.map((pair) => <button type="button" key={pair.id} disabled={matched.includes(pair.id) || result !== null} className={`${styles.matchButton} ${pair.right.imageUrl ? styles.visualMatchButton : ''} ${resultClass(attemptedRight === pair.id || matched.includes(pair.id))}`} onDragOver={(event) => event.preventDefault()} onDrop={() => chooseRight(pair.id)} onClick={() => chooseRight(pair.id)}>{pair.right.imageUrl && <ItemVisual item={pair.right} />}<strong>{pair.right.label}</strong>{matched.includes(pair.id) && ' '}</button>)}</div>
      </div>{feedback}</div>
    )
  }

  function assignCategory(categoryId: string) {
    if (!sortItem) return
    if (task.immediateFeedback && task.sortAnswers?.[sortItem] !== categoryId) {
      setAttemptedCategory(categoryId)
      finish(false, JSON.stringify({ ...sorted, [sortItem]: categoryId }))
      return
    }
    const next = { ...sorted, [sortItem]: categoryId }
    setSorted(next)
    setSortItem(null)
    if (Object.keys(next).length === items.length) {
      finish(task.scored === false || items.every((item) => next[item.id] === task.sortAnswers?.[item.id]), JSON.stringify(next))
    } else if (task.immediateFeedback && !quiet) playLessonSound('correct')
  }

  return (
    <div className={styles.stack}>
        <div className={styles.itemRow}>{items.filter((item) => !sorted[item.id]).map((item) => <button type="button" draggable key={item.id} disabled={result !== null} className={`${styles.itemButton} ${item.imageUrl ? styles.visualItemButton : ''} ${sortItem === item.id ? styles.selected : ''} ${resultClass(sortItem === item.id)}`} onDragStart={() => setSortItem(item.id)} onClick={() => setSortItem(item.id)}><GripVertical size={15} />{item.imageUrl && <ItemVisual item={item} />}<strong>{item.label}</strong></button>)}</div>
      <p className={styles.helper}>{sortItem ? 'Move it to a group, or tap a group.' : 'Choose or drag an item to sort.'}</p>
      <div className={styles.categoryGrid}>{(task.categories ?? []).map((category) => <button type="button" key={category.id} className={`${styles.category} ${result === 'correct' ? styles.correct : result === 'incorrect' && attemptedCategory === category.id ? styles.incorrect : ''}`} disabled={result !== null} onDragOver={(event) => event.preventDefault()} onDrop={() => assignCategory(category.id)} onClick={() => assignCategory(category.id)}><strong>{category.label}</strong><span>{Object.entries(sorted).filter(([, value]) => value === category.id).map(([id]) => items.find((item) => item.id === id)?.label).join(', ') || 'Drop items here'}</span></button>)}</div>
      {feedback}
    </div>
  )
}

export default TaskInteraction
