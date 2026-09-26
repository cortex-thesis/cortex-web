import type { BandPowers } from './museStore'

const SAMPLE_RATE = 256
const EPOCH_SIZE = 1024
const WELCH_SIZE = 512
const WELCH_STEP = 256
const BAND_RANGES: Record<keyof BandPowers, [number, number]> = {
  delta: [1, 4], theta: [4, 8], alpha: [8, 13], beta: [13, 30], gamma: [30, 40],
}

export interface BandAnalysis {
  absolute: BandPowers
  relative: BandPowers
  acceptedChannels: number
}

interface BiquadCoefficients { b0: number; b1: number; b2: number; a1: number; a2: number }

function biquad(kind: 'highpass' | 'lowpass' | 'notch', frequency: number, q: number): BiquadCoefficients {
  const omega = 2 * Math.PI * frequency / SAMPLE_RATE
  const cosine = Math.cos(omega); const sine = Math.sin(omega); const alpha = sine / (2 * q)
  let b0: number; let b1: number; let b2: number
  if (kind === 'lowpass') { b0 = (1 - cosine) / 2; b1 = 1 - cosine; b2 = b0 }
  else if (kind === 'highpass') { b0 = (1 + cosine) / 2; b1 = -(1 + cosine); b2 = b0 }
  else { b0 = 1; b1 = -2 * cosine; b2 = 1 }
  const a0 = 1 + alpha
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cosine) / a0, a2: (1 - alpha) / a0 }
}

function applyBiquad(values: number[], coefficients: BiquadCoefficients) {
  const output = new Array<number>(values.length)
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0
  for (let index = 0; index < values.length; index += 1) {
    const x0 = values[index]
    const y0 = coefficients.b0 * x0 + coefficients.b1 * x1 + coefficients.b2 * x2 - coefficients.a1 * y1 - coefficients.a2 * y2
    output[index] = y0; x2 = x1; x1 = x0; y2 = y1; y1 = y0
  }
  return output
}

function detrend(values: number[]) {
  const count = values.length
  const meanX = (count - 1) / 2
  const meanY = values.reduce((sum, value) => sum + value, 0) / count
  let numerator = 0; let denominator = 0
  for (let index = 0; index < count; index += 1) {
    numerator += (index - meanX) * (values[index] - meanY)
    denominator += (index - meanX) ** 2
  }
  const slope = numerator / (denominator || 1)
  return values.map((value, index) => value - (meanY + slope * (index - meanX)))
}

function hasArtifact(values: number[], minimumSamples = EPOCH_SIZE) {
  if (values.length < minimumSamples || values.some((value) => !Number.isFinite(value))) return true
  let minimum = Infinity; let maximum = -Infinity; let largestStep = 0
  for (let index = 0; index < values.length; index += 1) {
    minimum = Math.min(minimum, values[index]); maximum = Math.max(maximum, values[index])
    if (index) largestStep = Math.max(largestStep, Math.abs(values[index] - values[index - 1]))
  }
  return maximum - minimum < 0.5 || maximum - minimum > 350 || largestStep > 120
}

function fftPower(values: number[]) {
  const size = values.length
  const real = [...values]; const imaginary = new Array<number>(size).fill(0)
  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1
    for (; reversed & bit; bit >>= 1) reversed ^= bit
    reversed ^= bit
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]]
      ;[imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]]
    }
  }
  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length
    for (let start = 0; start < size; start += length) {
      for (let offset = 0; offset < length / 2; offset += 1) {
        const cosine = Math.cos(angle * offset); const sine = Math.sin(angle * offset)
        const even = start + offset; const odd = even + length / 2
        const oddReal = real[odd] * cosine - imaginary[odd] * sine
        const oddImaginary = real[odd] * sine + imaginary[odd] * cosine
        real[odd] = real[even] - oddReal; imaginary[odd] = imaginary[even] - oddImaginary
        real[even] += oddReal; imaginary[even] += oddImaginary
      }
    }
  }
  return real.slice(0, size / 2 + 1).map((value, index) => (value * value + imaginary[index] * imaginary[index]) / size)
}

function welch(values: number[]) {
  const spectrum = new Array<number>(WELCH_SIZE / 2 + 1).fill(0)
  let segments = 0
  for (let start = 0; start + WELCH_SIZE <= values.length; start += WELCH_STEP) {
    const windowed = values.slice(start, start + WELCH_SIZE).map((value, index) => value * (0.5 - 0.5 * Math.cos(2 * Math.PI * index / (WELCH_SIZE - 1))))
    const power = fftPower(windowed)
    power.forEach((value, index) => { spectrum[index] += value })
    segments += 1
  }
  return spectrum.map((value) => value / Math.max(1, segments))
}

const zeroBands = (): BandPowers => ({ delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 })

export function analyzeBands(channels: number[][], epochSamples = EPOCH_SIZE): BandAnalysis | null {
  const powers: BandPowers[] = []
  for (const channel of channels) {
    const requiredSamples = Math.max(WELCH_SIZE, epochSamples)
    const epoch = channel.slice(-requiredSamples)
    if (hasArtifact(epoch, requiredSamples)) continue
    let filtered = detrend(epoch)
    filtered = applyBiquad(filtered, biquad('notch', 60, 30))
    filtered = applyBiquad(filtered, biquad('highpass', 1, Math.SQRT1_2))
    filtered = applyBiquad(filtered, biquad('lowpass', 50, Math.SQRT1_2))
    const spectrum = welch(filtered)
    const channelPowers = zeroBands()
    for (const key of Object.keys(BAND_RANGES) as Array<keyof BandPowers>) {
      const [low, high] = BAND_RANGES[key]
      const firstBin = Math.ceil(low * WELCH_SIZE / SAMPLE_RATE)
      const lastBin = Math.floor(high * WELCH_SIZE / SAMPLE_RATE)
      for (let bin = firstBin; bin < lastBin; bin += 1) channelPowers[key] += spectrum[bin]
    }
    powers.push(channelPowers)
  }
  if (!powers.length) return null
  const linear = zeroBands()
  for (const key of Object.keys(BAND_RANGES) as Array<keyof BandPowers>) linear[key] = powers.reduce((sum, power) => sum + power[key], 0) / powers.length
  const total = Object.values(linear).reduce((sum, value) => sum + value, 0) || 1
  const relative = zeroBands(); const absolute = zeroBands()
  for (const key of Object.keys(BAND_RANGES) as Array<keyof BandPowers>) {
    relative[key] = linear[key] / total
    absolute[key] = Math.log10(Math.max(linear[key], 1e-12))
  }
  return { absolute, relative, acceptedChannels: powers.length }
}
