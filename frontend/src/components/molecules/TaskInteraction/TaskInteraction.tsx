import { useMemo, useRef, useState } from 'react'
import { Check, GripVertical, Image as ImageIcon, Puzzle, RotateCcw } from 'lucide-react'
import type { Task, TaskItem } from '../../../types'
import styles from './TaskInteraction.module.css'
import CreativeTask from './CreativeTask'

interface TaskInteractionProps {
  task: Task
  onAnswered?: (correct: boolean, response: string) => void
  onChanged?: () => void
}

function ItemVisual({ item }: { item: TaskItem }) {
  return item.imageUrl
    ? <img src={item.imageUrl} alt={item.altText ?? item.label} />
    : <span className={styles.imagePlaceholder}><ImageIcon size={26} aria-hidden="true" /></span>
}

function TaskInteraction({ task, onAnswered, onChanged }: TaskInteractionProps) {
  const template = task.taskTemplate ?? 'multiple_choice'
  const [selected, setSelected] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [activePair, setActivePair] = useState<string | null>(null)
  const [sortItem, setSortItem] = useState<string | null>(null)
  const [sorted, setSorted] = useState<Record<string, string>>({})
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const workArea = useRef<HTMLDivElement>(null)

  const items = task.items ?? []
  const expected = task.correctItemIds ?? []
  const shuffledRights = useMemo(() => [...(task.pairs ?? [])].reverse(), [task.pairs])

  if (template === 'hotspot_hunt' || template === 'trace_route' || template === 'memory_flip' || template === 'pattern_builder') {
    return <CreativeTask task={task} onAnswered={onAnswered} />
  }

  function finish(correct: boolean, response: string) {
    setResult(correct ? 'correct' : 'incorrect')
    onAnswered?.(correct, response)
    if (!correct) setTimeout(() => setResult(null), 900)
  }

  if (template === 'multiple_choice' || template === 'yes_no') {
    return (
      <div className={styles.choiceGrid}>
        {task.choices.map((choice) => (
          <button key={choice} type="button" className={`${styles.choice} ${selected.includes(choice) ? styles.selected : ''}`} aria-pressed={selected.includes(choice)} disabled={result !== null} onClick={() => { setSelected([choice]); finish(choice === task.answer, choice) }}>{choice}</button>
        ))}
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
            <button key={item.id} type="button" className={`${styles.pictureChoice} ${selected.includes(item.id) ? styles.selected : ''}`} disabled={result !== null} onClick={() => choosePicture(item.id)}>
              <ItemVisual item={item} /><strong>{item.label}</strong>
            </button>
          ))}
        </div>
        {multiple && <div className={styles.actions}><button type="button" className={styles.check} disabled={!selected.length || result !== null} onClick={() => finish(task.scored === false || expected.length === 0 || (selected.length === expected.length && selected.every((id) => expected.includes(id))), selected.join(','))}><Check size={15} /> {task.scored === false || expected.length === 0 ? 'Save choices' : 'Check choices'}</button></div>}
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
        <div ref={workArea} className={`${styles.sequenceAnswer} ${template === 'picture_puzzle' ? styles.puzzleBoard : ''}`} aria-label="Your work area" onDragOver={(event) => event.preventDefault()} onDrop={() => addToSequence(dragItem)}>
          {selected.length ? selected.map((id, index) => <span key={id} draggable role="button" tabIndex={0} aria-label={`Return ${items.find((item) => item.id === id)?.label} to options`} onClick={() => returnPiece(id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); returnPiece(id) } }} onDragStart={(event) => { setDragItem(id); event.dataTransfer.setData('text/plain', id) }} onDragEnd={(event) => { const area = workArea.current?.getBoundingClientRect(); if (area && (event.clientX < area.left || event.clientX > area.right || event.clientY < area.top || event.clientY > area.bottom)) returnPiece(id); setDragItem(null) }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); moveBefore(id) }}><b>{template === 'picture_puzzle' ? <Puzzle size={14} /> : index + 1}</b>{items.find((item) => item.id === id)?.label}</span>) : <em>Move the first piece here.</em>}
        </div>
        <div className={styles.itemRow} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragItem) returnPiece(dragItem) }}>{available.map((item) => <button type="button" draggable key={item.id} className={styles.itemButton} onDragStart={(event) => { setDragItem(item.id); event.dataTransfer.setData('text/plain', item.id) }} onDragEnd={() => setDragItem(null)} onClick={() => addToSequence(item.id)}><GripVertical size={15} />{item.label}</button>)}</div>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => { setSelected([]); setResult(null); onChanged?.() }}><RotateCcw size={15} /> Reset</button><button type="button" className={styles.check} disabled={selected.length !== items.length || result !== null} onClick={() => finish(JSON.stringify(selected) === JSON.stringify(task.correctOrder ?? []), selected.join(','))}><Check size={15} /> Check {template === 'picture_puzzle' ? 'puzzle' : 'order'}</button></div>
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
      } else {
        setResult('incorrect')
        setTimeout(() => { setResult(null); setActivePair(null) }, 700)
      }
    }
    return (
      <div className={styles.matchGrid}>
        <div>{pairs.map((pair) => <button type="button" draggable key={pair.id} disabled={matched.includes(pair.id)} className={`${styles.matchButton} ${pair.left.imageUrl ? styles.visualMatchButton : ''} ${activePair === pair.id ? styles.selected : ''}`} onDragStart={() => setActivePair(pair.id)} onClick={() => setActivePair(pair.id)}><GripVertical size={15} />{pair.left.imageUrl && <ItemVisual item={pair.left} />}<strong>{pair.left.label}</strong></button>)}</div>
        <div>{shuffledRights.map((pair) => <button type="button" key={pair.id} disabled={matched.includes(pair.id)} className={styles.matchButton} onDragOver={(event) => event.preventDefault()} onDrop={() => chooseRight(pair.id)} onClick={() => chooseRight(pair.id)}>{pair.right.label}</button>)}</div>
      </div>
    )
  }

  function assignCategory(categoryId: string) {
    if (!sortItem) return
    const next = { ...sorted, [sortItem]: categoryId }
    setSorted(next)
    setSortItem(null)
    if (Object.keys(next).length === items.length) {
      finish(task.scored === false || items.every((item) => next[item.id] === task.sortAnswers?.[item.id]), JSON.stringify(next))
    }
  }

  return (
    <div className={styles.stack}>
        <div className={styles.itemRow}>{items.filter((item) => !sorted[item.id]).map((item) => <button type="button" draggable key={item.id} className={`${styles.itemButton} ${item.imageUrl ? styles.visualItemButton : ''} ${sortItem === item.id ? styles.selected : ''}`} onDragStart={() => setSortItem(item.id)} onClick={() => setSortItem(item.id)}><GripVertical size={15} />{item.imageUrl && <ItemVisual item={item} />}<strong>{item.label}</strong></button>)}</div>
      <p className={styles.helper}>{sortItem ? 'Move it to a group, or tap a group.' : 'Choose or drag an item to sort.'}</p>
      <div className={styles.categoryGrid}>{(task.categories ?? []).map((category) => <button type="button" key={category.id} className={styles.category} disabled={result !== null} onDragOver={(event) => event.preventDefault()} onDrop={() => assignCategory(category.id)} onClick={() => assignCategory(category.id)}><strong>{category.label}</strong><span>{Object.entries(sorted).filter(([, value]) => value === category.id).map(([id]) => items.find((item) => item.id === id)?.label).join(', ') || 'Drop items here'}</span></button>)}</div>
    </div>
  )
}

export default TaskInteraction
