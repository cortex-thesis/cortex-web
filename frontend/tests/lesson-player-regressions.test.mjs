import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('shared activity instructions appear once in a responsive title row', async () => {
  const source = await readFile(new URL('../src/components/molecules/TaskCard/TaskCard.tsx', import.meta.url), 'utf8')
  assert.match(source, /className=\{styles.titleRow\}/)
  assert.match(source, /AdaptiveLessonText text=\{headingInstruction\}/)
  assert.doesNotMatch(source, /templateLabel|typeLabel/)
  assert.match(source, /isLessonOverview[\s\S]*task\.steps\?\.length === 1/)
  assert.doesNotMatch(source, /<p className=\{styles.question\}><AdaptiveLessonText text=\{task.question\}/)
  const css = await readFile(new URL('../src/components/molecules/TaskCard/TaskCard.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.titleRow \{[^}]*flex-wrap: wrap/)
  assert.match(css, /\.contentHeading h2 \{[^}]*color: var\(--color-interface-purple\)/)
  assert.match(css, /\.card\.lessonOverview \{[^}]*max-width: 960px[^}]*margin-inline: auto/)
  const playerCss = await readFile(new URL('../src/pages/student/PracticeLesson.module.css', import.meta.url), 'utf8')
  assert.match(playerCss, /data-lesson-overview="true"[^}]*max-width: 960px[^}]*margin-inline: auto/)
  assert.match(playerCss, /\.actions \.next \{[^}]*grid-column: 3[^}]*justify-self: end/)
})

test('both lesson players apply the shared video layout and dot-aligned progress', async () => {
  for (const name of ['PracticeLesson', 'LiveEEG']) {
    const source = await readFile(new URL(`../src/pages/student/${name}.tsx`, import.meta.url), 'utf8')
    assert.match(source, /videoSlide \? playerStyles.videoPlayer/)
    assert.match(source, /wideSlide \? playerStyles.widePlayer/)
    assert.match(source, /Math\.max\(1, lesson\.slides\.length - 1\)/)
  }
  const css = await readFile(new URL('../src/pages/student/PracticeLesson.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.videoPlayer \.stage \{ height: auto/)
  assert.match(css, /max-width: 1000px/)
  assert.match(css, /\.player \{[^}]*width: min\(100%, 860px\)[^}]*max-width: 860px/)
  assert.match(css, /\.widePlayer \{[^}]*max-width: 1000px/)
  const videoCss = await readFile(new URL('../src/components/molecules/ActivityTemplate/ActivityTemplate.module.css', import.meta.url), 'utf8')
  assert.match(videoCss, /aspect-ratio: 16 \/ 9/)
})

test('EEG navigation requests sound before asynchronous saving', async () => {
  const source = await readFile(new URL('../src/pages/student/LiveEEG.tsx', import.meta.url), 'utf8')
  const advance = source.slice(source.indexOf('async function advance('), source.indexOf('const controls ='))
  assert.ok(advance.indexOf('playLessonSound(') < advance.indexOf('await trackStudentSlide('))
})

test('headset signal loss does not cover or disable a started lesson', async () => {
  const source = await readFile(new URL('../src/pages/student/LiveEEG.tsx', import.meta.url), 'utf8')
  assert.match(source, /const isDevBypass = import\.meta\.env\.DEV && context\.devBypass === true/)
  assert.doesNotMatch(source, /connectionInterrupted|Adjust your headset|Reconnecting to your headset/)
  assert.match(source, /const calibrated = Boolean\(forcedState \|\| status === 'streaming'\)/)
  assert.match(source, /inert=\{remotelyPaused\}/)
})

test('refocus word activity accepts physical keyboard input without a global listener', async () => {
  const source = await readFile(new URL('../src/pages/student/EEGRegulation.tsx', import.meta.url), 'utf8')
  assert.match(source, /onKeyDown=\{handleWordKey\}/)
  assert.match(source, /event\.key === 'Backspace'/)
  assert.match(source, /event\.key === 'Enter'/)
  assert.doesNotMatch(source, /window\.addEventListener\(['"]keydown/)
})

test('tooth brushing keeps the brush and teeth in one responsive visual cluster', async () => {
  const source = await readFile(new URL('../src/components/molecules/TaskInteraction/ToothBrushingTask.tsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/components/molecules/TaskInteraction/TaskInteraction.module.css', import.meta.url), 'utf8')
  assert.match(source, /className=\{styles\.brushScene\}/)
  assert.match(css, /\.brushScene \{[^}]*display: grid[^}]*place-items: center/)
  assert.match(css, /\.teethImage \{[^}]*width: 100%[^}]*height: 100%[^}]*object-fit: contain/)
  assert.doesNotMatch(css, /\.movingBrush \{[^}]*position: absolute/)
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
