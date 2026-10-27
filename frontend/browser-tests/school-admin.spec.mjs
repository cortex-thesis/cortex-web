import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const school = 'Cortex School With A Long Institution Name'
const teachers = [
  { id: 11, name: 'Pending Teacher', username: 'pending', email: 'pending.teacher@example.test', role: 'teacher', account_status: 'pending', school },
  { id: 12, name: 'Approved Teacher With A Long Name', username: 'approved', email: 'approved.teacher@example.test', role: 'teacher', account_status: 'active', school },
  { id: 21, name: 'Enrolled Student', username: 'student', email: 'student@example.test', role: 'student', account_status: 'active', school },
]
async function fixture(page, { role = 'admin', errorOnce = false, empty = false, delayApproval = false } = {}) {
  let accounts = empty ? [] : structuredClone(teachers), fail = errorOnce, release
  const calls = []
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    calls.push({ path, method: req.method(), query: url.search, body: req.method() === 'PATCH' ? req.postDataJSON() : null })
    let status = 200, body = {}
    if (path === '/api/auth/me/') body = { id: 1, name: 'School Administrator', role, admin_scope: role === 'admin' ? 'school' : 'none', school }
    else if (path === '/api/admin/accounts/') {
      if (fail) { fail = false; status = 503; body = { detail: 'Directory temporarily unavailable.' } }
      else body = { accounts }
    } else if (/\/api\/admin\/accounts\/\d+\/status\/$/.test(path)) {
      if (delayApproval) await new Promise(resolve => { release = resolve })
      const person = accounts.find(item => item.id === Number(path.split('/').at(-3)))
      person.account_status = req.postDataJSON().status
      body = person
    } else if (path === '/api/admin/dashboard/') body = { administrator: { id: 1, name: 'School Administrator', school }, classes: [{ id: 7, name: 'A Class With A Long Descriptive Section Name', code: 'CODE123', teacher: { name: teachers[1].name }, student_count: 3, session_count: 1, school_year: '', average_focus: 60, average_completion: 80 }], pending_teachers: accounts.filter(item => item.role === 'teacher' && item.account_status === 'pending').length, class_count: 1, teacher_count: 1, student_count: 3, total_sessions: 1, active_sessions: 0, average_focus: 60, average_completion: 80 }
    else if (path === '/api/admin/school-years/') body = { school_years: [] }
    else if (path === '/api/classes/') body = { classes: [{ id: 7, name: 'A Class With A Long Descriptive Section Name', teacher: { name: teachers[1].name }, student_count: 3, code: 'CODE123', status: 'active' }] }
    else if (path.includes('/reports/')) {
      const states = Object.fromEntries(['focused','relaxed','distracted','overstimulated'].map(key => [key, 25]))
      body = { school_years: [], selected_school_year: 'all', classes: empty ? [] : [{ id: 7, name: 'Class Report' }], students: [], selected_class_id: empty ? null : 7, selected_student_id: null, selected_student_name: null, class_name: empty ? null : 'Class Report', school_year: '', range: 'month', start_date: null, end_date: '2026-10-27', prepared_by: teachers[1].name,
        summary: { sessions: 1, participating_students: 1, average_focus_percentage: 60, focused_duration_seconds: 36, total_duration_seconds: 60, mode_changes: 0, tasks_completed: 1 }, state_distribution: states,
        sessions: [{ id: 'session-1', date: '2026-10-27', student: { name: 'Enrolled Student' }, duration_seconds: 60, focus_percentage: 60, tasks_completed: 1, mode_changes: 0 }],
        generated_at: '2026-10-27T08:00:00Z', lessons: [], overall: { session_count: 1, sample_count: 0, first_sample_at: null, last_sample_at: null, states: Object.fromEntries(Object.keys(states).map(key => [key, { samples: 0, percentage: 0, average_confidence: 0 }])) } }
    } else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 }
    else if (path.includes('class-sessions')) body = { sessions: [] }
    else if (path === '/api/sync/status/') body = { enabled: false }
    await route.fulfill({ status, json: body })
  })
  return { calls, register() { accounts.push({ ...teachers[0], id: 13, username: 'new', name: 'Newly Registered Teacher', email: 'new.teacher@example.test' }) }, release() { release?.() } }
}

test('fresh registration appears after focus refresh; pending approval is explicit and duplicate submissions are blocked', async ({ page }) => {
  const state = await fixture(page, { delayApproval: true })
  await page.goto('/school-admin/teachers?status=pending')
  await expect(page.getByRole('button', { name: 'Approve Pending Teacher', exact: true })).toBeVisible()
  state.register()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  const approve = page.getByRole('button', { name: 'Approve Newly Registered Teacher', exact: true })
  await expect(approve).toBeVisible()
  await approve.click(); await expect(approve).toBeDisabled()
  await approve.evaluate(button => { button.click(); button.click() })
  await expect.poll(() => state.calls.filter(item => item.method === 'PATCH').length).toBe(1)
  state.release()
  await expect(page.getByRole('status')).toContainText('Newly Registered Teacher was approved')
  await expect(approve).toHaveCount(0)
  await page.getByLabel('Account status', { exact: true }).selectOption('all')
  await expect(page.getByLabel('Status for Newly Registered Teacher', { exact: true })).toHaveValue('active')
})

test('rejection disables the pending account without deleting its records', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/school-admin/teachers?status=pending')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reject Pending Teacher', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('registration was rejected')
  expect(state.calls.find(item => item.method === 'PATCH').body).toEqual({ status: 'disabled' })
  expect(state.calls.some(item => item.method === 'DELETE')).toBe(false)
})

test('directory loading, backend failure, retry and empty states are distinct', async ({ page }) => {
  await fixture(page, { errorOnce: true, empty: true })
  await page.goto('/school-admin/teachers')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('No matching teachers found.', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('No matching teachers found.', { exact: true })).toBeVisible()
})

for (const width of [360, 768, 1024, 1440]) test(`school administrator layouts, forms, approval links and read-only reports at ${width}`, async ({ page }) => {
  const state = await fixture(page)
  await page.setViewportSize({ width, height: 900 })
  await page.addInitScript(() => { window.__prints = 0; window.print = () => { window.__prints++ } })
  for (const [path, title] of [['/school-admin/dashboard', school], ['/school-admin/teachers', 'Teachers'], ['/school-admin/students', 'Students'], ['/school-admin/classes', 'All classes'], ['/school-admin/teachers/12/reports', 'Class engagement report'], ['/school-admin/teachers/12/reports/advanced', 'Advanced reports']]) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    if (path.endsWith('/teachers') || path.endsWith('/students')) {
      await page.getByRole('button', { name: path.endsWith('/teachers') ? 'Add teacher' : 'Add student', exact: true }).click()
      await expect(page.getByLabel('Full name', { exact: true })).toBeVisible()
      expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([])
    }
    if (path === '/school-admin/dashboard') await expect(page.getByRole('link', { name: /awaiting approval/ })).toHaveAttribute('href', '/school-admin/teachers?status=pending')
    if (path.includes('/reports')) {
      await expect(page.getByText('Read-only teacher report', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: /edit|save changes|delete report|view interventions/i })).toHaveCount(0)
      if (!path.endsWith('advanced')) {
        await expect(page.getByRole('heading', { name: 'Class Report', exact: true })).toBeVisible()
        await page.getByRole('button', { name: 'Print / Save PDF', exact: true }).click()
        expect(await page.evaluate(() => window.__prints)).toBe(1)
        await expect(page.getByRole('columnheader', { name: 'Interventions', exact: true })).toHaveCount(0)
        await page.getByRole('button', { name: 'Advanced reports', exact: true }).click()
        await expect(page).toHaveURL(/\/school-admin\/teachers\/12\/reports\/advanced\?school_year=all$/)
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `../.runtime/batch4-${width}-${title.includes('report') ? 'reports' : path.split('/').at(-1)}.png`, fullPage: true })
  }
  expect(state.calls.filter(item => item.path.includes('/reports/') && item.method !== 'GET')).toEqual([])
})

test('school report links use the selected teacher and failures never expose another teacher report', async ({ page }) => {
  await fixture(page)
  await page.goto('/school-admin/teachers')
  await page.getByRole('link', { name: 'View reports for Approved Teacher With A Long Name', exact: true }).click()
  await expect(page).toHaveURL(/\/school-admin\/teachers\/12\/reports/)
  await page.route('**/api/school-admin/teachers/99/reports/**', route => route.fulfill({ status: 404, json: { detail: 'Teacher not found.' } }))
  await page.goto('/school-admin/teachers/99/reports')
  await expect(page.getByRole('alert')).toHaveText('Teacher not found.')
  await expect(page.getByRole('heading', { name: 'Class Report', exact: true })).toHaveCount(0)
})

test('directory shows loading before an approval list arrives', async ({ page }) => {
  await fixture(page)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/admin/accounts/', async route => { await gate; await route.fallback() })
  await page.goto('/school-admin/teachers')
  try {
    await expect(page.getByText('Loading teachers...', { exact: true })).toBeVisible()
    await expect(page.getByText('No matching teachers found.', { exact: true })).toHaveCount(0)
  } finally { release() }
  await expect(page.getByRole('button', { name: 'Approve Pending Teacher', exact: true })).toBeVisible()
})

test('read-only reports show loading and a clear empty state without enabling export', async ({ page }) => {
  await fixture(page, { empty: true })
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/school-admin/teachers/12/reports/**', async route => { await gate; await route.fallback() })
  await page.goto('/school-admin/teachers/12/reports')
  try {
    await expect(page.getByRole('status', { name: 'Loading content', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled()
  } finally { release() }
  await expect(page.getByRole('heading', { name: 'No classes for this school year', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeDisabled()
})
