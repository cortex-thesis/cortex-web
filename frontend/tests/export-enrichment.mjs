import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'
const definitionUrl = new URL('../../web/enrichment_lessons.json', import.meta.url)
const existing = JSON.parse(await readFile(definitionUrl, 'utf8'))
const refinements = await readFile(new URL('../../web/restored_lesson_refinements.json', import.meta.url), 'utf8')
const source = (await readFile(new URL('../src/mocks/enrichmentLessons.ts', import.meta.url), 'utf8'))
  .replace("import refinements from '../../../web/restored_lesson_refinements.json'", `const refinements = ${refinements}`)
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { mockEnrichmentLessons } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const snake = (value) => Array.isArray(value) ? value.map(snake) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), snake(item)])) : value
const lessons = mockEnrichmentLessons.map((lesson) => {
  const previous = existing.find(item => item.lesson_id === lesson.id)
  if (!previous) throw new Error(`Missing official metadata for ${lesson.id}`)
  return {
    ...previous,
    title: lesson.title,
    slides: lesson.tasks.map(({ id, index, total, title, package: packageSlug, contentType, ...configuration }) => ({
      title, type: contentType,
      configuration: { ...snake(configuration), lesson_metadata: previous.slides[0].configuration.lesson_metadata },
    })),
  }
})
await writeFile(definitionUrl, JSON.stringify(lessons, null, 2) + '\n')
