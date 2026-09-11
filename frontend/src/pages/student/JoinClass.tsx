import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, QrCode } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CodeInput, AlertBanner, InlineSkeleton } from '../../components/molecules'
import { api } from '../../lib/api'
import type { StudentClass } from '../../lib/studentApi'
import { PACKAGE_EMOJI } from '../../lib/studentApi'
import styles from './JoinClass.module.css'

type JoinStatus = 'idle' | 'loading' | 'error' | 'success'

export default function JoinClass() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<JoinStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [foundClass, setFoundClass] = useState<StudentClass | null>(null)

  async function handleComplete(value: string) {
    setStatus('loading'); setErrorMsg('')
    try {
      const result = await api<{ class: StudentClass }>('/student/classes/join/', { method: 'POST', body: JSON.stringify({ code: value }) })
      setFoundClass(result.class); setStatus('success')
      window.setTimeout(() => navigate(`/student/class/${result.class.id}`, { replace: true }), 900)
    } catch (error) {
      setStatus('error'); setErrorMsg(error instanceof Error ? error.message : 'Unable to join this class.'); setCode('')
    }
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.topBar}><button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={16} strokeWidth={1.75} /></button><h1 className={styles.title}>Join a class</h1></div>
      <div className={styles.content}>
        <span className={styles.emoji} aria-hidden="true">🎓</span>
        <div className={styles.textBlock}><h2 className={styles.heading}>Enter your class code</h2><p className={styles.sub}>Type the code your teacher gave you</p></div>
        {status === 'error' && <AlertBanner variant="error" message={errorMsg} className={styles.alert} />}
        {status === 'success' && foundClass && <AlertBanner variant="success" title={`Joined ${PACKAGE_EMOJI[foundClass.packages?.[0]?.slug ?? 'life']} ${foundClass.name}`} message="Opening your class..." className={styles.alert} />}
        <CodeInput value={code} onChange={(value) => { setCode(value); if (status === 'error') setStatus('idle') }} onComplete={handleComplete} fieldState={status === 'error' ? 'error' : status === 'success' ? 'success' : 'default'} errorText={errorMsg} successText={foundClass ? `Joined ${foundClass.name}` : undefined} hint="Enter the code your teacher gave you" disabled={status === 'loading' || status === 'success'} />
        {status === 'loading' && <div className={styles.loadingText}><InlineSkeleton width={180} height={13} /></div>}
        <div className={styles.divider}><span className={styles.dividerLine} /><span className={styles.dividerText}>or</span><span className={styles.dividerLine} /></div>
        <button className={styles.qrBtn} disabled aria-label="QR scanning is coming soon"><QrCode size={16} strokeWidth={1.75} />Scan QR code</button>
      </div>
    </PlayfulZoneTemplate>
  )
}
