import { useState } from 'react'
import { Boxes, Sprout, Palette, Music, BookOpen, Store, Wrench, HeartHandshake, Scissors, Lightbulb, Hand, Footprints, Bell, Circle, Drama, Volleyball, Wheat, Pencil, Ear, Archive, Pause, Sparkles } from 'lucide-react'
import type { ObjectCard, WorkspaceProps } from './types'
import { toggleSelection } from './logic'
import styles from './CreativeExperience.module.css'
const ICONS:Record<string,typeof Sparkles>={boxes:Boxes,sprout:Sprout,palette:Palette,music:Music,'book-open':BookOpen,store:Store,wrench:Wrench,'heart-handshake':HeartHandshake,scissors:Scissors,lightbulb:Lightbulb,hand:Hand,footprints:Footprints,bell:Bell,circle:Circle,drama:Drama,volleyball:Volleyball,wheat:Wheat,pencil:Pencil,ear:Ear,archive:Archive,pause:Pause}
export function ObjectVisual({item}:{item:ObjectCard}) {const Icon=ICONS[item.symbol??'']??Sparkles;return item.imageUrl?<img src={item.imageUrl} alt="" onError={event=>{event.currentTarget.hidden=true}}/>:<Icon size={38} strokeWidth={1.6} aria-hidden="true"/>}
export function DiscoveryLandscape({festival=false}:{festival?:boolean}) {
 return <svg viewBox="0 0 640 180" className={styles.landscape} role="img" aria-label={festival?'Illustrated talent festival with creative booths':'Illustrated Career Town with community workplaces'}><rect width="640" height="180" rx="24" fill={festival?'#eee8f8':'#e7f1e9'}/><path d="M0 145Q150 85 310 145T640 135" fill="none" stroke="#fffdf4" strokeWidth="30"/>{[65,225,385,545].map((x,i)=><g key={x}><rect x={x-40} y="65" width="80" height="65" rx="6" fill={['#d5a85b','#8c82b6','#739d91','#b7788a'][i]}/><path d={`M${x-48} 65L${x} 29l48 36Z`} fill={festival?'#cf9eb4':'#6e8e7c'}/><rect x={x-10} y="93" width="20" height="37" rx="4" fill="#fff6db"/><path d={`M${x-29} 83h12m34 0h12`} stroke="#fff6db" strokeWidth="14"/></g>)}{festival&&<path d="M20 20Q320 70 620 20" stroke="#9583b2" strokeWidth="3" fill="none"/>}</svg>
}
export function WorkScene({state='scattered',label,kind='store'}:{state?:string;label:string;kind?:string}) {
 const ready=state==='ready',upset=state==='upset'
 return <svg className={styles.scene} viewBox="0 0 620 240" role="img" aria-label={label} data-scene-state={state}>
  <rect width="620" height="240" rx="24" fill="#edf4ef"/><rect x="35" y="32" width="110" height="87" rx="12" fill="#d4e6df"/>
  <path d="M90 32v87M35 75h110" stroke="#fff" strokeWidth="6"/>
  <rect x="175" y="132" width="260" height="12" rx="6" fill="#9a775b"/><path d="M195 144v68m220-68v68" stroke="#9a775b" strokeWidth="12"/>
  <circle cx="505" cy="70" r="24" fill="#efc4a5"/><path d="M475 176v-65q30-22 60 0v65" fill="#537f93"/><path d="M488 178v35m34-35v35" stroke="#2c4658" strokeWidth="12"/>
  <path d={upset?'M496 82q10-12 20 0':'M496 78q10 10 20 0'} fill="none" stroke="#634937" strokeWidth="3"/>
  {kind==='garden'?<g><path d="M255 130l-14-45h65l-14 45" fill="#c38d61"/><path d="M274 86V43m0 22q-35-32-40-8 15 18 40 8m0-5q35-30 39-9-12 20-39 9" fill={ready?'#399b70':'#8ba67a'} stroke="#327d5c" strokeWidth="3"/>{ready&&<path d="M330 50l-8 22m20-15l-8 22" stroke="#5c9ec9" strokeWidth="4"/>}</g>:
   Array.from({length:5},(_,i)=><g key={i} transform={`translate(${ready?220+i*31:145+i*48},${ready?100:175+(i%2)*15}) rotate(${ready?0:i*13-20})`}>{kind==='bakery'?<><ellipse cx="13" cy="13" rx="17" ry="11" fill="#dba861"/><path d="M5 5l4 7m3-9l4 7" stroke="#fff0c4" strokeWidth="3"/></>:kind==='art'?<><rect width="30" height="32" rx="2" fill="#fffaf0"/><path d="M4 25L23 5" stroke={['#8c82bd','#599b8c','#c98091'][i%3]} strokeWidth="5"/></>:<><rect width="26" height="25" rx="4" fill={['#d9ab54','#8c82bd','#599b8c','#c98091','#83a4bc'][i]}/><path d="M5 8h15m-15 6h12" stroke="white" strokeWidth="2"/></>}</g>)}
  <rect x="25" y="208" width="135" height="10" rx="5" fill={ready?'#79aa95':'#d3b49a'}/>
 </svg>
}
export default function CareerWorkspace({task,value,update,complete,quiet,narrowed}:WorkspaceProps) {
 const ex=task.experience!,items=ex.items??[],stations=ex.stations??[]
 const [active,setActive]=useState(''),[page,setPage]=useState(0),[message,setMessage]=useState('')
 const group=quiet?1:narrowed?3:4
 const collection=ex.mode==='collection'
 if(ex.mode==='intro')return <div className={styles.adventure}><div className={styles.welcomeArt}>{items.slice(0,3).map(i=><span key={i.id}><ObjectVisual item={i}/><small>{i.label}</small></span>)}</div><p>Explore at your own pace. You can ask for support.</p><button onClick={()=>complete({reviewed:true,reflection:[]})}>Start exploring</button></div>
 if(['gallery','map','wheel','sound'].includes(ex.mode)) {
  const cards=ex.mode==='map'?stations:items,selected=cards.find(i=>i.id===active)
  function visit(id:string){setActive(id);const visited=[...new Set([...(value.visited??[]),id])];update({visited});complete({visited})}
  return <div className={styles.explorer}>
   {ex.mode==='map'&&<DiscoveryLandscape festival={task.package==='enrichment'}/>}
   {ex.mode==='map'&&<div className={styles.route} aria-hidden="true"><span>Discover</span><i/><span>Explore</span><i/><span>Try</span></div>}
   <div className={ex.mode==='wheel'?styles.wheel:styles.destinations} role="group" aria-label={ex.mode==='map'?'Discovery destinations':'Explore choices'}>{cards.slice(page*group,(page+1)*group).map(i=><button key={i.id} aria-pressed={active===i.id} onClick={()=>visit(i.id)}><ObjectVisual item={i}/><strong>{i.label}</strong><small>{value.visited?.includes(i.id)?'Explored':'Explore'}</small></button>)}</div>
   {cards.length>group&&<div className={styles.toolbar}><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous choices</button><span>Group {page+1} of {Math.ceil(cards.length/group)}</span><button disabled={(page+1)*group>=cards.length} onClick={()=>setPage(p=>p+1)}>More choices</button></div>}
   {selected&&<article className={styles.station}><ObjectVisual item={selected}/><h3>{selected.label}</h3><p>{selected.description}</p>{selected.before&&<WorkScene kind={selected.id} label={selected.before}/>}<p>{ex.mode==='sound'?'Recorded instrument sample awaiting approval. Use the visual description; this is not a listening assessment.':ex.mode==='wheel'?'Choose a comfortable adaptation, point to the cue, or observe.':'You can explore another card whenever you like.'}</p></article>}
  </div>
 }
 if(collection){
  const categories=ex.categories??[],category=categories.find(c=>c.id===active)??categories[0],picks=value.selections??{}
  function choose(id:string){const old=picks[category.id]??[];const next=['unsure','decline'].includes(id)?[id]:toggleSelection(old.filter(x=>!['unsure','decline'].includes(x)),id);update({selections:{...picks,[category.id]:next}})}
  return <div className={styles.collection}>
   <div className={styles.tabs}>{categories.map(c=><button key={c.id} aria-pressed={category.id===c.id} onClick={()=>{setActive(c.id);setPage(0)}}>{c.label}<small>{(picks[c.id]??[]).map(id=>items.find(i=>i.id===id)?.label??(id==='unsure'?'Not sure yet':'Prefer not to choose')).join(', ')||'Choose when ready'}</small></button>)}</div>
   <div className={styles.destinations}>{items.slice(page*group,(page+1)*group).map(i=><button key={i.id} aria-pressed={picks[category.id]?.includes(i.id)??false} onClick={()=>choose(i.id)}><ObjectVisual item={i}/>{i.label}</button>)}</div>
   <div className={styles.toolbar}><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous choices</button><button disabled={(page+1)*group>=items.length} onClick={()=>setPage(p=>p+1)}>More choices</button><button aria-pressed={picks[category.id]?.includes('unsure')??false} onClick={()=>choose('unsure')}>Not sure yet</button><button aria-pressed={picks[category.id]?.includes('decline')??false} onClick={()=>choose('decline')}>Prefer not to choose</button></div>
   <p>Your choices can overlap. They are not verified abilities.</p><button onClick={()=>{if(categories.some(c=>!picks[c.id]?.length)){setMessage('Choose an activity, uncertainty or prefer not to choose in each area.');return}complete({selections:picks});setMessage('Your reflection is ready to save with Next activity.')}}>Use my reflection</button><p role="status">{message}</p>
  </div>
 }
 if(ex.mode==='connect') {
  const source=items.find(i=>i.id===active)??items[0],links=value.links??{}
  function connect(id:string){update({links:{...links,[source.id]:toggleSelection(links[source.id]??[],id)}});setMessage('')}
  return <div><div className={styles.tabs}>{items.map(i=><button key={i.id} aria-pressed={source.id===i.id} onClick={()=>setActive(i.id)}>{i.label}<small>{(links[i.id]??[]).map(id=>stations.find(s=>s.id===id)?.label).join(', ')||'No connections yet'}</small></button>)}</div><p>Connect <strong>{source.label}</strong> to every suitable destination shown in this example.</p><div className={styles.destinations}>{stations.map(i=><button key={i.id} aria-pressed={links[source.id]?.includes(i.id)??false} onClick={()=>connect(i.id)}><ObjectVisual item={i}/>{i.label}</button>)}</div><button onClick={()=>{const correct=items.every(i=>{const targets=links[i.id]??[],expected=ex.links?.[i.id]??[];return targets.length===expected.length&&targets.every(id=>expected.includes(id))});if(correct){complete({links});setMessage('These connections show how the skills support the tasks.')}else{setMessage('Look at the work each place needs. One skill can fit several places. Try another connection.')}}}>Check connections</button><p role="status">{message}</p></div>
 }
 if(ex.mode==='work') {
  const station=stations.find(i=>i.id===(value.station??active))??stations[0]
  return <div><div className={styles.tabs}>{stations.map(i=><button key={i.id} aria-pressed={station.id===i.id} onClick={()=>{setActive(i.id);update({station:i.id,tool:undefined,applied:false});setMessage('')}}><ObjectVisual item={i}/>{i.label}</button>)}</div><WorkScene kind={station.id} state={value.applied?'ready':'scattered'} label={(value.applied?station.after:station.before)??station.label}/><p role="status">{value.applied?station.after:station.before}</p><div className={styles.toolbar}>{[station.tool!,station.distractor!].map(tool=><button key={tool} aria-pressed={value.tool===tool} onClick={()=>update({station:station.id,tool,applied:false})}>{tool}</button>)}<button disabled={!value.tool} onClick={()=>{if(value.tool===station.tool){update({applied:true});complete({station:station.id,tool:value.tool,applied:true});setMessage(`${station.action}. The useful skill helps the work continue.`)}else setMessage('This task needs different materials. Choose another tool.')}}>{station.action}</button></div><p role="status">{message}</p></div>
 }
 if(ex.mode==='story') {
  const scenes=ex.scenes??[];let current=ex.start
  for(const step of value.path??[])current=scenes.find(s=>s.id===current)?.choices.find(c=>c.id===step.choice)?.next??ex.start
  const scene=scenes.find(s=>s.id===current)??scenes[0]
  function choose(id:string){const path=[...(value.path??[]),{scene:scene.id,choice:id}],next=scene.choices.find(c=>c.id===id)?.next;update({path});if(!scenes.find(s=>s.id===next)?.choices.length)complete({path})}
  return <div className={styles.theater}><WorkScene state={scene.state} label={scene.label}/><h3 aria-live="polite">{scene.label}</h3><div className={styles.toolbar}>{scene.choices.map(c=><button key={c.id} onClick={()=>choose(c.id)}>{c.label}</button>)}</div>{!scene.choices.length&&<p>This story reached a helpful resolution. You can continue or explore it again.</p>}<button onClick={()=>{update({path:[]});setMessage('')}}>Restart story</button></div>
 }
 if(ex.mode==='order'){
  const order=value.order??[]
  return <div><ol className={styles.sequence}>{order.map((id,index)=><li key={index}><span>{index+1}. {items.find(i=>i.id===id)?.label}</span><button aria-label={`Move ${items.find(i=>i.id===id)?.label} earlier`} disabled={!index} onClick={()=>{const next=[...order];[next[index-1],next[index]]=[next[index],next[index-1]];update({order:next})}}>Earlier</button><button aria-label={`Remove ${items.find(i=>i.id===id)?.label}`} onClick={()=>update({order:order.filter((_,i)=>i!==index)})}>Remove</button></li>)}</ol><div className={styles.destinations}>{items.filter(i=>!order.includes(i.id)).map(i=><button key={i.id} onClick={()=>update({order:[...order,i.id]})}><ObjectVisual item={i}/>{i.label}</button>)}</div><button disabled={order.length!==items.length} onClick={()=>{if(JSON.stringify(order)===JSON.stringify(ex.order)){complete({order});setMessage('Your sequence matches the taught example.')}else setMessage('Compare the first and last steps with the example, then rearrange.')}}>Check sequence</button><p role="status">{message}</p></div>
 }
 if(ex.mode==='participation')return <div className={styles.destinations}>{items.map(i=><button key={i.id} aria-pressed={value.route===i.id} onClick={()=>{update({route:i.id});complete({route:i.id})}}>{i.label}</button>)}</div>
 return null
}
