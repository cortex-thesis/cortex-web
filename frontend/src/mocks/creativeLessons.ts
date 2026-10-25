// The developer preview reads the same definitions that the versioned publisher uses.
import definitions from '../../../web/creative_lessons.json'
import type { Task } from '../types'
function camel(value:unknown):unknown {
 if(Array.isArray(value))return value.map(camel)
 if(!value||typeof value!=='object')return value
 return Object.fromEntries(Object.entries(value).map(([key,item])=>[key.replace(/_([a-z])/g,(_,c:string)=>c.toUpperCase()),key==='sort_answers'?item:camel(item)]))
}
const lessons=definitions.map(lesson=>({id:lesson.lesson_id,title:lesson.title,tasks:lesson.slides.map((slide,index)=>({question:'',choices:[],answer:'',imageUrl:null,...camel(slide.configuration) as Partial<Task>,id:`${lesson.lesson_id}/${index}`,index:index+1,total:lesson.slides.length,title:slide.title,package:lesson.package as Task['package'],contentType:slide.type as Task['contentType']}))}))
export const creativeCareerLessons=lessons.filter(l=>l.id.startsWith('CAREER-'))
export const creativeEnrichmentLessons=lessons.filter(l=>l.id.startsWith('ENRICH-'))
