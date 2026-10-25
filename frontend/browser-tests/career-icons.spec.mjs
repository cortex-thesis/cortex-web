import { test, expect } from '@playwright/test'
const screen={title:'One Skill, Multiple Possibilities',type:'interactive',configuration:{task_template:'picture_choice',selection_mode:'multiple',question:'Where could computer skills be useful?',items:[
 {id:'ict',label:'ICT support',image_url:'/assets/career/technical-support.png'},
 {id:'printing',label:'Printing or computer service',image_url:'/assets/career/printing-service.png'},
],correct_item_ids:['ict','printing']}}
for(const width of [390,1280])test(`Career supplied icons load at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname
  let body={}
  if(path==='/api/auth/me/')body={id:'icons',name:'Test learner',role:'student'}
  if(path==='/api/notifications/')body={notifications:[],unread_count:0}
  if(path==='/api/class-sessions/')body={sessions:[]}
  if(path==='/api/student/classes/1/lessons/1/')body={id:1,title:'My Skills and Possible Jobs',package:'career',slides:[{id:100,title:screen.title,activity:{type:screen.type,configuration:screen.configuration}}],progress:{completed_slide_ids:[],activity_evidence:{}}}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
 })
 await page.goto('/student/class/1/lesson/1/practice')
 for(const [label,icon] of [['ICT support','technical-support'],['Printing or computer service','printing-service']]){
  const card=page.getByRole('button',{name:new RegExp(label)})
  await expect(card).toBeVisible()
  await expect(card.locator('img')).toHaveAttribute('src',`/assets/career/${icon}.png`)
  await expect.poll(()=>card.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`../.runtime/career-icons-${width}.png`,fullPage:true})
})
