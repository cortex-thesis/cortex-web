import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const revision=JSON.parse(await readFile(new URL('../../web/career01_revision.json',import.meta.url),'utf8'))
test.use({hasTouch:true})
async function fixture(page,position) {
 const slides=Array.from({length:8},(_,index)=>{
  const screen=revision.replacements[String(index)]??{title:`Unchanged slide ${index+1}`,type:'image',configuration:{template:'visual_narrative',steps:[{id:'same',title:'Existing lesson guidance'}]}}
  return {id:100+index,position:index,title:screen.title,activity:{type:screen.type,configuration:screen.configuration}}
 })
 const saved=[]
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  let value={}
  if(path==='/api/auth/me/')value={id:'career-revision-test',name:'Test learner',role:'student'}
  else if(path==='/api/notifications/')value={notifications:[],unread_count:0}
  else if(path==='/api/class-sessions/')value={sessions:[]}
  else if(path==='/api/student/preferences/')value={sound_enabled:false}
  else if(path==='/api/student/classes/1/lessons/1/') {
   const body=route.request().postDataJSON()
   if(body?.slide_id)saved.push(body)
   value={id:1,title:'My Strengths and Skills',package:'career',slides,progress:{completed_slide_ids:slides.slice(0,position).map(s=>s.id),activity_evidence:{}}}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 })
 return saved
}

test('student Career package keeps historical-version disclosure hidden',async({page})=>{
 await fixture(page,0)
 await page.route('**/api/student/classes/1/packages/career/',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({
  class:{id:1,name:'Test class'},package:{slug:'career',name:'Career'},
  lessons:[{id:300037,title:'My Strengths and Skills',progress:{status:'not_started',percentage:0}}],
  historical_lessons:[{id:16,title:'Previous CAREER-01 version',progress:{status:'completed',percentage:100}}],
 })}))
 await page.goto('/student/class/1/package/career')
 await expect(page.getByText('My Strengths and Skills',{exact:true})).toBeVisible()
 await expect(page.getByText('Previous CAREER-01 version',{exact:true})).toHaveCount(0)
 await expect(page.getByText(/previous versions/i)).toHaveCount(0)
})
for(const width of [1280,872,390]) {
 test(`CAREER-01 video guidance, no autoplay, pause and skip at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===872?650:844})
  await fixture(page,1)
  // Stub playback events deliberately: this tests Cortex integration, not the
  // externally hosted video's content or live availability.
  await page.addInitScript(()=>{
   window.__careerPaused=0
   window.YT={Player:class {
    constructor(frame,options){window.__careerVideoEvents=options.events;queueMicrotask(()=>options.events.onReady?.())}
    getDuration(){return 100} getCurrentTime(){return 0}
    pauseVideo(){window.__careerPaused++} destroy(){}
   }}
  })
  await page.route('**/www.youtube.com/embed/**',route=>route.fulfill({contentType:'text/html',body:'<html></html>'}))
  await page.goto('/student/class/1/lesson/1/practice')
  await expect(page.getByRole('heading',{name:'Strengths: In the Words of Students',exact:true})).toBeVisible()
  const frame=page.locator('iframe[title="Strengths: In the Words of Students"]')
  await expect(frame).toBeVisible()
  const src=new URL(await frame.getAttribute('src'))
  expect(src.pathname).toBe('/embed/WN3AnXRUmuc')
  expect(src.searchParams.get('autoplay')).not.toBe('1')
  await expect(page.getByText('Students talk about how they use their strengths. Notice one example of something a person does well.',{exact:true})).toBeVisible()
  const guidance=page.getByRole('complementary',{name:'Lesson guidance'})
  await expect(guidance.locator('li')).toHaveCount(3)
  for(const item of revision.replacements['1'].configuration.video_guidance)await expect(guidance.getByText(item.title,{exact:true})).toBeVisible()
  expect(await guidance.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true)
  const navigation=page.getByRole('navigation',{name:'Activity navigation'})
  const stage=page.locator('[class*="videoStage"]')
  const bounds=await Promise.all([frame.boundingBox(),guidance.boundingBox(),navigation.boundingBox(),stage.boundingBox()])
  expect(bounds.every(Boolean)).toBe(true)
  expect(bounds[0].y+bounds[0].height).toBeLessThanOrEqual(bounds[1].y)
  expect(bounds[1].y+bounds[1].height).toBeLessThanOrEqual(bounds[3].y+bounds[3].height+1)
  expect(bounds[3].y+bounds[3].height).toBeLessThanOrEqual(bounds[2].y)
  await page.screenshot({path:`../.runtime/career01-video-layout-${width}.png`,fullPage:true})
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__careerVideoEvents))).toBe(true)
  await page.evaluate(()=>window.dispatchEvent(new Event('cortex:pause-media')))
  expect(await page.evaluate(()=>window.__careerPaused)).toBeGreaterThan(0)
  await page.evaluate(()=>window.__careerVideoEvents.onError({data:150}))
  await expect(page.getByText('This video is unavailable',{exact:true})).toBeVisible()
  await expect(guidance).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`../.runtime/career01-video-${width}.png`,fullPage:true})
  await page.getByRole('navigation',{name:'Activity navigation'}).getByRole('button',{name:'Continue without video',exact:true}).click()
  await expect(page.getByText('Activity 3 of 8',{exact:true})).toBeVisible()
 })
 test(`CAREER-01 word hunt supports keyboard, touch, reset and meaning retry at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  const saved=await fixture(page,5)
  await page.goto('/student/class/1/lesson/1/practice')
  await expect(page.getByRole('heading',{name:'Skill Word Hunt',exact:true})).toBeVisible()
  const grid=page.getByLabel('Word hunt letters',{exact:true})
  await expect(grid.getByRole('button')).toHaveCount(36)
  await grid.locator('[data-cell="0,0"]').focus();await page.keyboard.press('Enter')
  await grid.locator('[data-cell="1,0"]').focus();await page.keyboard.press('Enter')
  await expect(page.getByText('Try another line of letters.',{exact:true})).toBeVisible()
  const next=page.getByRole('button',{name:'Next activity',exact:true})
  await expect(next).toBeDisabled()
  for(const [index,target] of revision.replacements['5'].configuration.targets.entries()) {
   for(const cell of [target.cells[0],target.cells.at(-1)]) {
    const button=grid.locator(`[data-cell="${cell.join(',')}"]`)
    if(index===0){await button.focus();await page.keyboard.press('Enter')}else await button.tap()
   }
   const meaning=page.getByRole('region',{name:`${target.display_label} found. Choose the word's meaning.`})
   await expect(meaning).toBeVisible()
   await expect(meaning.locator('img')).toBeVisible()
   if(index===0) {
    await meaning.getByRole('button',{name:target.follow_up_question.choices.find(c=>c!==target.follow_up_question.answer),exact:true}).click()
    await expect(meaning.getByText('Look at the picture again. What does the word mean?',{exact:true})).toBeVisible()
    await expect(next).toBeDisabled()
   }
   await meaning.getByRole('button',{name:target.follow_up_question.answer,exact:true}).click()
  }
  await expect(next).toBeEnabled()
  await expect.poll(()=>saved.some(body=>body.action==='answer'&&JSON.parse(body.selected).found.length===4)).toBe(true)
  await page.getByRole('button',{name:'Reset word search',exact:true}).click()
  await expect(page.getByText('0 of 4 found',{exact:true})).toBeVisible()
  await expect(next).toBeDisabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`../.runtime/career01-word-hunt-${width}.png`,fullPage:true})
 })
}
