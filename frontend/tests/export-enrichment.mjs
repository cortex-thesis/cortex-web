import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/mocks/enrichmentLessons.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { mockEnrichmentLessons } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const snake = (value) => Array.isArray(value) ? value.map(snake) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), snake(item)])) : value
const lessons = mockEnrichmentLessons.map((lesson) => ({
  lesson_id: lesson.id, title: lesson.title, competency_code: lesson.id,
  description: 'Integrated enrichment lesson for student practice and teacher review.',
  slides: lesson.tasks.map(({ id, index, total, title, package: packageSlug, contentType, ...configuration }) => ({ title, type: contentType, configuration: snake(configuration) })),
}))
await writeFile(new URL('../../web/enrichment_lessons.json', import.meta.url), JSON.stringify(lessons, null, 2) + '\n')
