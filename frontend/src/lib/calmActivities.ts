export function nextCalmActivity(deck: number[], random = Math.random) {
  if (!deck.length) {
    deck.push(0, 1, 2, 3, 4, 5)
    for (let index = deck.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      ;[deck[index], deck[other]] = [deck[other], deck[index]]
    }
  }
  return deck.pop()!
}
