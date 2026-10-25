import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
interface Observation {id:number;teacher:string|null;at:string;outcome:string;note:string;source:string}
interface Payload {lessons:{id:number;title:string}[];observations:Observation[]}
const labels:Record<string,string>={observed:'Observed basic movements',adapted_observed:'Observed with an adaptation',not_yet:'Not yet observed / needs further support',declined:'Learner chose not to perform'}
export default function MovementObservation({classId,studentId}:{classId:string;studentId:string}) {
 const [data,setData]=useState<Payload|null>(null),[lesson,setLesson]=useState(''),[outcome,setOutcome]=useState('not_yet'),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[attempt,setAttempt]=useState(0)
 const endpoint=`/classes/${classId}/students/${studentId}/movement-observations/`
 useEffect(()=>{let active=true;void api<Payload>(endpoint,{cache:'no-store'}).then(value=>{if(active){setData(value);setLesson(String(value.lessons[0]?.id??''));setError('')}}).catch((e:Error)=>{if(active)setError(e.message)});return()=>{active=false}},[endpoint,attempt])
 async function save(){if(busy||!confirmed||!lesson)return;setBusy(true);setError('');setMessage('');try{const result=await api<Payload>(endpoint,{method:'POST',body:JSON.stringify({lesson_id:Number(lesson),outcome,note,confirmed})});setData(result);setMessage('Teacher observation saved. This is separate from digital sequencing.');setConfirmed(false)}catch(reason){setError(reason instanceof Error?reason.message:'Observation could not be saved.')}finally{setBusy(false)}}
 return <section aria-label="Teacher-observed movement performance" style={{background:'var(--color-white)',padding:24,borderRadius:16,display:'grid',gap:12,marginTop:24}}><h2>Movement performance observation</h2><p>Competency TPEP-dc-NG-4: Perform basic dance steps /movements. Record what you directly observed. Completing the website sequence is not proof of physical performance.</p>
  {error&&<p role="alert">{error} <button onClick={()=>setAttempt(a=>a+1)}>Retry observations</button></p>}
  {!data&&!error&&<p role="status">Loading observations...</p>}
  {data&&!data.lessons.length&&<p>The revised movement lesson is not available in this class yet.</p>}
  {!!data?.lessons.length&&<><label>Movement lesson<select value={lesson} disabled={busy} onChange={e=>setLesson(e.target.value)}>{data.lessons.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label><label>Observation outcome<select value={outcome} disabled={busy} onChange={e=>setOutcome(e.target.value)}>{Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Observation notes (optional, 500 characters)<textarea value={note} maxLength={500} disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="For example: observed a seated, adapted movement sequence with guidance."/></label><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/> I directly observed this participation or the learner's decision; this is not inferred from a digital score.</label><button disabled={!confirmed||busy} onClick={()=>void save()}>{busy?'Saving observation...':'Save teacher observation'}</button></>}
  {message&&<p role="status">{message}</p>}
  {data?.observations.map(o=><article key={o.id}><strong>{labels[o.outcome]??o.outcome}</strong><p>{o.teacher??'Teacher account unavailable'} / <time dateTime={o.at}>{new Date(o.at).toLocaleString()}</time></p>{o.note&&<p>{o.note}</p>}<small>Source: direct teacher observation</small></article>)}
 </section>
}
