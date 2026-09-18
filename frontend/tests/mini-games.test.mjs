import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import ts from 'typescript'

async function load(source) {
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText.replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime'))).toString('base64')}`)
}
const logicSource = await readFile(new URL('../src/lib/miniGameLogic.ts', import.meta.url), 'utf8')
const logic = await load(logicSource)
const checkpoints = await load(await readFile(new URL('../src/lib/gardenCheckpoint.ts', import.meta.url), 'utf8'))
const source = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.tsx', import.meta.url), 'utf8')
const games = await load(source
  .replace("from 'react'", `from '${import.meta.resolve('react')}'`)
  .replace("import { Backpack, Clock, Eraser, Folder, NotebookPen, Ruler } from 'lucide-react'", "const Backpack = () => null, Clock = Backpack, Eraser = Backpack, Folder = Backpack, NotebookPen = Backpack, Ruler = Backpack")
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import { validObjectSelection, wordAtEndpoints } from '../../../lib/miniGameLogic'", logicSource)
  .replace("import styles from './MiniGames.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })')
  .replaceAll('react/jsx-runtime', import.meta.resolve('react/jsx-runtime')))

let active
globalThis.__miniGameHooks = {
  useState(initial) {
    const runtime = active, index = runtime.index++
    if (!(index in runtime.slots)) runtime.slots[index] = typeof initial === 'function' ? initial() : initial
    return [runtime.slots[index], value => { runtime.slots[index] = typeof value === 'function' ? value(runtime.slots[index]) : value }]
  },
  useRef(initial) {
    const runtime = active, index = runtime.index++
    if (!(index in runtime.slots)) runtime.slots[index] = { current: initial }
    return runtime.slots[index]
  },
  useEffect() {},
}
const interactive = await load(source
  .replace("import { Children, useEffect, useRef, useState } from 'react'", `import { Children } from '${import.meta.resolve('react')}'; const {useEffect, useRef, useState} = globalThis.__miniGameHooks`)
  .replace("import { Backpack, Clock, Eraser, Folder, NotebookPen, Ruler } from 'lucide-react'", 'const Backpack = () => null, Clock = Backpack, Eraser = Backpack, Folder = Backpack, NotebookPen = Backpack, Ruler = Backpack')
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import { validObjectSelection, wordAtEndpoints } from '../../../lib/miniGameLogic'", logicSource)
  .replace("import styles from './MiniGames.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
const discoverySource = await readFile(new URL('../src/components/molecules/TaskInteraction/DiscoveryActivities.tsx', import.meta.url), 'utf8')
const discovery = await load(discoverySource
  .replace("import { useEffect, useRef, useState } from 'react'", 'const {useEffect,useRef,useState} = globalThis.__miniGameHooks')
  .replace("import { BookOpen, Pause, Volume2, RotateCcw } from 'lucide-react'", 'const BookOpen = () => null, Pause = BookOpen, Volume2 = BookOpen, RotateCcw = BookOpen')
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import { AdaptiveLessonText } from '../TaskCard/FocusSupport'", 'const AdaptiveLessonText = ({text}) => text')
  .replace("import styles from './DiscoveryActivities.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
const gardenSource = await readFile(new URL('../src/components/molecules/TaskInteraction/GardenMission.tsx', import.meta.url), 'utf8')
const garden = await load(gardenSource
  .replace("import { useEffect, useRef, useState } from 'react'", 'const {useEffect,useRef,useState} = globalThis.__miniGameHooks')
  .replace("import GardenScene from './GardenScene'", 'const GardenScene = () => null')
  .replace("import { loadGardenCheckpoint, saveGardenCheckpoint } from '../../../lib/gardenCheckpoint'", 'const loadGardenCheckpoint = () => null, saveGardenCheckpoint = () => undefined')
  .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
  .replace("import styles from './GardenMission.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
const kitSource = await readFile(new URL('../src/components/molecules/TaskInteraction/GardenKit.tsx', import.meta.url), 'utf8')
const kit = await load(kitSource
  .replace("import { useEffect, useRef, useState } from 'react'", 'const {useEffect,useRef,useState} = globalThis.__miniGameHooks')
  .replace("import { loadGardenCheckpoint, saveGardenCheckpoint } from '../../../lib/gardenCheckpoint'", 'const loadGardenCheckpoint = () => null, saveGardenCheckpoint = () => undefined')
  .replace("import styles from './GardenMission.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
const scenes = await load((await readFile(new URL('../src/components/molecules/TaskInteraction/GardenScene.tsx', import.meta.url), 'utf8'))
  .replace("import styles from './GardenMission.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })'))
function harness(name, task, component = interactive[name]) {
  const runtime = { slots: [], index: 0 }, answers = []
  let changed = 0
  return {
    answers, get changed() { return changed },
    render() { active = runtime; runtime.index = 0; return component({ task, onAnswered: (correct, value) => { let parsed; try { parsed = JSON.parse(value) } catch { parsed = value }; answers.push({ correct, value: parsed }) }, onChanged: () => changed++ }) },
  }
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
function text(tree) {
  if (tree?.props?.['aria-hidden'] === true) return ''
  if (Array.isArray(tree)) return tree.map(text).join('')
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  return tree?.props ? text(tree.props.children) : ''
}
function click(run, label) {
  const button = nodes(run.render()).find(node => node.type === 'button' && text(node) === label)
  assert.ok(button, `Missing button: ${label}`)
  assert.ok(!button.props.disabled, `Disabled button: ${label}`)
  button.props.onClick()
}

test('word selection supports forward/reverse horizontal and vertical endpoints', () => {
  const targets = [{ word: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }, { word: 'DRY', cells: [[1,4], [2,4], [3,4]] }]
  assert.equal(logic.wordAtEndpoints(targets, [], [0,0], [0,3])?.word, 'SOAP')
  assert.equal(logic.wordAtEndpoints(targets, [], [0,3], [0,0])?.word, 'SOAP')
  assert.equal(logic.wordAtEndpoints(targets, [], [1,4], [3,4])?.word, 'DRY')
  assert.equal(logic.wordAtEndpoints(targets, ['SOAP'], [0,0], [0,3]), undefined)
  assert.equal(logic.wordAtEndpoints(targets, [], [0,0], [2,2]), undefined)
})
test('word hunt marks a word found immediately and shows its meaning question in the sidebar', () => {
  const run = harness('WordSearch', {
    grid: [['S', 'T', 'O', 'P']],
    targets: [{ word: 'STOP', displayLabel: 'STOP', cells: [[0, 0], [0, 1], [0, 2], [0, 3]], revealImage: '/stop.png',
      followUpQuestion: { question: 'What does this sign tell you?', choices: ['Stop before proceeding', 'Keep going'], answer: 'Stop before proceeding' } }],
  })
  for (const cell of ['0,0', '0,3']) nodes(run.render()).find(node => node.props?.['data-cell'] === cell).props.onClick()
  let tree = run.render()
  assert.match(text(tree), /1 of 1 found/)
  assert.match(text(tree), /Found · answer next/)
  assert.equal(nodes(tree).filter(node => node.props?.['data-cell'] && node.props.className.includes('found')).length, 4)
  const sidebar = nodes(tree).find(node => node.props?.['aria-label'] === 'Words to find')
  assert.ok(nodes(sidebar).some(node => node.type === 'section' && node.props.className === 'followUp'))
  assert.equal(run.answers.length, 0, 'Finding the word does not bypass the meaning question')
  click(run, 'Keep going')
  assert.equal(run.answers.length, 0)
  assert.match(text(run.render()), /1 of 1 found/)
  click(run, 'Stop before proceeding')
  assert.equal(run.answers.length, 1)
  assert.deepEqual(run.answers[0].value.found, ['STOP'])
  assert.deepEqual(run.answers[0].value.follow_ups, { STOP: 'Stop before proceeding' })
  assert.ok(!nodes(run.render()).some(node => node.type === 'section' && node.props.className === 'followUp'))
  click(run, 'Reset')
  tree = run.render()
  assert.match(text(tree), /0 of 1 found/)
  assert.equal(nodes(tree).filter(node => node.props?.['data-cell'] && node.props.className.includes('found')).length, 0)
})

test('garden checkpoints recover partial actions and reject other users, revisions and malformed state', () => {
  const storage = new Map(), savedStorage = globalThis.sessionStorage
  globalThis.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value) }
  const task = { checkpointKey: 'student-a/practice/class/lesson/slide', taskTemplate: 'garden_kit', items: [{id:'water'}], correctItemIds:['water'] }
  const validate = value => Array.isArray(value) && value.every(id => id === 'water')
  try {
    checkpoints.saveGardenCheckpoint(task, ['water'])
    assert.deepEqual(checkpoints.loadGardenCheckpoint(task, validate), ['water'])
    assert.equal(checkpoints.loadGardenCheckpoint({...task, checkpointKey:'student-b/practice/class/lesson/slide'}, validate), null)
    assert.equal(checkpoints.loadGardenCheckpoint({...task, correctItemIds:['soil']}, validate), null)
    checkpoints.saveGardenCheckpoint(task, ['foreign'])
    assert.equal(checkpoints.loadGardenCheckpoint(task, validate), null)
    storage.set('cortex-garden:' + task.checkpointKey, '{invalid')
    assert.equal(checkpoints.loadGardenCheckpoint(task, validate), null)
  } finally { globalThis.sessionStorage = savedStorage }
})

test('garden actions change soil, moisture and tape states with reduced-motion alternatives', async () => {
  for (const [scene, before, after] of [['soil','Small soil patch','Soil loosened'],['water','Dry soil','Moist soil'],['measure','Garden bed','Length checked'],
    ['meal','Meal plate waiting','Vegetables added to the meal'], ['display','Vase waiting','Flowers brighten the space'],
    ['practice','Practice corner','Supported plant-care practice'], ['inspect','Practice drawings on the tray','Practice drawings enlarged'],
    ['compare','Drawings waiting for comparison','Drawings shown side by side'], ['reference','Guidance card closed','Approved samples and criteria needed']]) {
    const initial=renderToStaticMarkup(createElement(scenes.default,{scene,applied:false}))
    const finished=renderToStaticMarkup(createElement(scenes.default,{scene,applied:true}))
    assert.match(initial,new RegExp(before));assert.match(finished,new RegExp(after))
    assert.notEqual(initial,finished)
    if (['inspect','compare','reference'].includes(scene)) assert.match(finished,/not a quality test/)
  }
  const css=await readFile(new URL('../src/components/molecules/TaskInteraction/GardenMission.module.css',import.meta.url),'utf8')
  assert.match(css,/prefers-reduced-motion: reduce/)
  assert.match(css,/\.quiet \.waterDrops/)
})

test('gardening kit transfers tools, keeps distractors out, prevents double completion and resets', () => {
  const run = harness('GardenKit', { items:[{id:'soil',label:'Trowel'},{id:'water',label:'Watering can'},{id:'pencil',label:'Pencil'}],correctItemIds:['soil','water'],retryFeedback:'Not needed today',correctFeedback:'Kit complete' }, kit.default)
  const target = () => nodes(run.render()).find(node => node.props?.['aria-label'] === 'Pack selected tool into toolbox')
  click(run,'Pencil'); target().props.onClick()
  assert.match(text(run.render()),/Not needed today/)
  assert.equal(run.answers.length,0)
  click(run,'Trowel'); target().props.onClick()
  assert.match(text(run.render()),/1 \/ 2 tools packed/)
  const shelf=nodes(run.render()).find(node=>node.props?.['aria-label']==='Available objects')
  assert.doesNotMatch(text(shelf),/Trowel/)
  const packed=nodes(run.render()).find(node=>node.props?.className==='packedTools')
  assert.match(text(packed),/Trowel/)
  const drop=target().props.onDrop
  const event={preventDefault(){},dataTransfer:{getData:()=> 'water'}}
  drop(event);drop(event)
  assert.equal(run.answers.length,1)
  assert.deepEqual(run.answers[0].value.picked,['soil','water'])
  assert.match(text(run.render()),/Kit complete/)
  click(run,'Reset');assert.equal(run.changed,1)
  assert.match(text(run.render()),/0 \/ 2 tools packed/)
})

test('garden mission supports tool selection, retries, drops, complete evidence and reset', () => {
  const run = harness('GardenMission', {
    items: [{ id: 'soil', label: 'Trowel' }, { id: 'water', label: 'Watering can' }],
    missions: [
      { id: 'dig', label: 'Soil', instruction: 'Loosen soil', answer: 'soil', actionLabel: 'Apply to soil', hint: 'Use a trowel', feedback: 'Soil tool matched' },
      { id: 'pour', label: 'Water', instruction: 'Water plants', answer: 'water', actionLabel: 'Apply to plant', hint: 'Use a watering can', feedback: 'Water tool matched' },
    ], correctFeedback: 'Done',
  }, garden.default)
  click(run, 'Apply to soil')
  assert.match(text(run.render()), /Choose a tool or action first/)
  click(run, 'Watering can'); click(run, 'Apply to soil')
  assert.match(text(run.render()), /Use a trowel/)
  assert.equal(run.answers.length, 0)
  click(run, 'Trowel'); click(run, 'Apply to soil')
  assert.equal(run.answers.length, 0, 'First step does not unlock completion')
  click(run, 'Next mission →')
  const target = nodes(run.render()).find(node => node.props?.['aria-label'] === 'Apply to plant')
  const drop = id => target.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => id } })
  drop('foreign-id'); assert.equal(run.answers.length, 0)
  drop('water'); drop('water')
  assert.equal(run.answers.length, 1, 'Repeated drops cannot double-save')
  assert.deepEqual(run.answers[0].value, { digital_only: true, missions: [
    { id: 'dig', tool: 'soil', target_applied: true }, { id: 'pour', tool: 'water', target_applied: true },
  ] })
  assert.match(text(run.render()), /Done/)
  click(run, 'Reset'); assert.equal(run.changed, 1)
  assert.match(text(run.render()), /Mission 1 of 2/)
})
  test('inspection shows only the current action rather than a multiple-choice panel', () => {
    const run = harness('GardenMission', {items:[{id:'look',label:'Enlarge samples'},{id:'ask',label:'Open guidance card'}],
      missions:[{id:'inspect',label:'Look',instruction:'Enlarge the tray',answer:'look',actionLabel:'Enlarge the tray',availableItemIds:['look'],hint:'Enlarge first',feedback:'Drawings enlarged'},
        {id:'confirm',label:'Check',instruction:'Check guidance',answer:'ask',actionLabel:'Check guidance',availableItemIds:['ask'],hint:'Check guidance',feedback:'Criteria needed'}]}, garden.default)
    assert.match(text(run.render()), /Enlarge samples/)
    assert.doesNotMatch(text(run.render()), /Open guidance card/)
    click(run,'Enlarge samples'); click(run,'Enlarge the tray'); click(run,'Next mission →')
    assert.doesNotMatch(text(run.render()), /Enlarge samples/)
    assert.match(text(run.render()), /Open guidance card/)
    assert.equal(run.answers.length,0)
    click(run,'Open guidance card'); click(run,'Check guidance')
    assert.equal(run.answers.length,1)
  })
  test('Find It accepts appropriate subsets without allowing distractors or duplicates', () => {
  assert.equal(logic.validObjectSelection(['rice', 'water'], ['rice', 'egg', 'water'], true, 2), true)
  assert.equal(logic.validObjectSelection(['rice'], ['rice', 'egg', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['rice', 'candy'], ['rice', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['rice', 'rice'], ['rice', 'water'], true, 2), false)
  assert.equal(logic.validObjectSelection(['water', 'rice'], ['rice', 'water']), true)
})
test('all reusable games initialize and render accessible buttons', () => {
  const task = { id: 'test', items: [{ id: 'pencil', label: 'Pencil', imageUrl: '/pencil.png', price: 8 }, { id: 'book', label: 'Book', price: 15 }], correctItemIds: ['pencil'], grid: Array.from({ length: 7 }, () => Array(7).fill('X')), targets: [{ word: 'SOAP', displayLabel: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }], rounds: [{ direction: 'Tap the pencil, then the book.', correctOrder: ['pencil', 'book'] }], targetItemId: 'pencil', paymentOptions: [10,20], payment: 10, givenChange: 2 }
  for (const name of ['FindIt', 'WordSearch', 'AudioSequence', 'Shopping']) {
    const markup = renderToStaticMarkup(createElement(games[name], { task }))
    assert.match(markup, /type="button"/)
    assert.doesNotMatch(markup, /countdown|lives left|time remaining/i)
  }
  const audio = renderToStaticMarkup(createElement(games.AudioSequence, { task }))
  assert.doesNotMatch(audio, /Tap the pencil, then the book/)
  assert.match(audio, /Show a visual prompt/)
  assert.match(audio, /disabled/)
})
test('word hunt has pointer and keyboard button paths and calm responsive styles', async () => {
  assert.match(source, /onPointerUp/)
  assert.match(source, /onClick/)
  assert.match(source, /onPointerCancel/)
  const css = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.module.css', import.meta.url), 'utf8')
  assert.match(css, /min-height: 44px/)
  assert.match(css, /focus-visible/)
  assert.match(css, /max-width: 380px/)
  assert.doesNotMatch(css, /animation:/)
})

test('picture self-reflections save neutral selections while scored questions retain feedback', async () => {
  const taskSource = await readFile(new URL('../src/components/molecules/TaskInteraction/TaskInteraction.tsx', import.meta.url), 'utf8')
  const module = await load(taskSource
    .replace("import { useMemo, useRef, useState } from 'react'", 'const {useRef,useState} = globalThis.__miniGameHooks; const useMemo = factory => factory()')
    .replace(/import .* from 'lucide-react'/, 'const GripVertical = () => null, ImageIcon = GripVertical, Puzzle = GripVertical, RotateCcw = GripVertical')
    .replace("import { playLessonSound } from '../../../lib/lessonSounds'", 'const playLessonSound = () => undefined')
    .replace("import styles from './TaskInteraction.module.css'", 'const styles = new Proxy({}, { get: (_, key) => String(key) })')
    .replace("import CreativeTask from './CreativeTask'", 'const CreativeTask = () => null')
    .replace("import ToothBrushingTask from './ToothBrushingTask'", 'const ToothBrushingTask = () => null')
    .replace("import GardenMission from './GardenMission'", 'const GardenMission = () => null')
    .replace("import GardenKit from './GardenKit'", 'const GardenKit = () => null')
    .replace("import { DiscoveryBoard, ScenarioClassifier } from './DiscoveryActivities'", 'const DiscoveryBoard = () => null, ScenarioClassifier = DiscoveryBoard')
    .replace(/import .* from '.\/MiniGames'/, 'const AudioSequence = () => null, FindIt = AudioSequence, FlipMatching = AudioSequence, Shopping = AudioSequence, WordSearch = AudioSequence'))
  for (const options of [{correctItemIds:[]}, {scored:false,correctItemIds:['other']}]) {
    const run = harness('', {taskTemplate:'picture_choice',selectionMode:'multiple',items:[{id:'crafts',label:'Make crafts'}],...options}, module.default)
    click(run, 'Make crafts'); click(run, 'Save choices')
    assert.equal(run.answers.at(-1).correct, true)
    const card = nodes(run.render()).find(node => node.type === 'button' && text(node) === 'Make crafts')
    assert.match(card.props.className, /selected/)
    assert.doesNotMatch(card.props.className, /correct|incorrect/)
    assert.doesNotMatch(text(run.render()), /↻/)
  }
  const run = harness('', {taskTemplate:'picture_choice',selectionMode:'multiple',items:[{id:'wrong',label:'Wrong choice'}],correctItemIds:['right']}, module.default)
  click(run, 'Wrong choice'); click(run, 'Check my choices')
  assert.equal(run.answers.at(-1).correct, false)
  assert.ok(nodes(run.render()).some(node => node.type === 'button' && node.props.className.includes('incorrect')))
  const sort = harness('', {taskTemplate:'sort_groups',items:[{id:'tailor',label:'Alter clothes'},{id:'draw',label:'Draw for fun'}],categories:[{id:'work',label:'Work'},{id:'free',label:'Free time'}],sortAnswers:{tailor:'work',draw:'free'}}, module.default)
  const layout = nodes(sort.render()).find(node => node.props?.className === 'sortLayout')
  assert.ok(nodes(layout).some(node => node.props?.['aria-label'] === 'Drop zones'))
  assert.match(text(sort.render()), /Drag cards into a group/)
  click(sort, 'Alter clothes')
  assert.match(text(sort.render()), /Selected: Alter clothes/)
  click(sort, 'WorkDrop here')
  assert.equal(sort.answers.length, 0)
  nodes(sort.render()).find(node => node.type === 'button' && text(node) === 'Draw for fun').props.onDragStart()
  nodes(sort.render()).find(node => node.type === 'button' && text(node) === 'Free timeDrop here').props.onDrop()
  assert.equal(sort.answers.at(-1).correct, true)
  assert.deepEqual(sort.answers.at(-1).value, {tailor:'work',draw:'free'})
})

test('Discovery Board permits overlap, not sure, neutral save and restored self-report', () => {
  const task = { items:[{id:'garden',label:'Gardening'},{id:'unsure',label:'Not sure yet'}], categories:[{id:'enjoy',label:'I enjoy'},{id:'can',label:'I can'},{id:'explore',label:'I explore'}], selfReportFields:{enjoy:'selfReportedInterests',can:'selfReportedCapabilities',explore:'activitiesToExplore'} }
  const run = harness('', task, discovery.DiscoveryBoard)
  const choose = label => nodes(run.render()).find(node => node.type === 'button' && text(node).startsWith(label)).props.onClick()
  choose('Gardening'); choose('I can'); choose('Not sure yet'); choose('I explore'); choose('Gardening'); click(run, 'Save reflection')
  assert.equal(run.answers.at(-1).correct, true)
  const value = run.answers.at(-1).value
  assert.deepEqual(value.fields.selfReportedInterests, ['garden'])
  assert.deepEqual(value.fields.activitiesToExplore, ['garden'])
  assert.deepEqual(value.fields.selfReportedCapabilities, ['unsure'])
  assert.equal(value.evidence_type, 'self_report')
  assert.doesNotMatch(text(run.render()), /Correct|talented|career/)
  const restored = harness('', {...task,initialResponse:JSON.stringify(value)}, discovery.DiscoveryBoard)
  assert.match(text(restored.render()), /Gardening/)
  assert.ok(nodes(restored.render()).some(node => node.type === 'button' && text(node).startsWith('Gardening') && node.props['aria-pressed']))
})

test('scenario classifier retries current clue and validates full completion', () => {
  const run = harness('', {scenarios:[{clue:'Enjoys plants',choices:['Interest','Skill'],answer:'Interest',feedback:'Enjoyment'}, {clue:'Learned to water plants',choices:['Interest','Skill'],answer:'Skill',feedback:'Learned'}]}, discovery.ScenarioClassifier)
  click(run, 'Skill'); assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Try this clue again'); click(run, 'Interest'); click(run, 'Next clue'); click(run, 'Skill')
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.answers, ['Interest','Skill'])
  nodes(run.render()).find(node => node.props?.['aria-label'] === 'Reset clues').props.onClick(); assert.match(text(run.render()), /Clue 1 of 2/)
})

test('narration supports requested play pause resume and replay without autoplay', () => {
  let plays = 0, pauses = 0, resumes = 0
  globalThis.window = {dispatchEvent(){},speechSynthesis:{cancel(){},pause(){pauses++},resume(){resumes++},speak(){plays++}}}
  globalThis.SpeechSynthesisUtterance = class {constructor(script){this.text=script}}
  const run = harness('', {script:'A skill develops with practice.'}, props => discovery.AudioNarration({script:props.task.script}))
  run.render(); assert.equal(plays, 0)
  click(run, 'Listen'); assert.equal(plays, 1)
  click(run, 'Pause'); assert.equal(pauses, 1)
  click(run, 'Resume'); assert.equal(resumes, 1)
  click(run, 'Replay'); assert.equal(plays, 2)
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance
})

test('quiet discussion shows one card with access to all concepts', () => {
  const run = harness('', {task:{title:'Concepts',steps:[{id:'interest',title:'Interest',description:'Enjoyment'},{id:'skill',title:'Skill',description:'Learning'}]},quiet:true}, props => discovery.DiscussionCards(props.task))
  assert.ok(nodes(run.render()).some(node => node.props?.text === 'Enjoyment'))
  assert.ok(!nodes(run.render()).some(node => node.props?.text === 'Learning'))
  click(run, 'Next card'); assert.ok(nodes(run.render()).some(node => node.props?.text === 'Learning'))
})

test('flip cards use balanced three-column rows and two columns on small screens', async () => {
  const css = await readFile(new URL('../src/components/molecules/TaskInteraction/MiniGames.module.css', import.meta.url), 'utf8')
  assert.match(css, /\.flipGrid\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 600px\)\s*\{\s*\.flipGrid\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  // Both faces contribute intrinsic height, so wrapped labels cannot spill out.
  assert.match(css, /\.flipInner\s*\{[^}]*display: grid/)
  assert.match(css, /\.flipFace\s*\{[^}]*grid-area: 1 \/ 1/)
  assert.doesNotMatch(css, /\.flipFace\s*\{[^}]*position: absolute/)
})

test('Find It handler feedback, incorrect selections, reset and completion', () => {
  const task = { items: [{ id: 'soap', label: 'Soap' }, { id: 'pencil', label: 'Pencil' }], correctItemIds: ['soap'] }
  const run = harness('FindIt', task)
  click(run, 'Pencil'); click(run, 'Check my choices')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Reset'); assert.equal(run.changed, 1)
  click(run, 'Soap'); click(run, 'Check my choices')
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.picked, ['soap'])
})
test('word endpoint handlers complete once and reset found progress', () => {
  const run = harness('WordSearch', { grid: [['S','O','A','P']], targets: [{ word: 'SOAP', displayLabel: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }] })
  nodes(run.render()).find(node => node.props?.['data-cell'] === '0,0').props.onClick()
  nodes(run.render()).find(node => node.props?.['data-cell'] === '0,3').props.onClick()
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.found, ['SOAP'])
  assert.ok(nodes(run.render()).filter(node => node.props?.['data-cell']).every(node => node.props.className.includes('found')))
  assert.match(text(run.render()), /Found/)
  click(run, 'Reset'); assert.equal(run.changed, 1)
  assert.match(text(run.render()), /0 of 1 found/)
})
test('audio replay, playback gate, sequence completion and requested prompt evidence', () => {
  const utterances = []
  globalThis.window = { speechSynthesis: { cancel() {}, speak(value) { utterances.push(value) } } }
  globalThis.SpeechSynthesisUtterance = class { constructor(value) { this.text = value } }
  const run = harness('AudioSequence', { items: [{ id: 'pencil', label: 'Pencil' }, { id: 'book', label: 'Book' }], rounds: [{ direction: 'Tap the pencil, then the book.', correctOrder: ['pencil','book'] }] })
  assert.doesNotMatch(text(run.render()), /Tap the pencil, then the book/)
  click(run, '▶ Listen')
  assert.equal(nodes(run.render()).find(node => node.type === 'button' && text(node) === 'Pencil').props.disabled, true)
  utterances.at(-1).onend()
  click(run, '↻ Listen again'); utterances.at(-1).onend()
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(run.answers.at(-1).value.rounds[0].completion_support, 'after_replay')
  assert.equal(run.answers.at(-1).value.rounds[0].replays, 1)
  click(run, 'Reset activity'); click(run, 'Show a visual prompt')
  assert.match(text(run.render()), /Tap the pencil, then the book/)
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).value.rounds.length, 1)
  assert.equal(run.answers.at(-1).value.rounds[0].completion_support, 'with_visual_prompt')
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance
})
test('shopping handlers run a complete transaction and reject insufficient payment', () => {
  const task = { items: [{ id: 'pencil', label: 'Pencil', price: 8 }, { id: 'book', label: 'Book', price: 15 }], targetItemId: 'pencil', paymentOptions: [5,10,20], payment: 10, givenChange: 2 }
  const run = harness('Shopping', task)
  click(run, 'Pencil₱8'); click(run, '₱8'); click(run, 'Pay ₱5')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Restart transaction')
  click(run, 'Pencil₱8'); click(run, '₱8'); click(run, 'Pay ₱10'); click(run, 'Yes')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(run.answers.at(-1).value.change, 2)
  assert.equal(run.answers.at(-1).value.verified, true)
})

test('listening retry retains playback readiness and does not require a replay', () => {
  const utterances = []
  globalThis.window = { speechSynthesis: { cancel() {}, speak(value) { utterances.push(value) } } }
  globalThis.SpeechSynthesisUtterance = class {}
  const run = harness('AudioSequence', { items: [{id:'pencil',label:'Pencil'},{id:'book',label:'Book'}], rounds:[{direction:'A story.',correctOrder:['pencil','book']}] })
  click(run, '▶ Listen'); utterances[0].onend()
  click(run, 'Book'); click(run, 'Pencil')
  assert.equal(run.answers.at(-1).correct, false)
  click(run, 'Try this round again')
  assert.equal(nodes(run.render()).find(node => node.type === 'button' && text(node) === 'Pencil').props.disabled, false)
  click(run, 'Pencil'); click(run, 'Book')
  assert.equal(run.answers.at(-1).correct, true)
  assert.equal(utterances.length, 1)
  assert.equal(run.answers.at(-1).value.rounds[0].replays, 0)
  delete globalThis.window; delete globalThis.SpeechSynthesisUtterance
})

test('flip cards hide content, retry mismatches, retain matched pairs and reset', () => {
  const run = harness('FlipMatching', { pairs: [{id:'egg',left:{label:'Egg',imageUrl:'/egg.png'},right:{label:'Builds the body'}},{id:'rice',left:{label:'Rice',imageUrl:'/rice.png'},right:{label:'Gives energy'}}] })
  assert.doesNotMatch(text(run.render()), /Gives energy|Builds the body/)
  const deck = nodes(run.render()).filter(node => node.type === 'button' && node.key?.includes(':'))
  const flip = key => nodes(run.render()).find(node => node.key === key).props.onClick()
  assert.equal(deck.length, 4)
  flip('egg:picture'); flip('rice:meaning')
  assert.equal(run.answers.at(-1).correct, false)
  assert.doesNotMatch(text(run.render()), /Turn cards back/)
  flip('egg:picture'); flip('rice:meaning')
  flip('egg:picture'); flip('egg:meaning')
  assert.match(text(run.render()), /1 of 2 pairs matched/)
  flip('rice:picture'); flip('rice:meaning')
  assert.equal(run.answers.at(-1).correct, true)
  assert.deepEqual(run.answers.at(-1).value.matched, ['egg','rice'])
  click(run, 'Reset cards')
  assert.match(text(run.render()), /0 of 2 pairs matched/)
  flip('egg:picture'); flip('rice:meaning')
  flip('rice:picture')
  assert.equal(nodes(run.render()).find(node => node.key === 'egg:picture').props['aria-pressed'], false)
  assert.equal(nodes(run.render()).find(node => node.key === 'rice:picture').props['aria-pressed'], true)
  flip('rice:meaning')
  assert.match(text(run.render()), /1 of 2 pairs matched/)
})
test('reduced presentation pages objects but retains all configured choices', () => {
  const task = { items: Array.from({length: 6}, (_, i) => ({ id: String(i), label: `Object ${i}` })), correctItemIds: ['5'] }
  const markup = renderToStaticMarkup(createElement(games.FindIt, { task, quiet: true }))
  assert.match(markup, /More objects/)
  assert.match(markup, /Group 1 of 3/)
  assert.match(markup, /Object 0/)
  assert.doesNotMatch(markup, /Object 5/)
  assert.equal(task.items.length, 6)
})
