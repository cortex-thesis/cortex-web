export function validObjectSelection(picked: string[], expected: string[], allowSubset = false, minimum = 1) {
  return new Set(picked).size === picked.length && picked.every(id => expected.includes(id)) && (allowSubset ? picked.length >= minimum : picked.length === expected.length)
}

export function wordAtEndpoints<T extends { word: string; cells: number[][] }>(targets: T[], found: string[], start: number[], end: number[]) {
  const same = (a: number[] | undefined, b: number[]) => a?.[0] === b[0] && a?.[1] === b[1]
  return targets.find(target => !found.includes(target.word) && ((same(target.cells[0], start) && same(target.cells.at(-1), end)) || (same(target.cells.at(-1), start) && same(target.cells[0], end))))
}
