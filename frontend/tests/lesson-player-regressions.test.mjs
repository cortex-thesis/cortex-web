import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('shared activity instructions appear once in a responsive title row', async () => {
  const source = await readFile(new URL('../src/components/molecules/TaskCard/TaskCard.tsx', import.meta.url), 'utf8')
  assert.match(source, /className=\{styles.titleRow\}/)
  assert.match(source, /AdaptiveLessonText text=\{headingInstruction\}/)
  assert.doesNotMatch(source, /<p className=\{styles.question\}><AdaptiveLessonText text=\{task.question\}/)
  const css = await readFile(new URL('../src/components/molecules/TaskCard/TaskCard.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.titleRow \{[^}]*flex-wrap: wrap/)
})

test('both lesson players apply the shared video layout and dot-aligned progress', async () => {
  for (const name of ['PracticeLesson', 'LiveEEG']) {
    const source = await readFile(new URL(`../src/pages/student/${name}.tsx`, import.meta.url), 'utf8')
    assert.match(source, /videoSlide \? playerStyles.videoPlayer/)
    assert.match(source, /Math\.max\(1, lesson\.slides\.length - 1\)/)
  }
  const css = await readFile(new URL('../src/pages/student/PracticeLesson.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.videoPlayer \.stage \{ height: auto/)
  assert.match(css, /max-width: 1000px/)
  const videoCss = await readFile(new URL('../src/components/molecules/ActivityTemplate/ActivityTemplate.module.css', import.meta.url), 'utf8')
  assert.match(videoCss, /aspect-ratio: 16 \/ 9/)
})

test('EEG navigation requests sound before asynchronous saving', async () => {
  const source = await readFile(new URL('../src/pages/student/LiveEEG.tsx', import.meta.url), 'utf8')
  const advance = source.slice(source.indexOf('async function advance()'), source.indexOf('const controls ='))
  assert.ok(advance.indexOf('playLessonSound(') < advance.indexOf('await trackStudentSlide('))
})

test('uploaded sound assets exist and replay correctly while respecting mute', async () => {
  let muted = false
  const played = []
  const originalAudio = globalThis.Audio
  globalThis.Audio = class {
    constructor(src) { this.src = src }
    pause() {}
    play() { played.push({ src: this.src, time: this.currentTime }); return Promise.resolve() }
  }
  globalThis.__lessonSoundPreference = () => ({ sound_enabled: !muted })
  try {
    const source = (await readFile(new URL('../src/lib/lessonSounds.ts', import.meta.url), 'utf8'))
      .replace("import { cachedApiValue } from './api'", 'const cachedApiValue = globalThis.__lessonSoundPreference')
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
    const { playLessonSound } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
    for (const kind of ['correct', 'correct', 'incorrect', 'transition', 'finished']) playLessonSound(kind)
    assert.equal(played.length, 5)
    assert.ok(played.every(sound => sound.time === 0))
    for (const sound of played) await access(new URL(`../public${sound.src}`, import.meta.url))
    muted = true
    playLessonSound('correct')
    assert.equal(played.length, 5)
  } finally {
    globalThis.Audio = originalAudio
    delete globalThis.__lessonSoundPreference
  }
})
