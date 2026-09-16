import { create } from 'zustand'
import { MUSE_SERVICE, MuseClient, type EEGReading, type TelemetryData } from 'muse-js'
import type { Subscription } from 'rxjs'
import { analyzeBands } from './museDsp'

export const MUSE_CHANNELS = ['TP9', 'AF7', 'AF8', 'TP10'] as const
export type MuseConnectionState = 'idle' | 'requesting' | 'connecting' | 'streaming' | 'error'
export type BandPowers = { delta: number; theta: number; alpha: number; beta: number; gamma: number }

interface MuseState {
  client: MuseClient | null
  subscriptions: Subscription[]
  status: MuseConnectionState
  deviceName: string
  error: string
  battery: number | null
  samples: number[][]
  quality: number[]
  bands: BandPowers
  absoluteBands: BandPowers
  relativeBands: BandPowers
  bandHistory: BandPowers[]
  baselineProgress: number
  acceptedChannels: number
  connectedAt: number | null
  connect: (automatic?: boolean) => Promise<void>
  disconnect: () => void
}

const emptySamples = () => MUSE_CHANNELS.map(() => [] as number[])
const emptyBands: BandPowers = { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 }

let savedGatt: BluetoothRemoteGATTServer | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let connectionGeneration = 0

async function requestMuseGatt() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: [MUSE_SERVICE] },
      { namePrefix: 'Muse' },
      { namePrefix: 'MUSE' },
      { namePrefix: 'muse' },
    ],
    optionalServices: [MUSE_SERVICE],
  })
  if (!device.gatt) throw new Error('The selected Bluetooth device does not provide a GATT connection.')
  savedGatt = device.gatt
  return device.gatt.connect()
}

function contactQuality(values: number[]) {
  if (values.length < 96) return 0
  const recent = values.slice(-128).filter(Number.isFinite)
  if (recent.length < 120) return 0
  const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length
  const variance = recent.reduce((sum, value) => sum + (value - mean) ** 2, 0) / recent.length
  const deviation = Math.sqrt(variance)
  if (deviation >= 2 && deviation <= 180) return 2
  if (deviation > 0.3 && deviation <= 350) return 1
  return 0
}

export const useMuseStore = create<MuseState>((set, get) => ({
  client: null, subscriptions: [], status: 'idle', deviceName: '', error: '', battery: null,
  samples: emptySamples(), quality: [0, 0, 0, 0], bands: emptyBands, absoluteBands: emptyBands,
  relativeBands: emptyBands, bandHistory: [], baselineProgress: 0, acceptedChannels: 0, connectedAt: null,
  connect: async (automatic = false) => {
    if (!window.isSecureContext || !('bluetooth' in navigator)) {
      set({ status: 'error', error: 'Web Bluetooth is unavailable. Use Chrome or Edge on HTTPS/localhost, or Chrome on Android. iPhone and iPad browsers cannot connect directly.' })
      return
    }
    if (!automatic) { get().disconnect(); reconnectAttempts = 0 }
    else {
      get().subscriptions.forEach(subscription => subscription.unsubscribe())
      get().client?.disconnect()
      set({ subscriptions: [] })
    }
    const generation = ++connectionGeneration
    const retry = () => {
      if (generation !== connectionGeneration) return
      if (savedGatt && reconnectAttempts < 3) {
        const delay = 1000 * 2 ** reconnectAttempts++
        set({ status: 'connecting', error: '', acceptedChannels: 0 })
        reconnectTimer = setTimeout(() => { reconnectTimer = null; void get().connect(true) }, delay)
      } else set({ status: 'error', error: 'Automatic reconnection failed. Turn on Muse 2 and choose it again.', acceptedChannels: 0 })
    }
    const client = new MuseClient()
    set({ client, status: automatic ? 'connecting' : 'requesting', error: '', samples: emptySamples(), quality: [0, 0, 0, 0], bands: emptyBands, absoluteBands: emptyBands, relativeBands: emptyBands, bandHistory: [], baselineProgress: 0, acceptedChannels: 0 })
    try {
      const gatt = automatic && savedGatt ? await savedGatt.connect() : await requestMuseGatt()
      if (generation !== connectionGeneration) { gatt.disconnect(); return }
      await client.connect(gatt)
      if (generation !== connectionGeneration) { client.disconnect(); return }
      set({ status: 'connecting', deviceName: client.deviceName || 'Muse 2' })
      await client.start()
      if (generation !== connectionGeneration) { client.disconnect(); return }
      let liveSamples = emptySamples()
      let lastPublish = 0
      let lastAnalysis = 0
      const baselineSamples: BandPowers[] = []
      const smoothedScores = { delta: 1, theta: 1, alpha: 1, beta: 1, gamma: 1 }
      const eeg = client.eegReadings.subscribe((reading: EEGReading) => {
        if (reading.electrode < 0 || reading.electrode >= MUSE_CHANNELS.length) return
        // Retain 30 seconds so the baseline recorder can produce every epoch
        // length offered by the protocol (Muse 2 streams at 256 Hz).
        liveSamples = liveSamples.map((values, index) => index === reading.electrode ? [...values, ...reading.samples].slice(-7680) : values)
        const now = Date.now()
        if (now - lastPublish < 80) return
        const quality = liveSamples.map(contactQuality)
        const shouldAnalyze = now - lastAnalysis >= 500 && liveSamples.every((values) => values.length >= 1024)
        const analysis = shouldAnalyze ? analyzeBands(liveSamples) : null
        let { bands, absoluteBands, relativeBands, bandHistory, baselineProgress, acceptedChannels } = get()
        if (shouldAnalyze) lastAnalysis = now
        if (analysis) {
          if (baselineSamples.length < 30) baselineSamples.push(analysis.relative)
          const baseline = { ...emptyBands }
          for (const key of Object.keys(baseline) as Array<keyof BandPowers>) baseline[key] = baselineSamples.reduce((sum, sample) => sum + sample[key], 0) / baselineSamples.length
          const nextScores = { ...emptyBands }
          for (const key of Object.keys(nextScores) as Array<keyof BandPowers>) {
            const ratio = analysis.relative[key] / Math.max(baseline[key], 1e-6)
            nextScores[key] = Math.min(2.5, Math.max(0.25, ratio))
            smoothedScores[key] += (nextScores[key] - smoothedScores[key]) * 0.25
          }
          bands = Object.fromEntries(Object.entries(smoothedScores).map(([key, value]) => [key, Number(value.toFixed(3))])) as BandPowers
          absoluteBands = analysis.absolute
          relativeBands = analysis.relative
          bandHistory = [...bandHistory, bands].slice(-120)
          baselineProgress = Math.round(baselineSamples.length / 30 * 100)
          acceptedChannels = analysis.acceptedChannels
        } else if (shouldAnalyze) acceptedChannels = 0
        lastPublish = now
        set({ samples: liveSamples, quality, bands, absoluteBands, relativeBands, bandHistory, baselineProgress, acceptedChannels })
      })
      const telemetry = client.telemetryData.subscribe((value: TelemetryData) => set({ battery: Math.round(value.batteryLevel) }))
      const connection = client.connectionStatus.subscribe((connected) => {
        if (!connected && get().status === 'streaming') retry()
      })
      reconnectAttempts = 0
      set({ status: 'streaming', connectedAt: Date.now(), subscriptions: [eeg, telemetry, connection] })
    } catch (reason) {
      client.disconnect()
      if (generation !== connectionGeneration) return
      if (automatic) { retry(); return }
      const message = reason instanceof Error && reason.name === 'NotFoundError' ? 'Bluetooth selection was cancelled.' : reason instanceof Error ? reason.message : 'Unable to connect to Muse 2.'
      set({ status: 'error', error: message, client: null })
    }
  },
  disconnect: () => {
    connectionGeneration++
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = null
    savedGatt = null
    reconnectAttempts = 0
    const { client, subscriptions } = get()
    subscriptions.forEach((subscription) => subscription.unsubscribe())
    client?.disconnect()
    set({ client: null, subscriptions: [], status: 'idle', deviceName: '', battery: null, connectedAt: null, samples: emptySamples(), quality: [0, 0, 0, 0], bands: emptyBands, absoluteBands: emptyBands, relativeBands: emptyBands, bandHistory: [], baselineProgress: 0, acceptedChannels: 0 })
  },
}))
