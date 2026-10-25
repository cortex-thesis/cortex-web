import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const group = { id: 7, name: 'Existing class', code: 'CORTEX', description: '', school_year: '2026', package_count: 1, teacher: { id: 2, name: 'Teacher' }, packages: [{ id: 1, slug: 'life', name: 'Life Skills', lesson_count: 2 }] }
const lessons = [ { id: 41, title: 'Existing matching lesson', package: 'life' }, { id: 42, title: 'Existing ordering lesson', package: 'life' } ]
const configuration = id => id === 41 ? { task_template: 'matching_pairs', question: 'Match each item to its job.', pairs: [{ id: 'a', left: { id: 'a', label: 'Soap' }, right: { id: 'b', label: 'Wash' } }, { id: 'c', left: { id: 'c', label: 'Towel' }, right: { id: 'd', label: 'Dry' } }] } : { task_template: 'sequence_order', question: 'Choose the steps in order.', items: [{ id: 'dry', label: 'Dry' }, { id: 'wash', label: 'Wash' }], correct_order: ['wash', 'dry'] }
async function fixture(page, { role = 'student', id = 'learner', empty = false } = {}) {
  const writes = []
  const progress = new Map()
  page.on('pageerror', error => { throw error })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    const body = method === 'POST' ? route.request().postDataJSON() : null
    if (!['GET', 'HEAD'].includes(method)) writes.push({ path, body })
    let value = {}, status = 200
    if (path === '/api/auth/me/') value = { id, role, name: 'Learner', pseudonym: id, avatar: null }
    else if (path.includes('notifications')) value = { notifications: [], unread_count: 0 }
    else if (path.includes('class-sessions')) value = { sessions: [] }
    else if (path.endsWith('/profile/')) value = { name: 'Learner', username: 'learner', email: '' }
    else if (path === '/api/student/preferences/') value = { notifications_enabled: true, sound_enabled: true, haptics_enabled: false }
    else if (path === '/api/student/package-progress/') value = { badge_unlocks: {} }
    else if (path === '/api/classes/') value = { classes: empty ? [] : [group] }
    else if (path === '/api/classes/7/') value = group
    else if (path === '/api/student/classes/7/packages/life/') value = { class: group, package: group.packages[0], lessons }
    else if (/^\/api\/student\/classes\/7\/lessons\/(41|42)\/$/.test(path)) {
      const selected = Number(path.split('/').at(-2))
      const saved = progress.get(selected) ?? { completed_slide_ids: [], activity_evidence: {} }
      if (body?.action === 'answer') saved.activity_evidence[String(body.slide_id)] = { selected: body.selected, practice_correct: body.correct }
      else if (body?.slide_id && !saved.completed_slide_ids.includes(body.slide_id)) saved.completed_slide_ids.push(body.slide_id)
      progress.set(selected, saved)
      value = { ...lessons.find(item => item.id === selected), progress: saved, slides: [{ id: selected * 10, title: selected === 41 ? 'Match the helpers' : 'Order the steps', activity: { type: 'interactive', configuration: configuration(selected) } }, { id: selected * 10 + 1, title: 'Make a choice', activity: { type: 'interactive', configuration: { task_template: 'multiple_choice', question: 'Who can help?', choices: ['Teacher', 'Nobody'], answer: 'Teacher' } } }] }
    }
    else if (path === '/api/student/sessions/') value = { summary: { completed_sessions: 0, average_focus_score: 0, total_duration_seconds: 0 }, sessions: [] }
    else if (path === '/api/sync/status/') value = { enabled: false }
    else if (!['/api/auth/csrf/', '/api/auth/logout/'].includes(path)) { status = 404; value = { detail: 'Outside fixture' } }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
  })
  return { writes, progress }
}
const tour = page => page.getByRole('dialog', { name: /./ })
const next = page => tour(page).getByRole('button', { name: 'Next', exact: true }).click()
async function openPractice(page, lesson) {
  await page.goto('/student/help/tour')
  await page.getByRole('button', { name: 'Show me around' }).click()
  await page.locator('[data-tour="student-lessons"]').click()
  await page.getByRole('button', { name: /Existing class/ }).click()
  await page.locator('[data-tour="package-choice"]').click()
  await expect(tour(page).getByRole('heading')).toHaveText('Choose your own lesson')
  await page.getByRole('button', { name: new RegExp(lesson === 41 ? 'Existing matching lesson' : 'Existing ordering lesson') }).click()
  await expect(tour(page).getByRole('heading')).toHaveText('Choose Practice')
  await page.locator('[data-tour="practice-mode"]').click()
  await page.locator('[data-tour="practice-start"]').click()
  await expect(page).toHaveURL(new RegExp(`/student/class/7/lesson/${lesson}/practice$`))
  await expect(tour(page).getByRole('heading')).toHaveText('Try your activity')
}
for (const lesson of [41, 42]) test(`chosen lesson ${lesson}: normal activity, saves, retries and tour exit`, async ({ page }) => {
  const { writes, progress } = await fixture(page)
  await openPractice(page, lesson)
  await expect(tour(page).getByRole('button', { name: 'Soap', exact: true })).toHaveCount(0)
  if (lesson === 41) {
    await expect(tour(page).getByText(/Match related items/)).toBeVisible()
    await page.getByRole('button', { name: 'Soap', exact: true }).click()
    await page.getByRole('button', { name: 'Wash', exact: true }).click()
    await page.getByRole('button', { name: 'Towel', exact: true }).click()
    await page.getByRole('button', { name: 'Dry', exact: true }).click()
  } else {
    await expect(tour(page).getByText(/Arrange the pieces/)).toBeVisible()
    await page.getByRole('button', { name: 'Dry', exact: true }).click()
    await page.getByRole('button', { name: 'Wash', exact: true }).click()
    await page.getByRole('button', { name: 'Check order' }).click()
    await next(page)
    await expect(tour(page).getByText(/Try again is available/)).toBeVisible()
    await page.locator('[data-tour="practice-retry"]').click()
    await page.getByRole('button', { name: 'Wash', exact: true }).click()
    await page.getByRole('button', { name: 'Dry', exact: true }).click()
    await page.getByRole('button', { name: 'Check order' }).click()
  }
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Make a choice', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Teacher', exact: true }).click()
  await page.getByRole('button', { name: 'Finish lesson', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible()
  expect(progress.get(lesson).completed_slide_ids).toEqual([lesson * 10, lesson * 10 + 1])
  expect(writes.every(item => item.path === `/api/student/classes/7/lessons/${lesson}/`)).toBe(true)
  expect(writes.some(item => item.body?.action === 'answer')).toBe(true)
  expect(progress.has(lesson === 41 ? 42 : 41)).toBe(false)
})
test('leave practice unfinished, then discover real garden, Sessions and Help', async ({ page }) => {
  const { writes, progress } = await fixture(page)
  await openPractice(page, 42)
  await next(page); await next(page)
  await page.locator('[data-tour="practice-back"]').click()
  await page.locator('[data-tour="student-home"]').click()
  await page.locator('[data-tour="student-garden"]').click()
  await page.locator('[data-tour="garden-flower"]').click()
  await expect(page.locator('[data-tour="garden-flower"]')).toHaveAttribute('aria-expanded', 'true')
  await next(page)
  await page.locator('[data-tour="student-sessions"]').click()
  await next(page)
  await page.locator('[data-tour="student-settings"]').click()
  await page.locator('[data-guide="/student/help"]').click()
  await expect(tour(page).getByRole('heading')).toHaveText('You know your way around')
  expect(progress.get(42).completed_slide_ids).toEqual([])
  expect(writes.length).toBeGreaterThanOrEqual(1)
  expect(writes.every(item => item.path === '/api/student/classes/7/lessons/42/' && Object.keys(item.body).length === 0)).toBe(true)
  expect(await page.evaluate(() => localStorage.getItem('cortex:onboarding:v1:student:learner'))).toBe('completed')
})
test('mobile real practice controls remain usable and guide is accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await fixture(page)
  await openPractice(page, 41)
  await page.getByRole('button', { name: 'Soap', exact: true }).click()
  await page.getByRole('button', { name: 'Wash', exact: true }).click()
  await expect(tour(page).getByRole('button', { name: 'Exit tour' })).toBeInViewport()
  const bounds = await tour(page).boundingBox()
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844)
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([])
  await page.screenshot({ path: '../.runtime/actual-practice-tour-mobile.png' })
})
test('missing enrollment, interruption, refresh and replay do not fabricate lessons', async ({ page }) => {
  const { writes } = await fixture(page, { empty: true })
  await page.goto('/student/help/tour')
  await page.getByRole('button', { name: 'Show me around' }).click()
  await page.locator('[data-tour="student-lessons"]').click()
  await expect(page.getByText('You have not joined a class yet.')).toBeVisible()
  await expect(tour(page).getByText(/ask your teacher/)).toBeVisible()
  await page.reload()
  await expect(tour(page).getByRole('heading')).toHaveText('Choose your own lesson')
  await page.keyboard.press('Escape')
  await page.goto('/student/help')
  await page.getByRole('link', { name: 'Restart onboarding' }).click()
  await expect(page.getByRole('button', { name: 'Show me around' })).toBeVisible()
  expect(writes).toEqual([])
})
test('teacher tour remains read-only and uses normal navigation', async ({ page }) => {
  const { writes } = await fixture(page, { role: 'teacher' })
  await page.goto('/teacher/help/tour')
  await page.getByRole('button', { name: 'Show me around' }).click()
  await page.locator('[data-guide="/teacher/classes"]').click(); await next(page)
  await page.locator('[data-guide="/teacher/sessions"]').click(); await next(page); await next(page)
  await page.locator('[data-guide="/teacher/reports"]').click(); await next(page)
  await page.locator('[data-tour="teacher-account"]').click()
  await page.locator('[data-tour="teacher-settings"]').click()
  await page.locator('[data-guide="/teacher/help"]').click()
  await expect(tour(page).getByRole('heading')).toHaveText('You know your way around')
  expect(writes).toEqual([])
})

test('finishing real Practice while guided does not complete onboarding', async ({ page }) => {
  const { progress } = await fixture(page)
  await openPractice(page, 42)
  await page.getByRole('button', { name: 'Wash', exact: true }).click()
  await page.getByRole('button', { name: 'Dry', exact: true }).click()
  await page.getByRole('button', { name: 'Check order' }).click()
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await expect(tour(page).getByText(/choose an answer/)).toBeVisible()
  await page.getByRole('button', { name: 'Teacher', exact: true }).click()
  await page.getByRole('button', { name: 'Finish lesson', exact: true }).click()
  await expect(tour(page).getByText(/normal progress was saved/)).toBeVisible()
  expect(progress.get(42).completed_slide_ids).toEqual([420, 421])
  expect(await page.evaluate(() => localStorage.getItem('cortex:onboarding:v1:student:learner'))).toBeNull()
})
