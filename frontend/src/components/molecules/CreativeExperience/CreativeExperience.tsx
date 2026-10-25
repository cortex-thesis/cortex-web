import { useState } from 'react'
import { AudioNarration } from '../TaskInteraction/DiscoveryActivities'
import type { Draft, ExperienceProps } from './types'
import { checkpoint, restoredDraft } from './logic'
import CareerWorkspace from './CareerWorkspace'
import StudioWorkspace from './StudioWorkspace'
import Showcase from './Showcase'
import styles from './CreativeExperience.module.css'
export default function CreativeExperience(props:ExperienceProps) {
 const {task,onAnswered,onChanged}=props
 const [value,setValue]=useState<Draft>(()=>restoredDraft(task)),[ready,setReady]=useState(false)
 if(!task.experience)return <p role="alert">This creative activity is unavailable.</p>
 function update(patch:Partial<Draft>){const next={...value,...patch};setValue(next);checkpoint(task,next);setReady(false);onChanged?.()}
 function complete(patch:Partial<Draft>={}){const next={...value,...patch};setValue(next);checkpoint(task,next);setReady(true);onAnswered?.(true,JSON.stringify(next))}
 const workspace={...props,value,update,complete}
 return <section className={`${styles.root} ${task.package==='career'?styles.career:styles.enrichment}`} data-experience={task.experience.mode} aria-label={task.package==='career'?'My Future Discovery Journey':'My Creative Playground'}>
  <div className={styles.brand}><span>{task.package==='career'?'MY FUTURE DISCOVERY JOURNEY':'MY CREATIVE PLAYGROUND'}</span><span>{task.evidenceRole==='primary_digital'?'Knowledge practice':task.experience.performance?'Participation and teacher observation':'Explore / create / reflect'}</span></div>
  <AudioNarration script={task.question}/>
  {task.experience.mode==='showcase'?<Showcase {...workspace}/>:['art','beat','compare','movement','sound'].includes(task.experience.mode)?<StudioWorkspace {...workspace}/>:<CareerWorkspace {...workspace}/>}
  {ready&&<p role="status" className={styles.ready}>Ready to save. Use Next activity to confirm your progress.</p>}
 </section>
}
