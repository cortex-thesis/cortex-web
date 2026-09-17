import { useEffect, useMemo, useRef, useState } from 'react'
import { BatteryMedium, Bluetooth, CheckCircle2, Database, Radio, Square, Trash2 } from 'lucide-react'
import { Logo } from '../components/atoms'
import { api } from '../lib/api'
import { MUSE_CHANNELS, useMuseStore } from '../store/museStore'
import { analyzeBands } from '../store/museDsp'
import styles from './Baseline.module.css'

type Recording = { id: string; participant_code: string; condition: string; status: string; started_at: string; epoch_count: number }
type Epoch = { epoch_number: number; start_offset_ms: number; end_offset_ms: number; sample_count: number; raw_channels: Record<string, number[]>; channel_statistics: Record<string, { mean: number; standard_deviation: number; minimum: number; maximum: number }>; absolute_band_powers: Record<string, number>; relative_band_powers: Record<string, number>; theta_beta_ratio: number | null; signal_quality: number[]; accepted_channels: number; battery_level: number | null; is_usable: boolean }
type RecordingDetail = { recording: Recording & { age_years: number | null; sex_at_birth: string; device_name: string; sampling_rate_hz: number; planned_duration_seconds: number; epoch_length_seconds: number; selected_variables: string[] }; epochs: Epoch[] }
const FEATURES = [
  ['raw_channels', 'Raw TP9, AF7, AF8, TP10 (required)'], ['theta_power', 'Theta power (4-8 Hz)'],
  ['alpha_power', 'Alpha power (8-13 Hz)'], ['beta_power', 'Beta power (13-30 Hz)'],
  ['gamma_power', 'Gamma power (30-40 Hz)'], ['delta_power', 'Delta power (optional)'],
  ['theta_beta_ratio', 'Theta/Beta ratio'], ['signal_quality', 'Signal quality (quality control)'],
  ['age_years', 'Age (metadata only)'], ['sex_at_birth', 'Sex at birth (metadata only)'],
] as const
const colors = ['#534ab7', '#1d9e75', '#d4537e', '#ef9f27']

export default function Baseline() {
  const muse = useMuseStore()
  const [participantCode, setParticipantCode] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [condition, setCondition] = useState('neutral_baseline')
  const [duration, setDuration] = useState(30)
  const [epochLength, setEpochLength] = useState(2)
  const [features, setFeatures] = useState<string[]>(['raw_channels', 'theta_power', 'alpha_power', 'beta_power', 'gamma_power', 'theta_beta_ratio', 'signal_quality'])
  const [consent, setConsent] = useState(false)
  const [recordingId, setRecordingId] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [savedEpochs, setSavedEpochs] = useState(0)
  const [history, setHistory] = useState<Recording[]>([])
  const [expandedId, setExpandedId] = useState('')
  const [details, setDetails] = useState<Record<string, RecordingDetail>>({})
  const [detailLoading, setDetailLoading] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const startedAt = useRef(0)
  const finishing = useRef(false)
  const nextEpoch = useRef(1)
  const captureBusy = useRef(false)

  const refresh = () => api<{ recordings: Recording[] }>('/baseline/').then((data) => setHistory(data.recordings)).catch(() => undefined)
  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    if (!recordingId) return
    const epochMs = epochLength * 1000
    const capture = async () => {
      if (captureBusy.current || finishing.current) return
      const state = useMuseStore.getState()
      const epochNumber = nextEpoch.current
      const totalEpochs = Math.floor(duration / epochLength)
      const elapsedMs = Date.now() - startedAt.current
      if (epochNumber > totalEpochs || elapsedMs < epochNumber * epochMs + 600) return
      const count = epochLength * 256
      if (!state.samples.every((channel) => channel.length >= count)) {
        if (elapsedMs >= epochNumber * epochMs + 2000) setError('Muse samples are arriving slowly. Keep the headset connected while this epoch finishes buffering.')
        return
      }
      captureBusy.current = true
      try {
        const rawChannelArrays = MUSE_CHANNELS.map((_, index) => state.samples[index].slice(-count))
        const epochAnalysis = analyzeBands(rawChannelArrays, count)
        if (!epochAnalysis) {
          setError('This epoch did not contain enough clean channels. Adjust the headset and remain still.')
          return
        }
        await api(`/baseline/${recordingId}/`, { method: 'POST', body: JSON.stringify({
          action: 'epoch', epoch_number: epochNumber, start_offset_ms: (epochNumber - 1) * epochMs, end_offset_ms: epochNumber * epochMs,
          raw_channels: Object.fromEntries(MUSE_CHANNELS.map((name, index) => [name, rawChannelArrays[index]])),
          absolute_band_powers: epochAnalysis.absolute, relative_band_powers: epochAnalysis.relative,
          signal_quality: state.quality, accepted_channels: epochAnalysis.acceptedChannels, battery_level: state.battery,
        }) })
        nextEpoch.current += 1
        setSavedEpochs((value) => Math.max(value, epochNumber)); setError('')
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Epoch could not be saved.') }
      finally { captureBusy.current = false }
    }
    // Poll frequently and give Bluetooth packets a short grace period. Muse packets
    // do not arrive at exact wall-clock epoch boundaries.
    const epochTimer = window.setInterval(() => void capture(), 200)
    const clock = window.setInterval(() => setElapsed(Math.min(duration, (Date.now() - startedAt.current) / 1000)), 100)
    const finishTimer = window.setTimeout(() => void finishRecording(), duration * 1000 + 1800)
    return () => { window.clearInterval(epochTimer); window.clearInterval(clock); window.clearTimeout(finishTimer) }
    // The active recording configuration is intentionally frozen at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId])

  async function startRecording() {
    if (muse.status !== 'streaming') return setError('Connect Muse 2 before starting.')
    if (!participantCode.trim() || !consent) return setError('Participant code and confirmed consent are required.')
    setError(''); setMessage(''); setSavedEpochs(0); setElapsed(0); finishing.current = false; captureBusy.current = false; nextEpoch.current = 1
    try {
      const result = await api<{ id: string }>('/baseline/', { method: 'POST', body: JSON.stringify({
        participant_code: participantCode, age_years: features.includes('age_years') ? age : '', sex_at_birth: features.includes('sex_at_birth') ? sex : '',
        condition, label_source: condition === 'neutral_baseline' ? 'protocol' : 'researcher_observation', selected_variables: features,
        device_name: muse.deviceName || 'Muse 2', planned_duration_seconds: duration, epoch_length_seconds: epochLength, consent_confirmed: consent,
      }) })
      startedAt.current = Date.now(); setRecordingId(result.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start baseline recording.') }
  }

  async function finishRecording(cancel = false) {
    if (!recordingId || finishing.current) return
    finishing.current = true
    try {
      const result = await api<{ epoch_count: number }>(`/baseline/${recordingId}/`, { method: 'POST', body: JSON.stringify({ action: cancel ? 'cancel' : 'complete' }) })
      setSavedEpochs(result.epoch_count); setMessage(cancel ? 'Recording cancelled. Captured epochs were retained for audit.' : `Baseline saved with ${result.epoch_count} epochs.`)
      setRecordingId(''); void refresh()
    } catch (reason) { finishing.current = false; setError(reason instanceof Error ? reason.message : 'Unable to finish recording.') }
  }

  const waveforms = useMemo(() => muse.samples.map((values) => values.filter((_, index) => index % Math.max(1, Math.floor(values.length / 120)) === 0).slice(-120)), [muse.samples])
  const toggle = (key: string) => setFeatures((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])
  const includeFeature = (key: string) => setFeatures((current) => current.includes(key) ? current : [...current, key])
  const toggleRecording = async (id: string) => {
    if (expandedId === id) return setExpandedId('')
    setExpandedId(id)
    if (details[id]) return
    setDetailLoading(id)
    try {
      const detail = await api<RecordingDetail>(`/baseline/${id}/`)
      setDetails((current) => ({ ...current, [id]: detail }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load baseline values.') }
    finally { setDetailLoading('') }
  }
  const deleteRecording = async (item: Recording) => {
    const confirmed = window.confirm(`Permanently delete ${item.participant_code} (${item.condition.replaceAll('_', ' ')}) and all ${item.epoch_count} saved epochs/raw EEG samples? This cannot be undone.`)
    if (!confirmed) return
    setDeletingId(item.id); setError(''); setMessage('')
    try {
      const result = await api<{ epochs_deleted: number }>(`/baseline/${item.id}/`, { method: 'DELETE' })
      setExpandedId(''); setDetails((current) => { const next = { ...current }; delete next[item.id]; return next })
      setHistory((current) => current.filter((recording) => recording.id !== item.id))
      setMessage(`Recording deleted with ${result.epochs_deleted} epoch${result.epochs_deleted === 1 ? '' : 's'} and its raw EEG data.`)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete baseline recording.') }
    finally { setDeletingId('') }
  }
  return <main className={styles.page}>
    <header className={styles.header}><Logo variant="horizontal" height={31} /><div><span>Research acquisition</span><h1>EEG baseline recorder</h1><p>Capture reproducible Muse 2 epochs for clustering and classification.</p></div><div className={styles.device}><Radio size={16} /> {muse.status === 'streaming' ? muse.deviceName || 'Muse 2' : 'Not connected'} {muse.battery != null && <span><BatteryMedium size={15} /> {muse.battery}%</span>}</div></header>
    <div className={styles.layout}>
      <section className={styles.card}><div className={styles.sectionTitle}><div><span>Live signal</span><h2>TP9, AF7, AF8, TP10</h2></div>{muse.status !== 'streaming' ? <button className={styles.primary} onClick={() => void muse.connect()}><Bluetooth size={16} /> Connect Muse 2</button> : <span className={styles.connected}><CheckCircle2 size={15} /> Streaming</span>}</div>
        <div className={styles.waveBox}>{waveforms.map((values, channel) => <svg key={MUSE_CHANNELS[channel]} viewBox="0 0 600 58" preserveAspectRatio="none"><text x="8" y="14">{MUSE_CHANNELS[channel]}</text><polyline stroke={colors[channel]} points={values.map((value, index) => `${index * 600 / Math.max(values.length - 1, 1)},${29 - Math.max(-25, Math.min(25, value / 8))}`).join(' ')} /></svg>)}</div>
        <div className={styles.bandGrid}>{Object.entries(muse.bands).map(([key, value]) => <div key={key}><span>{key}</span><strong>{value.toFixed(3)}</strong></div>)}</div>
        <div className={styles.quality}>{MUSE_CHANNELS.map((name, index) => <span key={name} data-quality={muse.quality[index]}>{name}: {muse.quality[index] === 2 ? 'good' : muse.quality[index] === 1 ? 'adjust' : 'poor'}</span>)}<strong>{muse.acceptedChannels}/4 clean channels</strong></div>
      </section>
      <aside className={styles.card}><span className={styles.kicker}>Protocol setup</span><h2>Baseline variables</h2>
        <label>Participant code<input value={participantCode} disabled={!!recordingId} onChange={(event) => setParticipantCode(event.target.value)} placeholder="e.g. P001" /></label>
        <div className={styles.two}><label>Age (optional)<input type="number" min="3" max="100" value={age} disabled={!!recordingId} placeholder="Enter age" onChange={(event) => { setAge(event.target.value); if (event.target.value) includeFeature('age_years') }} /></label><label>Sex at birth (optional)<select value={sex} disabled={!!recordingId} onChange={(event) => { setSex(event.target.value); if (event.target.value) includeFeature('sex_at_birth') }}><option value="">Not collected</option><option value="female">Female</option><option value="male">Male</option><option value="intersex">Intersex</option><option value="prefer_not_to_say">Prefer not to say</option></select></label></div>
        <label>Recording condition<select value={condition} disabled={!!recordingId} onChange={(event) => setCondition(event.target.value)}><option value="neutral_baseline">Neutral baseline / fixation point</option><option value="focused">Focused task</option><option value="relaxed">Relaxed condition</option><option value="distracted">Distracted condition</option><option value="overstimulated">Overstimulated condition</option></select></label>
        <div className={styles.two}><label>Duration<select value={duration} disabled={!!recordingId} onChange={(event) => setDuration(Number(event.target.value))}><option value="30">30 seconds</option><option value="60">1 minute</option><option value="120">2 minutes</option><option value="300">5 minutes</option><option value="600">10 minutes</option></select></label><label>Epoch length<select value={epochLength} disabled={!!recordingId} onChange={(event) => setEpochLength(Number(event.target.value))}><option value="2">2 seconds</option><option value="4">4 seconds</option><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="30">30 seconds</option></select></label></div>
        <fieldset disabled={!!recordingId}><legend>Dataset columns</legend>{FEATURES.map(([key, label]) => <label className={styles.check} key={key}><input type="checkbox" checked={features.includes(key)} disabled={key === 'raw_channels' || !!recordingId} onChange={() => toggle(key)} /> {label}</label>)}</fieldset>
        <label className={styles.consent}><input type="checkbox" checked={consent} disabled={!!recordingId} onChange={(event) => setConsent(event.target.checked)} /> I confirm approved consent/assent and the participant may stop at any time.</label>
        {recordingId ? <div className={styles.recording}><div><strong>{elapsed.toFixed(1)}s / {duration}s</strong><span>{savedEpochs} of {Math.floor(duration / epochLength)} epochs saved</span></div><div className={styles.progress}><span style={{ width: `${elapsed / duration * 100}%` }} /></div><button className={styles.stop} onClick={() => void finishRecording()}><Square size={15} /> Stop and save</button></div> : <button className={styles.primaryWide} disabled={muse.status !== 'streaming'} onClick={() => void startRecording()}><Database size={16} /> Start recording</button>}
        {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success}>{message}</p>}
      </aside>
    </div>
    <section className={`${styles.card} ${styles.history}`}><div className={styles.sectionTitle}><div><span>Database</span><h2>Recent baseline recordings</h2></div></div>{history.length ? <div className={styles.table}>{history.map((item) => <div className={styles.recordingRow} key={item.id}><button className={styles.rowSummary} onClick={() => void toggleRecording(item.id)} aria-expanded={expandedId === item.id}><strong>{item.participant_code}</strong><span>{item.condition.replaceAll('_', ' ')}</span><span>{new Date(item.started_at).toLocaleString()}</span><span>{item.epoch_count} epochs</span><b>{item.status}</b><i>{expandedId === item.id ? 'Hide values' : 'View values'}</i></button>{expandedId === item.id && <div className={styles.detail}>{detailLoading === item.id ? <div className={styles.detailSkeleton} /> : details[item.id] && <><div className={styles.detailActions}><span>Deleting this recording also deletes every saved epoch and raw sample inside it.</span><button disabled={deletingId === item.id} onClick={() => void deleteRecording(item)}><Trash2 size={14} /> {deletingId === item.id ? 'Deleting…' : 'Delete recording'}</button></div><div className={styles.metadata}><span><b>Device</b>{details[item.id].recording.device_name}</span><span><b>Sample rate</b>{details[item.id].recording.sampling_rate_hz} Hz</span><span><b>Epoch length</b>{details[item.id].recording.epoch_length_seconds}s</span><span><b>Age</b>{details[item.id].recording.age_years ?? 'Not collected'}</span><span><b>Sex</b>{details[item.id].recording.sex_at_birth || 'Not collected'}</span></div><div className={styles.epochs}>{details[item.id].epochs.map((epoch) => <article className={styles.epoch} key={epoch.epoch_number}><header><strong>Epoch {epoch.epoch_number}</strong><span>{(epoch.start_offset_ms / 1000).toFixed(1)}–{(epoch.end_offset_ms / 1000).toFixed(1)}s · {epoch.sample_count} samples/channel</span><b data-usable={epoch.is_usable}>{epoch.is_usable ? 'usable' : 'quality flagged'}</b></header><div className={styles.epochBands}>{Object.entries(epoch.absolute_band_powers).map(([band, value]) => <span key={band}><small>{band} absolute</small><strong>{value.toFixed(6)}</strong><small>{((epoch.relative_band_powers[band] ?? 0) * 100).toFixed(2)}% relative</small></span>)}<span><small>theta / beta</small><strong>{epoch.theta_beta_ratio?.toFixed(6) ?? '—'}</strong><small>{epoch.accepted_channels}/4 clean · {epoch.battery_level ?? '—'}% battery</small></span></div><details className={styles.raw}><summary>Show exact raw channel samples and statistics</summary>{Object.entries(epoch.raw_channels).map(([channel, values]) => <div key={channel}><h4>{channel} <small>mean {epoch.channel_statistics[channel]?.mean.toFixed(4)} · SD {epoch.channel_statistics[channel]?.standard_deviation.toFixed(4)} · min {epoch.channel_statistics[channel]?.minimum.toFixed(4)} · max {epoch.channel_statistics[channel]?.maximum.toFixed(4)}</small></h4><code>{values.join(', ')}</code></div>)}</details></article>)}</div></>}</div>}</div>)}</div> : <p>No baseline recordings saved by this account yet.</p>}</section>
  </main>
}
