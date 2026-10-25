import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const lessons = JSON.parse(await readFile(new URL('../../web/enrichment_lessons.json', import.meta.url), 'utf8'))
async function fixture(page, lesson, position) {
  const slides=lesson.slides.map((s,i)=>({id:i+100,position:i,title:s.title,activity:{type:s.type,configuration:s.configuration}}))
  await page.route('**/api/**', async route => {
    const path=new URL(route.request().url()).pathname
    let value={}
    if(path==='/api/auth/me/') value={id:'enrichment-test',name:'Test learner',role:'student'}
    else if(path==='/api/notifications/') value={notifications:[],unread_count:0}
    else if(path==='/api/class-sessions/') value={sessions:[]}
    else if(path==='/api/student/preferences/') value={sound_enabled:false}
    else if(path==='/api/student/classes/1/lessons/1/') value={id:1,title:lesson.title,package:'enrichment',slides,progress:{completed_slide_ids:slides.slice(0,position).map(s=>s.id),activity_evidence:{}}}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
  })
}
for(const width of [1280,390]) for(const lesson of lessons) {
 test(`${lesson.lesson_id} boundaries and navigation at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  await fixture(page,lesson,0)
  await page.goto('/student/class/1/lesson/1/practice')
  const boundary=page.locator('[data-lesson-overview="true"]:visible')
  await expect(boundary).toBeVisible()
  await expect(boundary.locator('img')).toHaveCount(1)
  await expect.poll(()=>boundary.locator('img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole('button',{name:'Next activity',exact:true}).click()
  await expect(page.getByRole('heading',{name:lesson.slides[1].title,exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Previous',exact:true}).click()
  await expect(boundary).toBeVisible()
  await page.unroute('**/api/**')
  await fixture(page,lesson,lesson.slides.length-1)
  await page.reload()
  await expect(page.getByRole('heading',{name:lesson.slides.at(-1).title,exact:true})).toBeVisible()
  await expect(boundary.locator('img')).toHaveCount(1)
  await expect.poll(()=>boundary.locator('img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  if(lesson.lesson_id==='ENRICH-03') await page.screenshot({path:`../.runtime/enrichment-closing-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'Finish lesson',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Practice complete',exact:true})).toBeVisible()
 })
}
test('movement video continues to the closing slide',async({page})=>{
 const lesson=lessons.find(l=>l.lesson_id==='ENRICH-03')
 await fixture(page,lesson,8)
 await page.route('**/youtube.com/**',route=>route.abort())
 await page.goto('/student/class/1/lesson/1/practice')
 await expect(page.getByRole('heading',{name:'Move to the Beat: Follow Along',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Continue without video',exact:true}).first().click()
 await expect(page.getByRole('heading',{name:lesson.slides.at(-1).title,exact:true})).toBeVisible()
 await expect(page.getByText('Activity 10 of 10',{exact:true})).toBeVisible()
})
test('pattern cards render supplied PNGs and keep correct-answer behavior',async({page})=>{
 await fixture(page,lessons.find(l=>l.lesson_id==='ENRICH-03'),3)
 await page.goto('/student/class/1/lesson/1/practice')
 await expect(page.getByRole('heading',{name:'Find the Missing Beat',exact:true})).toBeVisible()
 const pause=page.getByRole('button',{name:'Hands making a pause signal Pause',exact:true})
 await expect(pause.locator('img')).toBeVisible()
 await expect.poll(()=>pause.locator('img').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true)
 await pause.click()
 await expect(page.getByRole('button',{name:'Next activity',exact:true})).toBeEnabled()
 await page.screenshot({path:'../.runtime/enrichment-pattern.png',fullPage:true})
})
