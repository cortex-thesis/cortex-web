import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
const source=await readFile(new URL('../src/components/molecules/CreativeExperience/logic.ts',import.meta.url),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {beatEvents,restoredDraft,checkpoint,toggleSelection}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('beat scheduling follows learner grid and tempo, with simultaneous notes and silent steps',()=>{
 const events=beatEvents([[true,false,true,false],[true,true,false,false]],60)
 assert.deepEqual(events,[{at:0,step:0,notes:[220,440]},{at:1000,step:1,notes:[440]},{at:2000,step:2,notes:[220]},{at:3000,step:3,notes:[]}])
 assert.equal(beatEvents([[false,false,false,false],[false,false,false,false]],100)[3].at,1800)
})
test('creative drafts are scoped and invalidated by activity configuration/version changes',()=>{
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}
 const task={contentVersion:'v1',checkpointKey:'user/class/lesson/slide',experience:{mode:'beat'}}
 const value={version:'v1',grid:[[true,false,false,false],[false,true,false,false]],tempo:80}
 checkpoint(task,value);assert.deepEqual(restoredDraft(task),value)
 assert.deepEqual(restoredDraft({...task,checkpointKey:'another-user/class/lesson/slide'}),{version:'v1'})
 assert.deepEqual(restoredDraft({...task,contentVersion:'v2'}),{version:'v2'})
 assert.deepEqual(restoredDraft({...task,experience:{mode:'art'}}),{version:'v1'})
 delete globalThis.sessionStorage
})
test('tampered drafts do not crash the creative workspace and selection can be reversed',()=>{
 globalThis.sessionStorage={getItem:()=>null}
 const task={contentVersion:'v1',experience:{mode:'beat'},initialResponse:JSON.stringify({version:'v1',grid:['invalid']})}
 assert.deepEqual(restoredDraft(task),{version:'v1'})
 assert.deepEqual(toggleSelection(toggleSelection([],'garden'),'garden'),[])
 delete globalThis.sessionStorage
})

test('Move to the Beat uses the verified seated video in its existing optional video slot', async () => {
 const definitions=JSON.parse(await readFile(new URL('../../web/creative_lessons.json',import.meta.url),'utf8'))
 const lesson=definitions.find(item=>item.lesson_id==='ENRICH-03')
 assert.equal(lesson.slides.length,8)
 const slide=lesson.slides[6]
 assert.equal(slide.title,'Movement Video Demonstration')
 assert.equal(slide.type,'video')
 assert.equal(slide.configuration.screen_key,'e3-video')
 assert.equal(slide.configuration.template,'instructional_video')
 assert.equal(slide.configuration.media_url,'https://www.youtube.com/watch?v=hrbGVGcXB5Q')
 assert.equal(slide.configuration.video_optional,true)
 assert.equal(slide.configuration.duration_seconds,139)
 assert.equal(lesson.slides[7].title,'My Movement Performance')
})

test('published Move to the Beat keeps its video between the introduction and closing', async () => {
 const definitions=JSON.parse(await readFile(new URL('../../web/enrichment_lessons.json',import.meta.url),'utf8'))
 const lesson=definitions.find(item=>item.lesson_id==='ENRICH-03')
 assert.equal(lesson.slides.length,10)
 const slide=lesson.slides[8]
 assert.equal(slide.title,'Move to the Beat: Follow Along')
 assert.equal(slide.type,'video')
 assert.equal(slide.configuration.media_url,'https://www.youtube.com/watch?v=hrbGVGcXB5Q')
 assert.equal(slide.configuration.duration_seconds,139)
 assert.equal(slide.configuration.video_optional,true)
 assert.equal(lesson.slides[7].title,'Choose Your Next Practice')
 assert.equal(lesson.slides[5].configuration.task_template,'sequence_order')
 const preview=await readFile(new URL('../src/mocks/enrichmentLessons.ts',import.meta.url),'utf8')
 assert.match(preview, /base\('enrich03-complete', 8, 8, 'Move to the Beat: Follow Along'\).*mediaUrl: 'https:\/\/www.youtube.com\/watch\?v=hrbGVGcXB5Q'/)
})
