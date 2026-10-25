/** Presentation only: pair IDs remain the source of matching correctness. */
export function matchingOrder<T extends { id: string }>(pairs: readonly T[], random = Math.random) {
  const shuffle = (values: readonly T[]) => {
    const result = [...values]
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[result[index], result[other]] = [result[other], result[index]]
    }
    return result
  }
  const left = shuffle(pairs)
  if (left.length < 2) return { left, right: [...left] }

  const positions = new Map(left.map((pair, index) => [pair.id, index]))
  const aligned = (right: T[]) => right.some((pair, index) => pair.id === left[index].id)
  const neighbors = (right: T[]) => right.reduce((count, pair, index) =>
    count + (Math.abs(positions.get(pair.id)! - index) === 1 ? 1 : 0), 0)

  let right: T[] | undefined
  let bestScore = Infinity
  for (let attempt = 0; attempt < 64; attempt++) {
    const candidate = shuffle(pairs)
    if (aligned(candidate)) continue
    const score = neighbors(candidate)
    if (score < bestScore) { right = candidate; bestScore = score }
    if (score === 0) break
  }
  // Bounded fallback for small pair sets or an unusually unlucky random stream.
  // Try rotations of the already shuffled left column; none share a correct row.
  const shifts = shuffle(left).map(pair => positions.get(pair.id)!).filter(shift => shift > 0)
  for (const shift of shifts) {
    const candidate = [...left.slice(shift), ...left.slice(0, shift)]
    const score = neighbors(candidate)
    if (score < bestScore) { right = candidate; bestScore = score }
  }
  return { left, right: right! }
}
