import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const definition=JSON.parse(await readFile(new URL('../../web/career03_revision.json',import.meta.url),'utf8'))
test.use({hasTouch:true})
async function fixture(page,screen) {
 const saved=[]
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  let value={}
  if(path==='/api/auth/me/')value={id:'team-test',name:'Test learner',role:'student'}
  else if(path==='/api/notifications/')value={notifications:[],unread_count:0}
  else if(path==='/api/class-sessions/')value={sessions:[]}
  else if(path==='/api/student/preferences/')value={sound_enabled:false}
  else if(path==='/api/student/classes/1/lessons/1/') {
   const body=route.request().postDataJSON();if(body?.slide_id)saved.push(body)
   value={id:1,title:'Helpful Attitudes at Work',package:'career',slides:[{id:100,title:screen.title,activity:{type:screen.type,configuration:screen.configuration}}],progress:{completed_slide_ids:[],activity_evidence:{}}}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 })
 return saved
}
for(const width of [1280,390]) {
 test(`text matching hides topic pictures and retains drag handles at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  await fixture(page,{title:'Match Attitudes to Effects',type:'interactive',configuration:{task_template:'matching_pairs',hide_image_labels:true,pairs:[
   {id:'punctual',left:{id:'punctuality',label:'Punctuality',image_url:'/assets/livelihood/common/checklist.png'},right:{id:'ready',label:'Ready when work begins',image_url:'/assets/livelihood/common/checklist.png'}},
   {id:'diligent',left:{id:'diligence',label:'Diligence',image_url:'/assets/livelihood/common/checklist.png'},right:{id:'effort',label:'Careful and continued effort',image_url:'/assets/livelihood/common/checklist.png'}},
   {id:'ignore',left:{id:'ignoring',label:'Repeatedly ignoring instructions',image_url:'/assets/livelihood/common/checklist.png'},right:{id:'interfere',label:'May interfere with safe completion',image_url:'/assets/livelihood/common/checklist.png'}}
  ]}})
  await page.goto('/student/class/1/lesson/1/practice')
  const source=page.getByRole('button',{name:'Punctuality',exact:true})
  await expect(source).toBeVisible()
  const grid=page.locator('[class*="matchGrid"]')
  await expect(grid.locator('img')).toHaveCount(0)
  await expect(grid.locator('button[draggable="true"]')).toHaveCount(3)
  await expect(grid.locator('button:not([draggable]) svg')).toHaveCount(0)
  for(const handle of await grid.locator('button[draggable="true"] > svg').all())await expect(handle).toBeVisible()
  const target=page.getByRole('button',{name:'Ready when work begins',exact:true})
  if(width===1280)await source.dragTo(target)
  else {await source.tap();await target.tap()}
  await page.getByRole('button',{name:'Diligence',exact:true}).tap()
  await page.getByRole('button',{name:'Careful and continued effort',exact:true}).tap()
  await page.getByRole('button',{name:'Repeatedly ignoring instructions',exact:true}).tap()
  await page.getByRole('button',{name:'May interfere with safe completion',exact:true}).tap()
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`../.runtime/text-matching-${width}.png`,fullPage:true})
 })
 test(`team sorting supports tap selection and rejects wrong grouping at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  const screen=definition.replacements['3'];await fixture(page,screen)
  await page.goto('/student/class/1/lesson/1/practice')
  const zones=page.getByLabel('Drop zones',{exact:true})
  const sort=async(wrong)=>{
   for(const item of screen.configuration.items) {
    const card=page.getByRole('button',{name:new RegExp(item.label)})
    await card.tap()
    const category=wrong?'helps':screen.configuration.sort_answers[item.id]
    const target=zones.getByRole('button',{name:new RegExp(category==='helps'?'^Helps the team':'^Needs a different response')})
    if(!wrong && width===1280)await card.dragTo(target)
    else await target.tap()
   }
  }
  await sort(true)
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Try again',exact:true}).click()
  await sort(false)
  await expect(page.getByText(screen.configuration.correct_feedback,{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`../.runtime/team-sorting-${width}.png`,fullPage:true})
 })
 test(`mistake sequencing checks order and can reset at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844})
  const screen=definition.replacements['4'];await fixture(page,screen)
  await page.goto('/student/class/1/lesson/1/practice')
  await expect(page.getByText(screen.configuration.question,{exact:true})).toBeVisible()
  const select=async(ids)=>{for(const id of ids)await page.getByRole('button',{name:screen.configuration.items.find(i=>i.id===id).label,exact:false}).tap()}
  await select(['correct','tell','ask'])
  await page.getByRole('button',{name:'Check order',exact:true}).click()
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeDisabled()
  await expect(page.getByText(screen.configuration.retry_feedback,{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Reset',exact:true}).click()
  if(width===1280) {
   await select(['ask','tell','correct'])
   await page.getByRole('button',{name:'Return Tell the person in charge what happened. to options',exact:true}).dragTo(page.getByRole('button',{name:'Return Ask which labels belong on the boxes. to options',exact:true}))
  } else await select(['tell','ask','correct'])
  await page.getByRole('button',{name:'Check order',exact:true}).click()
  await expect(page.getByText(screen.configuration.correct_feedback,{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`../.runtime/mistake-sequence-${width}.png`,fullPage:true})
 })
}

test('sorting and sequencing can be completed with keyboard controls',async({page})=>{
 const activate=async(button)=>{await button.focus();await page.keyboard.press('Enter')}
 for(const position of ['3','4']) {
  const screen=definition.replacements[position]
  await fixture(page,screen)
  await page.goto('/student/class/1/lesson/1/practice')
  if(position==='3') {
   for(const item of screen.configuration.items) {
    await activate(page.getByRole('button',{name:new RegExp(item.label)}))
    const label=screen.configuration.categories.find(c=>c.id===screen.configuration.sort_answers[item.id]).label
    await activate(page.getByLabel('Drop zones',{exact:true}).getByRole('button',{name:new RegExp('^'+label)}))
   }
  } else {
   for(const id of screen.configuration.correct_order)await activate(page.getByRole('button',{name:screen.configuration.items.find(i=>i.id===id).label,exact:false}))
   await activate(page.getByRole('button',{name:'Check order',exact:true}))
  }
  await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeEnabled()
  await page.unroute('**/api/**')
 }
})
