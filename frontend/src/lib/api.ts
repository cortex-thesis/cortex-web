const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const GET_CACHE_TTL_MS = 5 * 60_000
const SESSION_CACHE_PREFIX = 'cortex-api:'
const getCache = new Map<string, { expiresAt: number; value: unknown }>()
const pendingGets = new Map<string, Promise<unknown>>()

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function csrfToken(): string {
  const match = document.cookie.split('; ').find((item) => item.startsWith('csrftoken='))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
}

export function cachedApiValue<T>(path: string): T | undefined {
  if (path.startsWith('/auth/')) return undefined
  try {
    const raw = localStorage.getItem(`${SESSION_CACHE_PREFIX}${path}`)
    if (!raw) return undefined
    const item = JSON.parse(raw) as { expiresAt: number; value: T }
    if (item.expiresAt <= Date.now()) {
      localStorage.removeItem(`${SESSION_CACHE_PREFIX}${path}`)
      return undefined
    }
    return item.value
  } catch {
    return undefined
  }
}

function clearSessionCache() {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(SESSION_CACHE_PREFIX)) localStorage.removeItem(key)
  }
}

export function primeApiCache(path: string, value: unknown) {
  const expiresAt = Date.now() + GET_CACHE_TTL_MS
  getCache.set(path, { expiresAt, value })
  try { localStorage.setItem(`${SESSION_CACHE_PREFIX}${path}`, JSON.stringify({ expiresAt, value })) } catch { /* Storage may be unavailable. */ }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  if (method === 'GET') {
    const cached = getCache.get(path)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T
    const stored = cachedApiValue<T>(path)
    if (stored !== undefined) {
      getCache.set(path, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value: stored })
      return stored
    }
    const pending = pendingGets.get(path)
    if (pending) return pending as Promise<T>
  } else {
    // Mutations can affect dashboard counts, rosters, notifications, and profiles.
    getCache.clear()
    clearSessionCache()
  }
  const request = performRequest<T>(path, options, headers, method)
  if (method !== 'GET') return request
  pendingGets.set(path, request)
  try {
    const value = await request
    if (!path.startsWith('/auth/')) primeApiCache(path, value)
    else getCache.set(path, { expiresAt: Date.now() + GET_CACHE_TTL_MS, value })
    return value
  } finally {
    pendingGets.delete(path)
  }
}

async function performRequest<T>(path: string, options: RequestInit, headers: Headers, method: string): Promise<T> {
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) headers.set('X-CSRFToken', csrfToken())
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' })
  const payload = (response.headers.get('content-type') ?? '').includes('application/json')
    ? await response.json()
    : null
  if (!response.ok) {
    const fallback = response.status === 404
      ? 'The requested backend endpoint was not found. Restart Django and try again.'
      : response.status >= 500
        ? 'The backend encountered an error. Check the Django terminal for details.'
        : `Request failed (${response.status} ${response.statusText}).`
    throw new ApiError(payload?.detail ?? fallback, response.status)
  }
  return payload as T
}
