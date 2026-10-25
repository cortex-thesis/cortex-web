import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'

test('automatic reconnection retains partial and completed calibration and rejects old readings', async () => {
  const source = await readFile(new URL('../src/store/museStore.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
  const clients = []
  let now = 10000
  let cleanSignal = true
  const readingBands = { delta: .1, theta: .2, alpha: .3, beta: .3, gamma: .1 }
  class Client {
    eegReadings = { subscribe: callback => { this.read = callback; return { unsubscribe() {} } } }
    telemetryData = { subscribe: () => ({ unsubscribe() {} }) }
    connectionStatus = { subscribe: () => ({ unsubscribe() {} }) }
    async connect() {}
    async start() {}
    disconnect() {}
    constructor() { clients.push(this) }
  }
  const create = initialize => {
    let state
    const set = update => { state = { ...state, ...update } }
    state = initialize(set, () => state)
    return { getState: () => state, setState: set }
  }
  const code = outputText.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')
  const store = new Function('create', 'MuseClient', 'MUSE_SERVICE', 'analyzeBands', 'window', 'navigator', 'Date', `${code}; return useMuseStore`)(
    create, Client, 'muse', () => cleanSignal ? { absolute: readingBands, relative: readingBands, acceptedChannels: 4 } : null, { isSecureContext: true },
    { bluetooth: { requestDevice: async () => ({ gatt: { connect: async () => ({ disconnect() {} }) } }) } },
    { now: () => now },
  )
  try {
    await store.getState().connect()
    for (const count of [12, 30]) {
      const baselineSamples = Array.from({ length: count }, () => ({ delta: .1, theta: .2, alpha: .3, beta: .3, gamma: .1 }))
      const progress = Math.round(count / 30 * 100)
      store.setState({ baselineSamples, baselineProgress: progress, bandHistory: [baselineSamples[0]], acceptedChannels: 4 })
      const oldClient = clients.at(-1)
      await store.getState().connect(true)
      assert.deepEqual(store.getState().baselineSamples, baselineSamples)
      assert.equal(store.getState().baselineProgress, progress)
      assert.equal(store.getState().bandHistory.length, 1)
      assert.equal(store.getState().acceptedChannels, 0)
      assert.deepEqual(store.getState().samples, [[], [], [], []])
      oldClient.read({ electrode: 0, samples: [1, 2, 3] })
      assert.deepEqual(store.getState().samples, [[], [], [], []])
      store.setState({ status: 'error' })
      await store.getState().connect()
      assert.equal(store.getState().baselineProgress, progress)
      assert.deepEqual(store.getState().baselineSamples, baselineSamples)
      const freshClient = clients.at(-1)
      for (let electrode = 0; electrode < 4; electrode++) {
        now += 600
        freshClient.read({ electrode, samples: Array.from({ length: 1024 }, (_, index) => Math.sin(index) * 10) })
      }
      const expectedCount = Math.min(30, count + 1)
      assert.equal(store.getState().baselineSamples.length, expectedCount)
      assert.equal(store.getState().baselineProgress, Math.round(expectedCount / 30 * 100))
      cleanSignal = false
      now += 600
      freshClient.read({ electrode: 0, samples: [0] })
      assert.equal(store.getState().acceptedChannels, 0)
      assert.equal(store.getState().baselineSamples.length, expectedCount)
      cleanSignal = true
    }
  } finally {
    store.getState().disconnect()
  }
  assert.equal(store.getState().baselineProgress, 0)
  assert.deepEqual(store.getState().baselineSamples, [])
})
