import { test, expect } from '@playwright/test'

async function fixture(page) {
  await page.addInitScript(() => { localStorage.setItem('cortex:onboarding:v1:teacher:1', 'dismissed'); window.print = () => { window.reportPrintCount = (window.reportPrintCount || 0) + 1 } })
  const states = Object.fromEntries(['focused', 'relaxed', 'distracted', 'overstimulated'].map(state => [state, { percentage: state === 'focused' ? 100 : 0, samples: state === 'focused' ? 1 : 0, average_confidence: 1 }]))
  const classes = [{ id: 7, name: 'Class Alpha With A Long Section Name' }, { id: 8, name: 'Class Beta' }]
  const control = { fail: false, failComparison: false, empty: false, hold: false, gate: null, release: null, calls: [], marker: 'First report' }
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname
    control.calls.push(url.pathname + url.search)
    let body = {}, status = 200
    const selected = Number(url.searchParams.get('class_id') || 7)
    const base = { classes: control.empty ? [] : classes, selected_class_id: control.empty ? null : selected, class_name: control.empty ? null : classes.find(item => item.id === selected).name, selected_school_year: 'all', school_years: [], school_year: '', range: url.searchParams.get('range') || 'month', start_date: '2026-10-01', end_date: '2026-10-28' }
    if (path === '/api/auth/me/') body = { id: 1, name: 'Teacher', role: 'teacher', avatar: null }
    else if (path.startsWith('/api/teacher/reports/')) {
      if (control.hold) { control.hold = false; await new Promise(resolve => { control.release = resolve }) }
      if (control.fail) { status = 503; body = { detail: 'Temporarily unavailable.' } }
      else if (path.includes('/advanced/')) body = { ...base, generated_at: '2026-10-28T00:00:00Z', overall: { session_count: 1, sample_count: 1, first_sample_at: null, last_sample_at: null, states }, lessons: [{ id: 9, title: control.marker, session_count: 1, student_count: 1, states, slides: [] }], students: [] }
      else body = { ...base, students: [{ id: 1, name: 'Learner With A Long Name' }], selected_student_id: null, selected_student_name: null, prepared_by: control.marker, summary: { sessions: 1, participating_students: 1, average_focus_percentage: null, focused_duration_seconds: 0, total_duration_seconds: 60, mode_changes: 0, tasks_completed: 1 }, state_distribution: Object.fromEntries(Object.keys(states).map(state => [state, 0])), sessions: control.empty ? [] : [{ id: 'r1', date: '2026-10-28', student: { name: 'Learner With A Long Name' }, duration_seconds: 60, focus_percentage: null, tasks_completed: 1, mode_changes: 0 }] }
    } else if (/\/teacher\/classes\/7\/analytics\//.test(path)) {
      if (control.fail) { status = 503; body = { detail: 'Analytics unavailable.' } }
      else body = { class: { id: 7, name: classes[0].name }, student_count: control.empty ? 0 : 1, session_count: 1, active_sessions: 0, average_focus: null, completion_rate: 50, state_distribution: {}, students: control.empty ? [] : [{ id: 1, name: 'Learner With A Long Name', average_focus: null }], timeline: [], slides: [], lessons: [{ id: 9, title: 'Lesson one' }, { id: 10, title: 'Lesson two' }], selected_lesson_id: Number(url.searchParams.get('lesson_id') || 9) }
    } else if (path === '/api/teacher/dashboard/') { if (control.failComparison) { status = 503; body = { detail: 'Comparison unavailable.' } } else body = { classes, state_distribution: {}, average_focus: null, comparison: null, reporting: { sample_count: 0, measured_sessions: 0 } } }
    else if (path === '/api/classes/7/') body = { id: 7, name: classes[0].name, status: 'active', code: 'CODE7', packages: [], student_count: 1 }
    else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 }
    else if (path.includes('interventions')) body = { interventions: [] }
    else if (path === '/api/sync/status/') body = { enabled: false }
    await route.fulfill({ status, json: body })
  })
  return control
}

for (const width of [360, 768, 1024, 1440]) test(`reports and analytics render missing data and fit at ${width}`, async ({ page }) => {
  await fixture(page)
  await page.setViewportSize({ width, height: 1000 })
  for (const path of ['/teacher/reports?school_year=all', '/teacher/reports/advanced?school_year=all', '/teacher/class/7/analytics']) {
    await page.goto(path)
    if (path.includes('/analytics')) await expect(page.getByRole('heading', { name: 'Average focus by student', exact: true })).toBeVisible()
    else if (path.includes('/advanced')) await expect(page.locator('summary strong').filter({ hasText: 'First report' })).toBeVisible()
    else { await expect(page.getByText('No EEG data', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled() }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `../.runtime/batch7-${width}-${path.includes('/analytics') ? 'analytics' : path.includes('/advanced') ? 'advanced' : 'report'}.png`, fullPage: true })
  }
})

for (const advanced of [false, true]) test(`${advanced ? 'advanced' : 'general'} report recovers from initial failure and reloads fresh data`, async ({ page }) => {
  const control = await fixture(page)
  control.fail = true
  await page.goto(`/teacher/reports${advanced ? '/advanced' : ''}?school_year=all`)
  await expect(page.getByRole('alert')).toBeVisible()
  control.fail = false; control.marker = 'Fresh report'
  await page.getByRole('button', { name: 'Retry report', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(advanced ? page.locator('summary strong').filter({ hasText: 'Fresh report' }) : page.getByText('Fresh report', { exact: false })).toBeVisible()
  control.marker = 'Second visit'
  await page.reload()
  await expect(advanced ? page.locator('summary strong').filter({ hasText: 'Second visit' }) : page.getByText('Second visit', { exact: false })).toBeVisible()
})

test('print follows current displayed filters and stays disabled during replacement loading or failure', async ({ page }) => {
  const control = await fixture(page)
  await page.goto('/teacher/reports?school_year=all')
  const print = page.getByRole('button', { name: 'Print / Save PDF', exact: true })
  await expect(print).toBeEnabled()
  await print.click()
  expect(await page.evaluate(() => window.reportPrintCount)).toBe(1)
  control.hold = true; control.fail = true
  await page.getByLabel('Report period', { exact: true }).selectOption('week')
  await expect.poll(() => Boolean(control.release)).toBe(true)
  try { await expect(print).toBeDisabled(); await expect(page.getByText('No EEG data', { exact: true })).toHaveCount(0) } finally { control.release() }
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(print).toBeDisabled()
  control.fail = false
  await page.getByRole('button', { name: 'Retry report', exact: true }).click()
  await expect(print).toBeEnabled()
  expect(control.calls.some(path => path.includes('range=week'))).toBe(true)
  await page.getByLabel('Class', { exact: true }).selectOption('8')
  await expect(page.getByRole('heading', { name: 'Class Beta', exact: true })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('heading', { name: 'Class Beta', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Class Alpha With A Long Section Name', exact: true })).toHaveCount(0)
  await page.pdf({ path: '../.runtime/batch7-filtered-report.pdf', format: 'A4' })
})

test('late report response cannot replace the newly selected class', async ({ page }) => {
  const control = await fixture(page)
  await page.goto('/teacher/reports?school_year=all')
  await expect(page.getByRole('button', { name: 'Print / Save PDF', exact: true })).toBeEnabled()
  control.hold = true
  await page.getByLabel('Report period', { exact: true }).selectOption('week')
  await expect.poll(() => Boolean(control.release)).toBe(true)
  await page.getByLabel('Class', { exact: true }).selectOption('8')
  await expect(page.getByRole('heading', { name: 'Class Beta', exact: true })).toBeVisible()
  control.release()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('heading', { name: 'Class Beta', exact: true })).toBeVisible()
})

test('class analytics supports retry, empty membership and an unmatched search state', async ({ page }) => {
  const control = await fixture(page)
  control.fail = true
  await page.goto('/teacher/class/7/analytics')
  await expect(page.getByRole('button', { name: 'Retry analytics', exact: true })).toBeVisible()
  control.fail = false
  await page.getByRole('button', { name: 'Retry analytics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Average focus by student', exact: true })).toBeVisible()
  await page.getByPlaceholder('Search by name', { exact: true }).fill('Nobody')
  await expect(page.getByText('No students match this search.', { exact: true })).toBeVisible()
  control.empty = true
  await page.reload()
  await expect(page.getByText('No enrolled students.', { exact: true })).toBeVisible()
})


test('comparison retry preserves the selected lesson and class analytics', async ({ page }) => {
  const control = await fixture(page)
  control.failComparison = true
  await page.goto('/teacher/class/7/analytics')
  await expect(page.getByRole('button', { name: 'Retry comparison', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Lesson', exact: true }).selectOption('10')
  await expect.poll(() => control.calls.some(path => path.includes('lesson_id=10'))).toBe(true)
  control.failComparison = false
  const analyticsCalls = control.calls.filter(path => path.includes('/analytics/')).length
  await page.getByRole('button', { name: 'Retry comparison', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry comparison', exact: true })).toHaveCount(0)
  await expect(page.getByText('Choose Monthly to compare with the previous period.', { exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Lesson', exact: true })).toHaveValue('10')
  expect(control.calls.filter(path => path.includes('/analytics/'))).toHaveLength(analyticsCalls)
})
