import MovementStatus from './MovementStatus'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import type { ObjectCard, WorkspaceProps, Draft } from './types'
import { ArtPreview, MovementFigure } from './StudioWorkspace'
import { useCreativePlayback } from './useCreativePlayback'
import { beatEvents, toggleSelection } from './logic'
import styles from './CreativeExperience.module.css'
interface Entry {key:string;title:string;mode:string;selected:string;items:ObjectCard[];categories:ObjectCard[];stations:ObjectCard[]}
export default function Showcase(props:WorkspaceProps) {
 const {task,value,update,complete,quiet}=props,items=task.experience?.items??[]
 const [entries,setEntries]=useState<Entry[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0)
 const playback=useCreativePlayback(quiet)
 useEffect(()=>{
  if(!task.classId){queueMicrotask(()=>{setLoading(false);setError('Saved collection needs a class context. Your current activity remains available.')});return}
  let disposed=false
  void api<{entries:Entry[]}>(`/classes/${task.classId}/creative-collection/?package=${task.package}`,{cache:'no-store'})
   .then(data=>{if(!disposed){setEntries(data.entries);setLoading(false);setError('')}})
   .catch((reason:Error)=>{if(!disposed){setError(reason.message);setLoading(false)}})
  return()=>{disposed=true}
 },[task.classId,task.package,attempt])
 const labels=(entry:Entry,ids:string[])=>ids.map(id=>entry.items.find(i=>i.id===id)?.label??entry.stations.find(i=>i.id===id)?.label??(id==='unsure'?'Not sure yet':id==='decline'?'Prefer not to choose':id)).join(', ')
 return <div className={styles.showcase}>
  {loading&&<p role="status">Loading your saved discoveries...</p>}{error&&<p role="alert">{error} <button onClick={()=>setAttempt(a=>a+1)}>Retry collection</button></p>}
  {!loading&&!error&&!entries.length&&<p>No saved discoveries yet. Return to an earlier activity, complete it and use Next activity to save.</p>}
  {entries.filter(e=>['collection','art','beat','movement','map','work','participation'].includes(e.mode)).map(entry=>{
   let saved:Draft;try{saved=JSON.parse(entry.selected)}catch{return null}
   return <article key={entry.key} className={styles.exhibit}><h3>{entry.title}</h3>
    {entry.mode==='art'&&<ArtPreview objects={saved.objects} background={saved.background}/>}
    {entry.mode==='beat'&&saved.grid&&<><p>Your saved four-step composition: {saved.grid.map((row,i)=>`${i===0?'Low':'High'} tone on steps ${row.flatMap((on,j)=>on?[j+1]:[]).join(', ')||'none'}`).join('; ')}.</p><button aria-pressed={!playback.muted} disabled={quiet} onClick={()=>playback.setMuted(!playback.muted)}>{playback.muted?'Enable electronic-tone playback':'Mute electronic tones'}</button><button onClick={()=>void playback.play(beatEvents(saved.grid!,saved.tempo??80),4*60000/(saved.tempo??80)+250)}>Replay saved beat</button><button onClick={playback.stop}>Stop replay</button><p role="status">{playback.playing?`Playing step ${playback.step+1}`:''}</p></>}
    {entry.mode==='movement'&&saved.order&&<><p>{labels(entry,saved.order)}. Participation route: {saved.route}.</p><MovementFigure move={saved.order[Math.max(0,playback.step)]}/><button onClick={()=>void playback.play(saved.order!.map((_,step)=>({at:step*1400,step,notes:[]})),saved.order!.length*1400)}>Replay saved movement sequence</button><button onClick={playback.stop}>Stop replay</button></>}
    {saved.selections&&Object.entries(saved.selections).map(([area,picks])=><p key={area}>{entry.categories.find(c=>c.id===area)?.label??area}: {labels(entry,picks)}</p>)}
    {saved.visited&&<p>Explored: {labels(entry,saved.visited)}. Exploration is not an ability score.</p>}
    {saved.station&&<p>Practiced at {entry.stations.find(s=>s.id===saved.station)?.label??saved.station}. This is digital work practice.</p>}
    {saved.route&&entry.mode==='participation'&&<p>Self-selected participation route: {labels(entry,[saved.route])}.</p>}
    <small>Saved learner evidence, not an automatically verified talent.</small>
   </article>
  })}
  {!!items.length&&<div className={styles.destinations} role="group" aria-label="My reflection">{items.map(i=><button key={i.id} aria-pressed={value.reflection?.includes(i.id)??false} onClick={()=>update({reflection:toggleSelection(value.reflection??[],i.id)})}>{i.label}</button>)}</div>}
  {task.experience?.performance&&<MovementStatus classId={task.classId}/>}
  {task.experience?.performance&&<p>Physical performance is not detected by this website. Ask your teacher to record a direct observation from your student learning profile. Pointing, observing and stopping are valid participation choices, but are not automatically recorded as performing dance movements.</p>}
  <button onClick={()=>complete({reviewed:true,reflection:value.reflection??[]})}>Finish my showcase</button>
 </div>
}
