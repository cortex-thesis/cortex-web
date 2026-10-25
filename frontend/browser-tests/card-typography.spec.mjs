import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const definitions=JSON.parse(await readFile(new URL('../../web/enrichment_lessons.json',import.meta.url),'utf8'))
const lesson=definitions[0]
async function fixture(page,position) {
 const slides=lesson.slides.map((s,index)=>({id:index+100,position:index,title:s.title,activity:{type:s.type,configuration:s.configuration}}))
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  let value={}
  if(path==='/api/auth/me/')value={id:'cards-test',name:'Test learner',role:'student'}
  else if(path==='/api/notifications/')value={notifications:[],unread_count:0}
  else if(path==='/api/class-sessions/')value={sessions:[]}
  else if(path==='/api/student/preferences/')value={sound_enabled:false}
  else if(path==='/api/student/classes/1/lessons/1/')value={id:1,title:lesson.title,package:'enrichment',slides,progress:{completed_slide_ids:slides.slice(0,position).map(s=>s.id),activity_evidence:{}}}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 })
}
for(const width of [1280,390]) test(`shared narrative cards have distinct typography at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await fixture(page,1)
 await page.goto('/student/class/1/lesson/1/practice')
 const cards=page.locator('ol[aria-label="Step-by-step visual narrative"]:visible > li')
 await expect(cards).toHaveCount(4)
 for(const card of await cards.all()) {
  const title=card.locator('strong').first()
  const copy=card.locator(':scope > div').last()
  const description=copy.locator(':scope > span')
  const headingStyle=await title.evaluate(e=>({size:parseFloat(getComputedStyle(e).fontSize),weight:Number(getComputedStyle(e).fontWeight),color:getComputedStyle(e).color}))
  const descriptionStyle=await description.evaluate(e=>({size:parseFloat(getComputedStyle(e).fontSize),weight:Number(getComputedStyle(e).fontWeight),color:getComputedStyle(e).color,line:parseFloat(getComputedStyle(e).lineHeight)}))
  expect(headingStyle.weight).toBeGreaterThanOrEqual(600)
  expect(headingStyle.size).toBeGreaterThan(descriptionStyle.size)
  expect(descriptionStyle.weight).toBe(400)
  expect(descriptionStyle.line/descriptionStyle.size).toBeCloseTo(1.5,1)
  expect(descriptionStyle.color).not.toBe(headingStyle.color)
  expect(await copy.evaluate(e=>parseFloat(getComputedStyle(e).rowGap))).toBeGreaterThanOrEqual(8)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`../.runtime/card-typography-${width}.png`,fullPage:true})
})
test('flip deck remains stable through matching and reset clears completion',async({page})=>{
 await fixture(page,2)
 await page.goto('/student/class/1/lesson/1/practice')
 await expect(page.getByRole('heading',{name:'Behind the Gallery Doors',exact:true})).toBeVisible()
 const cards=page.locator('[class*="flipGrid"] > button')
 await expect(cards).toHaveCount(6)
 const pair=lesson.slides[2].configuration.pairs[0]
 const positions=[]
 for(let index=0;index<6;index++) {
  const card=cards.nth(index)
  await card.click()
  const label=await card.getAttribute('aria-label')
  if(label===pair.left.label+', tap to turn over'||label===pair.right.label+', tap to turn over')positions.push(index)
  await card.click()
 }
 expect(positions).toHaveLength(2)
 await cards.nth(positions[0]).click()
 await cards.nth(positions[1]).click()
 await expect(page.getByText('1 of 3 pairs matched',{exact:true})).toBeVisible()
 await expect(cards.nth(positions[0])).toBeDisabled()
 await expect(cards.nth(positions[1])).toBeDisabled()
 await page.getByRole('button',{name:'Reset cards',exact:true}).click()
 await expect(page.getByText('0 of 3 pairs matched',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:/^Flip card \d+$/})).toHaveCount(6)
})
