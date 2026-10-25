import { useEffect, useRef, useState } from 'react'
export interface PlaybackEvent { at:number; step:number; notes:number[]; level?:number }
// One owner per activity. Every scheduled sound and visual callback is cancellable.
export function useCreativePlayback(quiet=false) {
  const [playing,setPlaying]=useState(false),[step,setStep]=useState(-1),[muted,setMuted]=useState(true),[volume,setVolume]=useState(.12),[error,setError]=useState('')
  const resources=useRef<{timers:ReturnType<typeof setTimeout>[];context:AudioContext|null;generation:number}>({timers:[],context:null,generation:0})
  function stop() {
    const active=resources.current; active.generation++
    active.timers.forEach(clearTimeout);active.timers=[]
    if(active.context) { void active.context.close().catch(()=>{});active.context=null }
    setPlaying(false);setStep(-1)
  }
  useEffect(()=>{
    const hidden=()=>{if(document.hidden)stop()}
    window.addEventListener('cortex:pause-media',stop);window.addEventListener('cortex-stop-narration',stop);document.addEventListener('visibilitychange',hidden)
    return ()=>{window.removeEventListener('cortex:pause-media',stop);window.removeEventListener('cortex-stop-narration',stop);document.removeEventListener('visibilitychange',hidden);stop()}
  },[])
  async function play(events:PlaybackEvent[],duration:number) {
    stop();if(document.hidden)return
    const active=resources.current,generation=active.generation
    setError('');setPlaying(true)
    let context:AudioContext|null=null
    if(!muted&&!quiet) {
      try { context=new AudioContext();active.context=context;await context.resume() }
      catch { setError('Sound is unavailable. The visual sequence still works.');context=null }
    }
    if(active.generation!==generation){if(context&&context.state!=='closed')void context.close();return}
    const origin=context?.currentTime??0
    events.forEach(event=>{
      active.timers.push(setTimeout(()=>{if(active.generation===generation)setStep(event.step)},event.at))
      if(context)for(const frequency of event.notes) {
        const oscillator=context.createOscillator(),gain=context.createGain(),at=origin+event.at/1000
        oscillator.type='sine';oscillator.frequency.value=frequency
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(Math.min(.2,volume*(event.level??1)),at+.015);gain.gain.exponentialRampToValueAtTime(.001,at+.18)
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(at);oscillator.stop(at+.2)
      }
    })
    active.timers.push(setTimeout(()=>{if(active.generation===generation)stop()},duration))
  }
  return {playing,step,muted,volume,error,play,stop,setMuted:(value:boolean)=>{stop();setMuted(value)},setVolume:(value:number)=>{stop();setVolume(value)}}
}
