import { useEffect, useRef, useState } from 'react'
import type { ArtObject, WorkspaceProps } from './types'
import { ART_COLORS, beatEvents } from './logic'
import { ObjectVisual } from './CareerWorkspace'
import { useCreativePlayback } from './useCreativePlayback'
import styles from './CreativeExperience.module.css'
export function ArtPreview({objects=[],background='paper',onSelect,selected}:{objects?:ArtObject[];background?:string;onSelect?:(id:number)=>void;selected?:number}) {
 return <svg viewBox="0 0 500 300" className={styles.canvas} role={onSelect?'group':'img'} aria-label="Your visual composition"><rect width="500" height="300" rx="20" fill={background==='sky'?'#e3f1fa':background==='garden'?'#e5f0df':'#fffaf0'}/>{background==='garden'&&<path d="M0 260q120-50 230 0t270-5v45H0" fill="#b5cf9e"/>}{objects.map(o=><g key={o.id} transform={`translate(${50+o.x*100},${50+o.y*100})`} fill={o.color} stroke={selected===o.id?'#173b53':'transparent'} strokeWidth="4" tabIndex={onSelect?0:undefined} role={onSelect?'button':undefined} aria-label={`${o.shape} at column ${o.x+1}, row ${o.y+1}`} onClick={()=>onSelect?.(o.id)} onKeyDown={event=>{if(onSelect&&(event.key==='Enter'||event.key===' ')){event.preventDefault();onSelect(o.id)}}}>{o.shape==='circle'?<circle r="33"/>:o.shape==='square'?<rect x="-30" y="-30" width="60" height="60" rx="8"/>:o.shape==='triangle'?<path d="M0-35L35 30H-35Z"/>:<path d="M0-37L11-12 37-10 18 9 23 35 0 22-23 35-18 9-37-10-11-12Z"/>}</g>)}</svg>
}
export function MovementFigure({move='pause'}:{move?:string}) {
 const arms=move==='clap'?'M82 80L112 100 142 80':move==='arms'?'M82 80L65 45m77 35l17-35':move==='sway'?'M82 80L59 95m83-15l20-8':'M82 80L75 117m67-37l-14 37'
 return <svg viewBox="0 0 224 190" className={styles.figure} role="img" aria-label={`${move} illustrative movement cue; physical participation is not detected`} data-movement={move}><rect width="224" height="190" rx="25" fill="#e9e7f6"/><g transform={move==='sway'?'rotate(-8 112 120)':undefined}><circle cx="112" cy="47" r="20" fill="#dba887"/><path d="M82 78Q112 65 142 78L139 125H85Z" fill="#7c73b4"/><path d={arms} stroke="#b47f60" strokeWidth="10" strokeLinecap="round" fill="none"/><path d={move==='step'?'M96 125L77 162m52-37l20 25':'M96 125v36m33-36v36'} stroke="#3f596a" strokeWidth="11" strokeLinecap="round"/></g>{move==='pause'&&<text x="112" y="183" textAnchor="middle" fontSize="14" fill="#173b53">Rest / observe</text>}</svg>
}
export default function StudioWorkspace({task,value,update,complete,quiet}:WorkspaceProps) {
 const ex=task.experience!,items=ex.items??[],playback=useCreativePlayback(quiet)
 const sample=useRef<HTMLAudioElement|null>(null)
 useEffect(()=>{const stop=()=>sample.current?.pause();window.addEventListener('cortex:pause-media',stop);return()=>{stop();window.removeEventListener('cortex:pause-media',stop)}},[])
 const [selected,setSelected]=useState<number>(),[message,setMessage]=useState(''),[choice,setChoice]=useState<ArtObject['shape']>('circle')
 const soundControls=<div className={styles.toolbar}><button aria-pressed={!playback.muted} onClick={()=>playback.setMuted(!playback.muted)} disabled={quiet}>{playback.muted||quiet?'Sound off - enable sound':'Sound on - mute'}</button><label>Volume<input aria-label="Creative sound volume" type="range" min="0" max="0.2" step="0.01" value={playback.volume} onChange={e=>playback.setVolume(Number(e.target.value))}/></label><button onClick={playback.stop}>Stop playback</button>{playback.error&&<p role="status">{playback.error}</p>}</div>
 if(ex.mode==='sound') {
  const active=items.find(i=>i.id===value.visited?.at(-1))
  return <div><div className={styles.destinations}>{items.map(i=><button key={i.id} aria-pressed={active?.id===i.id} onClick={()=>{sample.current?.pause();const visited=[...new Set([...(value.visited??[]).filter(id=>id!==i.id),i.id])];update({visited});complete({visited})}}><ObjectVisual item={i}/>{i.label}</button>)}</div>{active&&<article className={styles.station}><h3>{active.label}</h3><p>{active.description}</p>{active.audioUrl?<audio ref={node=>{sample.current=node;if(node)node.volume=.12}} controls preload="none" src={active.audioUrl} aria-label={`${active.label} recorded sample`} onError={()=>setMessage('Sample unavailable. Retry playback or use the visual description.')} />:<p>Recorded instrument sample awaiting approval. Explore this visual description; no sound-identification result is claimed.</p>}<p role="status">{message}</p></article>}</div>
 }
 if(ex.mode==='art') {
  const objects=value.objects??[],active=objects.find(o=>o.id===selected)
  function edit(patch:Partial<ArtObject>){if(active)update({objects:objects.map(o=>o.id===active.id?{...o,...patch}:o),blank:false})}
  return <div className={styles.artStudio}><div><ArtPreview objects={objects} background={value.background} selected={selected} onSelect={setSelected}/><p>Select a shape in the picture, or use the object list. Positions can overlap.</p></div><div className={styles.tools}>
   <label>Background<select aria-label="Background" value={value.background??'paper'} onChange={e=>update({background:e.target.value})}><option value="paper">Warm paper</option><option value="sky">Sky</option><option value="garden">Garden</option></select></label>
   <label>New shape<select aria-label="New shape" value={choice} onChange={e=>setChoice(e.target.value as ArtObject['shape'])}>{['circle','square','triangle','star'].map(s=><option key={s}>{s}</option>)}</select></label>
   <button disabled={objects.length>=12} onClick={()=>{const id=Math.max(0,...objects.map(o=>o.id))+1;update({background:value.background??'paper',objects:[...objects,{id,shape:choice,color:ART_COLORS[0],x:2,y:1}],blank:false});setSelected(id)}}>Add shape</button>
   <label>Selected object<select aria-label="Selected object" value={selected??''} onChange={e=>setSelected(Number(e.target.value))}><option value="">Choose an object</option>{objects.map(o=><option key={o.id} value={o.id}>{o.shape} {o.id}</option>)}</select></label>
   <div className={styles.palette} aria-label="Shape colours">{ART_COLORS.map((color,index)=><button key={color} aria-label={`Use colour ${index+1}`} aria-pressed={active?.color===color} style={{background:color}} disabled={!active} onClick={()=>edit({color})}/>)}</div>
   <label>Column<select aria-label="Column" disabled={!active} value={active?.x??2} onChange={e=>edit({x:Number(e.target.value)})}>{[0,1,2,3,4].map(x=><option key={x} value={x}>{x+1}</option>)}</select></label><label>Row<select aria-label="Row" disabled={!active} value={active?.y??1} onChange={e=>edit({y:Number(e.target.value)})}>{[0,1,2].map(y=><option key={y} value={y}>{y+1}</option>)}</select></label>
   <button disabled={!active} onClick={()=>{update({objects:objects.filter(o=>o.id!==selected)});setSelected(undefined)}}>Remove selected shape</button>
   <button onClick={()=>{if(window.confirm('Clear this picture? This affects only this activity.')){update({objects:[],blank:false});setSelected(undefined)}}}>Clear picture</button>
   <button onClick={()=>{if(!objects.length){setMessage('Add a shape, or choose to finish a blank composition.');return}complete({objects,background:value.background??'paper'});setMessage('Your picture is ready to save with Next activity.')}}>Use my picture</button>
   {!objects.length&&<button onClick={()=>{complete({objects:[],background:value.background??'paper',blank:true});setMessage('Your intentional blank composition is ready.')}}>Finish a blank composition</button>}<p role="status">{message}</p>
  </div></div>
 }
 if(ex.mode==='beat') {
  const grid=value.grid??[[false,false,false,false],[false,false,false,false]],tempo=value.tempo??80
  function toggle(track:number,step:number){playback.stop();update({grid:grid.map((r,i)=>r.map((cell,j)=>i===track&&j===step?!cell:cell)),tempo,rest:false})}
  return <div className={styles.beatStudio}><p>Two electronic tones, four steps. These are synthesized tones, not recorded instruments.</p>{soundControls}
   <div className={styles.beatGrid} role="group" aria-label="Four-step beat composer">{grid.map((row,track)=><div key={track}><strong>{track===0?'Low tone':'High tone'}</strong>{row.map((cell,step)=><button key={step} aria-label={`${track===0?'Low':'High'} tone step ${step+1}`} aria-pressed={cell} data-current={playback.step===step} onClick={()=>toggle(track,step)}>{step+1}<span aria-hidden="true">{cell?'●':'○'}</span></button>)}</div>)}</div>
   <div className={styles.toolbar}><label>Tempo<select aria-label="Tempo" value={tempo} onChange={e=>{playback.stop();update({tempo:Number(e.target.value)})}}>{[60,80,100].map(t=><option key={t} value={t}>{t} beats/min</option>)}</select></label><button onClick={()=>void playback.play(beatEvents(grid,tempo),4*60000/tempo+250)}>Play my beat</button><button onClick={()=>{playback.stop();if(window.confirm('Clear your four-step beat?'))update({grid:[[false,false,false,false],[false,false,false,false]],tempo,rest:false})}}>Clear beat</button><button onClick={()=>{if(!grid.some(r=>r.some(Boolean))){setMessage('Turn on a step, or explicitly choose a silent composition.');return}complete({grid,tempo});setMessage('Your beat is ready to save with Next activity.')}}>Use my beat</button><button onClick={()=>{complete({grid,tempo,rest:true});setMessage('Your silent composition is ready to save.')}}>Use a silent composition</button></div><p role="status">{message|| (playback.playing?`Playing step ${playback.step+1}`:'Ready when you are.')}</p>
  </div>
 }
 if(ex.mode==='compare') {
  function explore(kind:string){const explored=[...new Set([...(value.explored??[]),kind])];update({explored});const interval=['slow','soft'].includes(kind)?1000:600;void playback.play(Array.from({length:3},(_,step)=>({at:step*interval,step,notes:[220],level:kind==='soft'?.3:.8})),3*interval);setMessage(`${kind}: ${['soft','louder'].includes(kind)?'compare sound intensity at a comfortable volume':'compare the spacing of the beats'}. Visual cues remain available.`);if(explored.length>=2)complete({explored})}
  return <div>{soundControls}<p>Sound optional. Wider spacing means slower beats; closer spacing means faster beats. A larger mark represents a louder tone.</p><div className={styles.destinations}>{['soft','louder','slow','faster'].map(kind=><button key={kind} aria-pressed={value.explored?.includes(kind)??false} onClick={()=>explore(kind)}><span className={styles.comparisonMarks} aria-hidden="true" style={{fontSize:kind==='louder'?30:18,letterSpacing:kind==='slow'?16:3}}>● ● ●</span>{kind}</button>)}</div><p role="status">{message}</p></div>
 }
 if(ex.mode==='movement') {
  const order=value.order??ex.preset??[],route=value.route??'observe'
  const active=items.find(i=>i.id===order[Math.max(0,playback.step)])
  function replay(){void playback.play(order.map((_,step)=>({at:step*1400,step,notes:[220]})),order.length*1400);}
  return <div className={styles.movementStudio}>{soundControls}<p>Illustrated cues only. The website does not detect movement. Use a teacher-approved adaptation or observe.</p><label>Participation route<select aria-label="Participation route" value={route} onChange={e=>{playback.stop();update({route:e.target.value})}}>{['observe','seated','standing','point'].map(r=><option key={r}>{r}</option>)}</select></label>
   <div className={styles.movementStage}><MovementFigure move={active?.id??'pause'}/><div><h3 aria-live="polite">{playback.playing?`Cue ${playback.step+1}: ${active?.label??'Ready'}`:'Choose your sequence'}</h3><p>{active?.description}</p></div></div>
   <ol className={styles.sequence}>{order.map((id,index)=><li key={index} data-current={playback.step===index}>{index+1}. {items.find(i=>i.id===id)?.label}<button disabled={!index} aria-label={`Move cue ${index+1} earlier`} onClick={()=>{playback.stop();const next=[...order];[next[index],next[index-1]]=[next[index-1],next[index]];update({order:next,route})}}>Earlier</button><button aria-label={`Remove cue ${index+1}`} onClick={()=>{playback.stop();update({order:order.filter((_,i)=>i!==index),route})}}>Remove</button></li>)}</ol>
   <div className={styles.destinations}>{items.map(i=><button key={i.id} disabled={order.length>=3} onClick={()=>{playback.stop();update({order:[...order,i.id],route})}}><ObjectVisual item={i}/>{i.label}</button>)}</div>
   <div className={styles.toolbar}><button disabled={order.length!==3} onClick={replay}>Play movement sequence</button><button onClick={()=>{playback.stop();update({order:[],route})}}>Reset sequence</button><button disabled={order.length!==3} onClick={()=>{complete({order,route});setMessage('Your digital sequence is ready to save. Physical performance is recorded separately.')}}>Use my sequence</button></div><p role="status">{message}</p>
  </div>
 }
 return null
}
