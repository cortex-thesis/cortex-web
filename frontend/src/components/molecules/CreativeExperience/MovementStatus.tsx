import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { useAuthStore } from '../../../store/authStore'
export default function MovementStatus({classId}:{classId?:string}) {
 const studentId=useAuthStore(state=>state.user?.id)
 const [status,setStatus]=useState('Teacher observation not yet loaded.')
 useEffect(()=>{
  if(!classId||!studentId)return
  let active=true
  void api<{observations:{teacher:string|null;outcome:string;at:string}[]}>(`/classes/${classId}/students/${studentId}/movement-observations/`,{cache:'no-store'}).then(data=>{
   if(!active)return
   const latest=data.observations?.[0]
   const labels:Record<string,string>={observed:'Basic movements directly observed',adapted_observed:'Adapted movements directly observed',not_yet:'Further observation or support needed',declined:'Learner chose not to perform'}
   setStatus(latest?`${labels[latest.outcome]??latest.outcome}. Recorded by ${latest.teacher??'teacher account unavailable'} on ${new Date(latest.at).toLocaleString()}.`:'No teacher observation recorded yet. Digital sequencing remains separate from physical performance.')
  }).catch(()=>{if(active)setStatus('Teacher observation status is unavailable. Ask your teacher to check your learning profile.')})
  return()=>{active=false}
 },[classId,studentId])
 return <p role="status">{status}</p>
}
