import { useEffect, useRef, useState } from 'react'
import { Mic, Save, Square, Trash2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { getStudentJournal, saveStudentJournalMedia } from '../../lib/studentApi'
import styles from '../prototype/Prototype.module.css'

interface JournalRouteState {
  sessionId?: string
  prompt?: string
  mood?: string
}

function useJournalRoute() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as JournalRouteState) ?? {}
  async function sessionId() {
    if (state.sessionId) return state.sessionId
    return (await getStudentJournal()).session.id
  }
  return { navigate, state, sessionId }
}

export function DrawingJournal() {
  const { navigate, state, sessionId } = useJournalRoute()
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [color, setColor] = useState('#534ab7')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    element.width = rect.width * devicePixelRatio
    element.height = 340 * devicePixelRatio
    const context = element.getContext('2d')
    context?.scale(devicePixelRatio, devicePixelRatio)
    if (context) { context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = 5 }
  }, [])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return [event.clientX - rect.left, event.clientY - rect.top]
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (saving) return
    setSaved(false)
    drawing.current = true
    setHasDrawing(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    const context = canvas.current?.getContext('2d')
    const [x, y] = point(event)
    context?.beginPath()
    context?.moveTo(x, y)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || saving) return
    const context = canvas.current?.getContext('2d')
    const [x, y] = point(event)
    if (context) { context.strokeStyle = color; context.lineTo(x, y); context.stroke() }
  }

  function clear() {
    if (saving) return
    const element = canvas.current
    element?.getContext('2d')?.clearRect(0, 0, element.width, element.height)
    setHasDrawing(false)
    setSaved(false)
  }

  async function save() {
    const element = canvas.current
    if (!element || !hasDrawing || saving || saved) return
    setSaving(true)
    setError('')
    try {
      const blob = await new Promise<Blob>((resolve, reject) => element.toBlob(
        (value) => value ? resolve(value) : reject(new Error('Could not create the drawing file.')),
        'image/png',
      ))
      await saveStudentJournalMedia({
        session_id: await sessionId(), prompt: state.prompt ?? 'Draw what you learned today.',
        response_type: 'drawing', mood: state.mood ?? '', shared_with_teacher: true,
        file: blob, filename: `journal-drawing-${Date.now()}.png`,
      })
      setSaved(true)
      setSaving(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the drawing.')
      setSaving(false)
    }
  }

  return <PlayfulZoneTemplate showNav={false}><div className={styles.pageNarrow}>
    <div className={styles.header}><div><span className={styles.eyebrow}>Learning journal</span><h1 className={styles.title}>Draw what you learned</h1><p className={styles.subtitle}>Show your favorite part of today’s activity.</p></div><button className={styles.ghost} onClick={() => navigate('/student/journal', { state })}>Close</button></div>
    <div className={styles.card}><div className={styles.toolbar}>{['#534ab7', '#1d9e75', '#d4537e', '#ef9f27', '#1a1a2e'].map((item) => <button key={item} aria-label={`Use ${item}`} className={`${styles.color} ${color === item ? styles.colorActive : ''}`} style={{ background: item }} onClick={() => setColor(item)} />)}<button className={styles.secondary} onClick={clear}><Trash2 size={13} /> Clear</button></div>
      <canvas ref={canvas} className={styles.canvas} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false }} onPointerCancel={() => { drawing.current = false }} onPointerLeave={() => { drawing.current = false }} />
      {saved && <p role="status">Your journal was saved. <button onClick={() => navigate('/student/home', { replace: true })}>Continue to home</button></p>}
      {error && <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">{error}</div>}
      <div className={styles.actions} style={{ justifyContent: 'flex-end', marginTop: 14 }}><button className={styles.secondary} onClick={() => navigate('/student/journal', { state })}>Cancel</button><button className={styles.primary} disabled={saved || saving || !hasDrawing} onClick={() => void save()}><Save size={13} /> {saved ? 'Saved' : saving ? 'Saving...' : error ? 'Retry save' : 'Save drawing'}</button></div>
    </div>
  </div></PlayfulZoneTemplate>
}

export function AudioJournal() {
  const { navigate, state, sessionId } = useJournalRoute()
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    stream.current?.getTracks().forEach((track) => track.stop())
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  async function toggle() {
    if (saving) return
    if (recording) { recorder.current?.stop(); setRecording(false); return }
    setError('')
    setSaved(false)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = mediaStream
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
      const mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined)
      chunks.current = []
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data) }
      mediaRecorder.onstop = () => {
        const baseType = (mediaRecorder.mimeType || chunks.current[0]?.type || 'audio/webm').split(';')[0]
        const blob = new Blob(chunks.current, { type: baseType })
        setAudio(blob)
        setAudioUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob) })
        mediaStream.getTracks().forEach((track) => track.stop())
      }
      recorder.current = mediaRecorder
      setSeconds(0); setAudio(null); setAudioUrl('')
      mediaRecorder.start()
      setRecording(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Microphone access was denied.')
    }
  }

  async function save() {
    if (!audio || saving || saved) return
    setSaving(true)
    setError('')
    try {
      await saveStudentJournalMedia({
        session_id: await sessionId(), prompt: state.prompt ?? 'Tell me about your learning session.',
        response_type: 'audio', mood: state.mood ?? '', shared_with_teacher: true,
        file: audio, filename: `journal-recording-${Date.now()}.${audio.type === 'audio/mp4' ? 'mp4' : 'webm'}`,
      })
      setSaved(true)
      setSaving(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the recording.')
      setSaving(false)
    }
  }

  return <PlayfulZoneTemplate showNav={false}><div className={styles.pageNarrow}><div className={styles.card}>
    <div className={styles.center}><span className={styles.eyebrow}>Learning journal</span><h1 className={styles.title}>Tell me about your session</h1><p className={styles.subtitle} style={{ margin: '8px auto' }}>Record a short reflection about what you learned and how you felt.</p><button className={`${styles.recordButton} ${recording ? styles.recording : ''}`} onClick={() => void toggle()} aria-label={recording ? 'Stop recording' : 'Start recording'}>{recording ? <Square size={24} /> : <Mic size={28} />}</button><strong style={{ fontSize: 20, color: 'var(--color-deep-purple)' }}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong><p className={styles.muted}>{recording ? 'Recording… tap to stop' : audio ? 'Recording ready to review' : 'Tap the microphone to begin'}</p></div>
    {audioUrl && <div className={styles.wavePanel} style={{ marginTop: 18 }}><audio controls src={audioUrl} style={{ width: '100%' }}>Your browser cannot play this recording.</audio></div>}
    {saved && <p role="status">Your journal was saved. <button onClick={() => navigate('/student/home', { replace: true })}>Continue to home</button></p>}
      {error && <div className={`${styles.alert} ${styles.alertDanger}`} role="alert">{error}</div>}
    <div className={styles.actions} style={{ justifyContent: 'center', marginTop: 18 }}><button className={styles.secondary} onClick={() => navigate('/student/journal', { state })}>Cancel</button><button className={styles.primary} disabled={saved || !audio || recording || saving} onClick={() => void save()}><Save size={13} /> {saved ? 'Saved' : saving ? 'Saving...' : error ? 'Retry save' : 'Save recording'}</button></div>
  </div></div></PlayfulZoneTemplate>
}
