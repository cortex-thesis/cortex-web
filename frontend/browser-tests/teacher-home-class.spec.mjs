import { test, expect } from '@playwright/test'

const teacher = { id: 1, name: 'Teacher', role: 'teacher', school: 'School', avatar: null }
const student = { id: 4, name: 'Student With A Very Long Name That Must Wrap Within The Available Space', avatar: null, role: 'student' }
const schoolClass = { id: 7, name: 'Class with a long section label', code: 'CLASS7', status: 'active', student_count: 1, school_year: '2031-2032' }
async function fixture(page, { empty = false, dashboardError = false, missingYear = false } = {}) {
  await page.addInitScript(() => localStorage.setItem('cortex:onboarding:v1:teacher:1', 'dismissed'))
  const calls = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let status = 200, body = {}
    if (path === '/api/auth/me/') body = teacher
    else if (path === '/api/teacher/class-year/') { status = missingYear ? 400 : 200; body = missingYear ? { detail: 'No current school year is configured. Ask your School Admin to activate a school year, then refresh this form.' } : { school_year: '2031-2032' } }
    else if (path === '/api/classes/' && route.request().method() === 'POST') { calls.push(route.request().postDataJSON()); body = { ...schoolClass, ...route.request().postDataJSON() }; status = 201 }
    else if (path === '/api/teacher/dashboard/') {
      status = dashboardError ? 503 : 200
      body = dashboardError ? { detail: 'Dashboard temporarily unavailable.' } : { teacher, classes: [schoolClass], class_count: 1, student_count: 1, total_sessions: empty ? 0 : 1, active_sessions: 0, unread_notifications: 0, average_focus: null, state_distribution: { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0 }, live_sessions: [], recent_badges: [], comparison: null,
        reporting: { generated_at: '2026-10-28T00:00:00Z', start: null, end_exclusive: null, sample_count: 0, measured_sessions: 0 },
        recent_sessions: empty ? [] : [{ id: 'session-1', class_id: 7, class_name: schoolClass.name, student, lesson: 'Lesson With A Very Long Name That Needs To Wrap Gracefully', description: 'DESCRIPTION_MUST_NOT_APPEAR', started_at: '2026-10-28T00:00:00Z', ended_at: '2026-10-28T00:01:00Z', completion_percentage: 75 }] }
    } else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 }
    else if (path === '/api/sync/status/') body = { enabled: false }
    await route.fulfill({ status, json: body })
  })
  return calls
}

for (const width of [360, 768, 1024, 1440]) test(`homepage sessions and class creation at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 })
  const calls = await fixture(page)
  await page.goto('/teacher/dashboard')
  const region = page.getByRole('region', { name: 'Recent student sessions', exact: true })
  await expect(region.getByRole('link', { name: student.name, exact: true })).toBeVisible()
  await expect(region).toContainText('75%')
  await expect(region.locator('article').first()).toHaveCSS('min-height', '0px')
  await expect(region.locator('article').first()).toHaveCSS('align-items', 'flex-start')
  await expect(region.getByRole('link', { name: schoolClass.name, exact: true })).toHaveAttribute('href', '/teacher/class/7/overview')
  await expect(region.getByRole('link', { name: student.name, exact: true })).toHaveAttribute('href', '/teacher/class/7/student/4?session=session-1')
  await expect(region.locator('svg')).not.toHaveCount(0)
  await expect(page.getByText('DESCRIPTION_MUST_NOT_APPEAR')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `../.runtime/batch5-${width}-homepage.png`, fullPage: true })
  await page.goto('/teacher/classes/new')
  const year = page.getByLabel('School year', { exact: false })
  await expect(year).toHaveValue('2031-2032')
  await expect(year).toHaveAttribute('readonly', '')
  await page.getByLabel('Class name', { exact: true }).fill('My new class')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `../.runtime/batch5-${width}-class.png`, fullPage: true })
  await page.getByRole('button', { name: 'Create class', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Class created', exact: true })).toBeVisible()
  await expect(page.getByText('School year: 2031-2032.', { exact: false })).toBeVisible()
  expect(calls).toEqual([{ name: 'My new class', description: '' }])
})

test('missing school year blocks creation and refresh recovers without losing entered name', async ({ page }) => {
  const calls = await fixture(page, { missingYear: true })
  await page.goto('/teacher/classes/new')
  await expect(page.getByRole('alert')).toContainText('School Admin')
  await page.getByLabel('Class name', { exact: true }).fill('Keep this name')
  await expect(page.getByRole('button', { name: 'Create class', exact: true })).toBeDisabled()
  await page.route('**/api/teacher/class-year/', route => route.fulfill({ json: { school_year: '2032-2033' } }))
  await page.getByRole('button', { name: 'Refresh school year', exact: true }).click()
  await expect(page.getByLabel('School year', { exact: false })).toHaveValue('2032-2033')
  await expect(page.getByRole('button', { name: 'Create class', exact: true })).toBeEnabled()
  await expect(page.getByLabel('Class name', { exact: true })).toHaveValue('Keep this name')
  expect(calls).toEqual([])
})

test('creation rejection retains form values; pending request prevents duplicate submission', async ({ page }) => {
  await fixture(page)
  let release, count = 0
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/classes/', async route => { count++; await gate; await route.fulfill({ status: 400, json: { detail: 'No current school year is configured. Ask your School Admin to activate a school year.' } }) })
  await page.goto('/teacher/classes/new')
  await page.getByLabel('Class name', { exact: true }).fill('Retained name')
  await expect(page.getByRole('button', { name: 'Create class', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Create class', exact: true }).dblclick()
  try { await expect(page.getByRole('button', { name: 'Creating', exact: false })).toBeDisabled(); expect(count).toBe(1) } finally { release() }
  await expect(page.getByRole('alert')).toContainText('School Admin')
  await expect(page.getByLabel('Class name', { exact: true })).toHaveValue('Retained name')
  await expect(page.getByRole('button', { name: 'Create class', exact: true })).toBeEnabled()
})

test('recent sessions loading becomes empty; fetch errors do not masquerade as empty', async ({ page }) => {
  await fixture(page, { empty: true })
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/teacher/dashboard/**', async route => { await gate; await route.fallback() })
  await page.goto('/teacher/dashboard')
  try { await expect(page.getByText('Loading sessions...', { exact: true })).toBeVisible(); await expect(page.getByText('No student sessions yet.', { exact: true })).toHaveCount(0) } finally { release() }
  await expect(page.getByText('No student sessions yet.', { exact: true })).toBeVisible()
  await page.unroute('**/api/teacher/dashboard/**')
  await fixture(page, { dashboardError: true })
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'Unable to load recent sessions.' })).toBeVisible()
  await expect(page.getByText('No student sessions yet.', { exact: true })).toHaveCount(0)
})
