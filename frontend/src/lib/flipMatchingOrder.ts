import type { TaskPair } from '../types'

/** Independent source/answer permutations, then a mixed deck with fewer spatial clues. */
export function shuffledMatchingDeck(pairs: readonly TaskPair[], random = Math.random, previousKeys: readonly string[] = []) {
  const shuffle = <T,>(values: readonly T[]) => {
    const result = [...values]
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[result[index], result[other]] = [result[other], result[index]]
    }
    return result
  }
  const prompts = shuffle(pairs).map(pair => ({ key: `${pair.id}:picture`, pairId: pair.id, item: pair.left }))
  const answers = shuffle(pairs).map(pair => ({ key: `${pair.id}:meaning`, pairId: pair.id, item: pair.right }))
  const pool = [...prompts, ...answers]
  const desktopColumns = pool.length >= 8 && pool.length % 4 === 0 ? 4 : 3
  const columns = [...new Set([2, desktopColumns])]
  const sameOrder = (cards: typeof pool) => cards.length === previousKeys.length && cards.every((card, index) => card.key === previousKeys[index])
  const score = (cards: typeof pool) => {
    let clues = 0
    const first = new Map<string, number>()
    cards.forEach((card, index) => {
      const other = first.get(card.pairId)
      if (other === undefined) { first.set(card.pairId, index); return }
      for (const width of columns) {
        const distance = Math.abs(Math.floor(index / width) - Math.floor(other / width)) + Math.abs(index % width - other % width)
        if (distance === 1) clues++
      }
    })
    return clues
  }
  let best = pool
  let bestScore = Infinity
  for (let attempt = 0; attempt < 128; attempt++) {
    const candidate = shuffle(pool)
    if (pool.length > 2 && sameOrder(candidate)) continue
    const nextScore = score(candidate)
    if (nextScore < bestScore) { best = candidate; bestScore = nextScore }
    if (nextScore === 0) break
  }
  // Ensure Reset starts a different arrangement even with an unlucky random stream.
  if (pool.length > 2 && sameOrder(best)) best = [...best.slice(1), best[0]]
  return best
}
