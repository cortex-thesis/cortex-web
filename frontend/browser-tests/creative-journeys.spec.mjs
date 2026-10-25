import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
const lessons=JSON.parse(await readFile(new URL('../../web/creative_lessons.json',import.meta.url),'utf8'))
async function fixture(page,lessonId,keys) {
 const definition=lessons.find(l=>l.lesson_id===lessonId)
 const slides=definition.slides.filter(s=>keys.includes(s.configuration.screen_key)).map((s,index)=>({id:100+index,title:s.title,activity:{type:s.type,configuration:s.configuration}}))
 const saved=new Map(),history=[]
 await page.route('**/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname
  let value={}
  if(path==='/api/auth/me/')value={id:'creative-learner',name:'Creative Learner',role:'student',pseudonym:'creative'}
  else if(path==='/api/notifications/')value={notifications:[],unread_count:0}
  else if(path==='/api/class-sessions/')value={sessions:[]}
  else if(path==='/api/sync/status/')value={enabled:false}
  else if(path==='/api/student/preferences/')value={sound_enabled:false}
  else if(path==='/api/sessions/start/')value={id:'creative-session'}
  else if(path==='/api/sessions/creative-session/eeg/')value={lesson:{id:2,title:definition.title,package:definition.package,slides},activity_evidence:{},latest:null}
  else if(path==='/api/sessions/creative-session/control/')value={control_mode:'free',status:'active',presentation_mode:'focus',ended_at:null}
  else if(path==='/api/student/classes/1/lessons/2/'){
   const body=request.method()==='POST'?request.postDataJSON():{}
   if(body.slide_id&&body.selected){saved.set(body.slide_id,body.selected);history.push(body)}
   value={id:2,title:definition.title,package:definition.package,slides,progress:{completed_slide_ids:[],activity_evidence:Object.fromEntries([...saved].map(([id,selected])=>[id,{selected}]))}}
  }else if(path==='/api/classes/1/creative-collection/')value={entries:[...saved].map(([id,selected])=>{const s=slides.find(s=>s.id===id);return {key:String(id),title:s.title,mode:s.activity.configuration.experience?.mode,selected,items:s.activity.configuration.experience?.items??[],categories:s.activity.configuration.experience?.categories??[],stations:s.activity.configuration.experience?.stations??[]}})}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 })
 await page.goto('/student/class/1/lesson/2/practice')
 await expect(page.getByRole('heading',{name:slides[0].title,exact:true})).toBeVisible()
 return {saved,history,slides}
}

test('Career Town exposes actual stations and work actions alter scene objects',async({page})=>{
 const {history}=await fixture(page,'CAREER-02',['c2-town','c2-work'])
 await page.getByRole('button',{name:'Garden worker Explore',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Garden worker',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await page.getByRole('button',{name:'Paintbrush',exact:true}).click()
 await page.getByRole('button',{name:'Water the plant',exact:true}).click()
 await expect(page.locator('[data-scene-state=scattered]:visible')).toBeVisible()
 await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Watering can',exact:true}).click()
 await page.getByRole('button',{name:'Water the plant',exact:true}).click()
 await expect(page.locator('[data-scene-state=ready]:visible')).toBeVisible()
 await page.getByRole('button',{name:'Finish lesson',exact:true}).click()
 expect(JSON.parse(history.at(-1).selected)).toMatchObject({station:'garden',tool:'Watering can',applied:true})
})

test('workplace story changes scenes and persists the repair branch',async({page})=>{
 const {history}=await fixture(page,'CAREER-03',['c3-help'])
 await page.getByRole('button',{name:'Laugh at the coworker',exact:true}).click()
 await expect(page.locator('[data-scene-state=upset]')).toBeVisible()
 await expect(page.getByRole('button',{name:'Finish lesson',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Apologize and offer help',exact:true}).click()
 await expect(page.locator('[data-scene-state=ready]:visible')).toBeVisible()
 await page.getByRole('button',{name:'Finish lesson',exact:true}).click()
 expect(JSON.parse(history[0].selected).path).toEqual([{scene:'start',choice:'laugh'},{scene:'upset',choice:'repair'}])
})

test('strength reflection supports deselection, overlapping choices and uncertainty without correctness labels',async({page})=>{
 await fixture(page,'CAREER-01',['c1-board'])
 const help=page.getByRole('button',{name:'Helping others',exact:true})
 await help.click();await help.click();await expect(help).toHaveAttribute('aria-pressed','false')
 await page.getByRole('button',{name:/^I enjoy/}).click();await help.click()
 for(const label of ['I can with support','I am practising','I want to learn']){await page.getByRole('button',{name:new RegExp('^'+label)}).click();await page.getByRole('button',{name:'Not sure yet',exact:true}).click()}
 await page.getByRole('button',{name:'Use my reflection',exact:true}).click()
 await expect(page.getByText('Ready to save. Use Next activity to confirm your progress.')).toBeVisible()
 await expect(page.getByText('Correct.',{exact:true})).toHaveCount(0)
})

for(const width of [360,768,1280])test(`editable art supports keyboard controls, draft refresh and showcase at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await fixture(page,'ENRICH-01',['e1-create','e1-showcase'])
 await page.getByRole('button',{name:'Add shape',exact:true}).focus();await page.keyboard.press('Enter')
 await page.getByRole('button',{name:'Use colour 2',exact:true}).click()
 await page.getByLabel('Column',{exact:true}).selectOption({value:'4'});await page.getByLabel('Row',{exact:true}).selectOption({value:'2'})
 await expect(page.locator('svg [role=button]')).toHaveAttribute('transform','translate(450,250)')
 await page.reload();await expect(page.locator('svg [role=button]')).toHaveAttribute('transform','translate(450,250)')
 await page.getByRole('button',{name:'Use my picture',exact:true}).click();await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Talent Creation Corner',exact:true})).toBeVisible()
 await expect(page.getByRole('img',{name:'Your visual composition'})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('Beat Composer schedules the selected real electronic tones and cancels playback on teacher pause',async({page})=>{
 await page.addInitScript(()=>{
  const Native=window.AudioContext;window.__creativeAudio={starts:[],closed:0}
  window.AudioContext=class extends Native {
   createOscillator(){const osc=super.createOscillator(),start=osc.start.bind(osc);osc.start=(at)=>{window.__creativeAudio.starts.push({frequency:osc.frequency.value,at});return start(at)};return osc}
   close(){window.__creativeAudio.closed++;return super.close()}
  }
 })
 const {history}=await fixture(page,'ENRICH-02',['e2-compose','e2-showcase'])
 await page.getByRole('button',{name:'Low tone step 1',exact:true}).click();await page.getByRole('button',{name:'High tone step 2',exact:true}).click();await page.getByRole('button',{name:'Low tone step 3',exact:true}).click()
 expect(await page.evaluate(()=>window.__creativeAudio.starts.length)).toBe(0)
 await page.getByRole('button',{name:'Sound off - enable sound',exact:true}).click()
 await page.getByRole('button',{name:'Play my beat',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.__creativeAudio.starts.length)).toBe(3)
 expect((await page.evaluate(()=>window.__creativeAudio.starts)).map(x=>x.frequency)).toEqual([220,440,220])
 await page.evaluate(()=>window.dispatchEvent(new Event('cortex:pause-media')))
 await expect.poll(()=>page.evaluate(()=>window.__creativeAudio.closed)).toBe(1)
 await page.getByRole('button',{name:'Use my beat',exact:true}).click()
 await page.getByRole('button',{name:'Play my beat',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.__creativeAudio.starts.length)).toBe(6)
 await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.__creativeAudio.closed)).toBe(2)
 await expect(page.getByText(/Your saved four-step composition/)).toBeVisible()
 expect(JSON.parse(history[0].selected).grid).toEqual([[true,false,true,false],[false,true,false,false]])
 await page.getByRole('button',{name:'Enable electronic-tone playback',exact:true}).click()
 await page.getByRole('button',{name:'Replay saved beat',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>window.__creativeAudio.starts.length)).toBe(9)
 expect((await page.evaluate(()=>window.__creativeAudio.starts)).slice(-3).map(x=>x.frequency)).toEqual([220,440,220])
 await page.getByRole('button',{name:'Stop replay',exact:true}).click()
 await page.getByRole('button',{name:'Previous',exact:true}).click()
 await expect(page.getByRole('button',{name:'Low tone step 1',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('button',{name:'High tone step 2',exact:true})).toHaveAttribute('aria-pressed','true')
})

test('movement sequence replays selected cues while participation remains explicitly self-reported',async({page})=>{
 const {history}=await fixture(page,'ENRICH-03',['e3-sequence','e3-showcase'])
 for(const label of ['Tap','Clap','Pause'])await page.getByRole('button',{name:label,exact:true}).click()
 await page.getByLabel('Participation route',{exact:true}).selectOption('point')
 await page.getByRole('button',{name:'Play movement sequence',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Cue 1: Tap',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Stop playback',exact:true}).click()
 await page.getByRole('button',{name:'Use my sequence',exact:true}).click();await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect(page.getByText(/Physical performance is not detected by this website/)).toBeVisible()
 expect(JSON.parse(history[0].selected)).toMatchObject({order:['tap','clap','pause'],route:'point'})
})

test('missing instrument recordings and video remain explicit, with no pretend playback',async({page})=>{
 await fixture(page,'ENRICH-02',['e2-sound','e2-video'])
 await page.getByRole('button',{name:'Drum',exact:true}).click()
 await expect(page.getByText(/Recorded instrument sample awaiting approval/)).toBeVisible()
 await expect(page.locator('[data-experience=sound] audio')).toHaveCount(0)
 await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect(page.getByRole('button',{name:'Continue without video',exact:true}).first()).toBeVisible()
 await expect(page.locator('iframe')).toHaveCount(0)
})

test('creative controls pass scoped accessibility checks with reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 test.setTimeout(60000)
 for(const [lesson,key] of [['CAREER-01','c1-board'],['CAREER-02','c2-town'],['CAREER-03','c3-help'],['ENRICH-01','e1-create'],['ENRICH-02','e2-compose'],['ENRICH-03','e3-sequence']]) {
  await fixture(page,lesson,[key])
  if(key==='e1-create')await page.getByRole('button',{name:'Add shape',exact:true}).click()
  const result=await new AxeBuilder({page}).include('[data-experience]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
  expect(result.violations,`${lesson} accessibility`).toEqual([])
 }
})

for(const definition of lessons)test(`${definition.lesson_id} completes its entire Practice journey with honest evidence`,async({page})=>{
 test.setTimeout(60000)
 const {history}=await fixture(page,definition.lesson_id,definition.slides.map(s=>s.configuration.screen_key))
 for(let index=0;index<definition.slides.length;index++){
  const slide=definition.slides[index],c=slide.configuration,ex=c.experience
  await expect(page.getByRole('heading',{name:slide.title,exact:true})).toBeVisible()
  if(slide.type==='video'){await page.getByRole('button',{name:'Continue without video',exact:true}).first().click();continue}
  const region=page.locator('[data-experience]:visible')
  if(c.task_template==='audio_sequence'){
   for(const round of c.rounds){await page.getByRole('button',{name:'Show a visual prompt',exact:true}).click();for(const id of round.correct_order)await page.getByRole('button',{name:c.items.find(i=>i.id===id).label,exact:true}).click()}
  }else switch(ex.mode){
   case 'intro':await region.getByRole('button',{name:'Start exploring',exact:true}).click();break
   case 'gallery':case 'map':case 'wheel':{const card=(ex.mode==='map'?ex.stations:ex.items)[0];await region.getByRole('button',{name:card.label+' Explore',exact:true}).click();break}
   case 'collection':for(const category of ex.categories){await region.getByRole('button',{name:new RegExp('^'+category.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();await region.getByRole('button',{name:'Not sure yet',exact:true}).click()}await region.getByRole('button',{name:'Use my reflection',exact:true}).click();break
   case 'connect':for(const item of ex.items){await region.getByRole('button',{name:new RegExp('^'+item.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();for(const id of ex.links[item.id])await region.getByRole('button',{name:ex.stations.find(s=>s.id===id).label,exact:true}).click()}await region.getByRole('button',{name:'Check connections',exact:true}).click();break
   case 'work':await region.getByRole('button',{name:ex.stations[0].tool,exact:true}).click();await region.getByRole('button',{name:ex.stations[0].action,exact:true}).click();break
   case 'story':{let scene=ex.scenes.find(s=>s.id===ex.start);while(scene.choices.length){const choice=scene.choices[0];await region.getByRole('button',{name:choice.label,exact:true}).click();scene=ex.scenes.find(s=>s.id===choice.next)}break}
   case 'order':for(const id of ex.order)await region.getByRole('button',{name:ex.items.find(i=>i.id===id).label,exact:true}).click();await region.getByRole('button',{name:'Check sequence',exact:true}).click();break
   case 'art':await region.getByRole('button',{name:'Add shape',exact:true}).click();await region.getByRole('button',{name:'Use my picture',exact:true}).click();break
   case 'sound':await region.getByRole('button',{name:ex.items[0].label,exact:true}).click();break
   case 'beat':await region.getByRole('button',{name:'Low tone step 1',exact:true}).click();await region.getByRole('button',{name:'Use my beat',exact:true}).click();break
   case 'compare':await region.getByRole('button',{name:'soft',exact:true}).click();await region.getByRole('button',{name:'slow',exact:true}).click();break
   case 'movement':if(!ex.preset)for(const item of ex.items.slice(0,3))await region.getByRole('button',{name:item.label,exact:true}).click();await region.getByRole('button',{name:'Use my sequence',exact:true}).click();break
   case 'participation':await region.getByRole('button',{name:ex.items[0].label,exact:true}).click();break
   case 'showcase':await region.getByRole('button',{name:'Finish my showcase',exact:true}).click();break
   default:throw new Error('Uncovered creative activity '+ex.mode)
  }
  await page.getByRole('button',{name:index===definition.slides.length-1?'Finish lesson':'Next activity',exact:true}).click()
 }
 await expect(page.getByRole('heading',{name:'Practice complete',exact:true})).toBeVisible()
 expect(history.length).toBe(definition.slides.length)
 expect(history.filter(h=>h.selected==='continued_without_video')).toHaveLength(1)
})

test('assigned teacher records movement separately from digital answers',async({page})=>{
 let observations=[]
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;let value={}
  if(path==='/api/auth/me/')value={id:'teacher',name:'Demo Teacher',role:'teacher'}
  else if(path==='/api/notifications/')value={notifications:[],unread_count:0}
  else if(path==='/api/sync/status/')value={enabled:false}
  else if(path==='/api/class-sessions/')value={sessions:[]}
  else if(path==='/api/teacher/students/5/')value={id:5,name:'Learner',student_number:'5',classes:[{id:1,name:'Demo Class'}],sessions:[],session_count:0,journal_count:0,average_focus:null,average_duration_seconds:null,tasks_completed:0,tasks_total:0,state_distribution:null}
  else if(path==='/api/classes/1/students/5/movement-observations/'){
   if(route.request().method()==='POST'){const data=route.request().postDataJSON();expect(data.confirmed).toBe(true);observations=[{id:1,teacher:'Demo Teacher',at:'2026-10-25T08:00:00Z',...data,source:'teacher_direct_observation'}]}
   value={lessons:[{id:42,title:'Move to the Beat'}],observations}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
 })
 await page.goto('/teacher/class/1/student/5')
 await expect(page.getByRole('heading',{name:'Movement performance observation',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Save teacher observation',exact:true})).toBeDisabled()
 await page.getByRole('combobox',{name:/^Observation outcome/}).selectOption('adapted_observed')
 await page.getByRole('textbox',{name:/^Observation notes/}).fill('Observed a comfortable seated hand sequence with guidance.')
 await page.getByRole('checkbox',{name:/I directly observed/}).check()
 await page.getByRole('button',{name:'Save teacher observation',exact:true}).click()
 await expect(page.getByText('Teacher observation saved. This is separate from digital sequencing.')).toBeVisible()
 await expect(page.locator('article strong').filter({hasText:'Observed with an adaptation'})).toBeVisible()
})


test('creative draft survives the existing EEG regulation flow without a physical device or fabricated samples',async({page})=>{
 test.setTimeout(60000)
 await fixture(page,'ENRICH-02',['e2-compose'])
 const fabricated=[]
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/sessions/creative-session/eeg/')fabricated.push(r)})
 await page.goto('/student/class/1/lesson/2')
 await page.getByRole('button',{name:/^EEG Session/}).click()
 await page.getByRole('button',{name:'Continue to EEG session',exact:true}).click()
 await page.getByRole('button',{name:'Development: test without a headset',exact:true}).click()
 await page.getByRole('button',{name:'Start session',exact:true}).click()
 await expect(page.getByRole('heading',{name:'My Beat Composer',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Low tone step 1',exact:true}).click()
 await page.getByText('Development controls',{exact:true}).click()
 await page.getByRole('slider',{name:/Focus score/}).focus();await page.keyboard.press('Home')
 await expect(page.getByRole('button',{name:'Take a 15-second breathing break',exact:true})).toBeVisible()
 await page.clock.install()
 await page.getByRole('button',{name:'Take a 15-second breathing break',exact:true}).click()
 await page.clock.runFor(1000)
 await expect(page.getByRole('region',{name:'Calm pause',exact:true})).toBeVisible()
 // Advance one tick at a time so React can commit each regulation timer's update.
 await expect.poll(async()=>{await page.clock.runFor(1000);return page.getByRole('heading',{name:'Ready to continue?',exact:true}).count()},{timeout:15000,intervals:[50,100,200]}).toBe(1)
 await page.getByRole('button',{name:'Continue',exact:true}).click()
 await expect.poll(async()=>{await page.clock.runFor(1000);return page.getByRole('button',{name:'Low tone step 1',exact:true}).count()},{timeout:10000,intervals:[50,100,200]}).toBe(1)
 await expect(page.getByRole('button',{name:'Low tone step 1',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(fabricated).toHaveLength(0)
})


test('failed creative save retains the composition and retries without premature completion',async({page})=>{
 await fixture(page,'ENRICH-02',['e2-compose','e2-showcase'])
 let failed=false
 await page.route('**/api/student/classes/1/lessons/2/',async route=>{
  const body=route.request().method()==='POST'?route.request().postDataJSON():{}
  if(body.slide_id&&!failed){failed=true;await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({detail:'Progress save failed.'})});return}
  await route.fallback()
 })
 await page.getByRole('button',{name:'Low tone step 1',exact:true}).click()
 await page.getByRole('button',{name:'Use my beat',exact:true}).click()
 await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Progress save failed.')
 await expect(page.getByRole('button',{name:'Low tone step 1',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Next activity',exact:true}).click()
 await expect(page.getByText(/Your saved four-step composition/)).toBeVisible()
})
