import { test, expect } from '@playwright/test'

for(const width of [320,390,768,980,1120,1440]) {
 test(`dashboard cards fit and stack at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:720})
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname
   let body={}
   if(path==='/api/auth/me/')body={id:'responsive-student',name:'Alexandra Student',role:'student'}
   if(path==='/api/notifications/')body={notifications:[],unread_count:0}
   if(path==='/api/class-sessions/')body={sessions:[]}
   if(path==='/api/student/dashboard/')body={student:{student_number:'TEST-123'},classes:[{id:1,name:'Section A',teacher_name:'Teacher',student_count:12},{id:2,name:'Section B with a longer class name',teacher_name:'Teacher',student_count:12}],unread_notifications:0,active_session:null}
   if(path==='/api/student/sessions/')body={sessions:[],summary:{completed_sessions:57,total_duration_seconds:831240,average_focus_score:75}}
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)})
  })
  await page.goto('/student/home')
  await expect(page.getByText('Completed sessions',{exact:true})).toBeVisible()
  await expect(page.getByText('Section A',{exact:true})).toBeVisible()
  const cards=page.locator('[class*="homeGrid"] button')
  if(width>1000){
   expect(await page.locator('div[class*="right"]').evaluate(el=>getComputedStyle(el).width)).toBe('320px')
   expect(await page.locator('[class*="qaGrid"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2)
   expect(await page.locator('[class*="startLearningCard"]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3)
   await page.screenshot({path:`../.runtime/home-desktop-restored-${width}.png`,fullPage:true})
   return
  }
  const boxes=await cards.evaluateAll(items=>items.map(item=>{
   const r=item.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}
  }))
  for(const box of boxes){expect(box.x).toBeGreaterThanOrEqual(15);expect(box.right).toBeLessThanOrEqual(width-15)}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j]
   expect(a.right<=b.x+1||b.right<=a.x+1||a.bottom<=b.y+1||b.bottom<=a.y+1).toBe(true)
  }
  if(width<=1000){
   const stats=await page.locator('[class*="progressCard"]').boundingBox()
   const actions=await page.locator('[class*="qaGrid"]').boundingBox()
   expect(actions.y-stats.y-stats.height).toBeGreaterThanOrEqual(0)
   expect(actions.y-stats.y-stats.height).toBeLessThanOrEqual(24)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.getByRole('button',{name:/Learning journal/}).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button',{name:/Learning journal/})).toBeInViewport()
  await page.screenshot({path:`../.runtime/home-responsive-${width}.png`,fullPage:true})
 })
}
