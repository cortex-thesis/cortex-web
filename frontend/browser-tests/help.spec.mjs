import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const group = { id: 7, name: 'Existing class', code: 'CORTEX', description: '', school_year: '2026', package_count: 1, teacher: { id: 2, name: 'Teacher' }, packages: [{ id: 1, slug: 'life', name: 'Life Skills', lesson_count: 2 }] }
const lessons = [ { id: 41, title: 'Existing matching lesson', package: 'life' }, { id: 42, title: 'Existing ordering lesson', package: 'life' } ]
const configuration = id => id === 41 ? { task_template: 'matching_pairs', question: 'Match each item to its job.', pairs: [{ id: 'a', left: { id: 'a', label: 'Soap' }, right: { id: 'b', label: 'Wash' } }, { id: 'c', left: { id: 'c', label: 'Towel' }, right: { id: 'd', label: 'Dry' } }] } : { task_template: 'sequence_order', question: 'Choose the steps in order.', items: [{ id: 'dry', label: 'Dry' }, { id: 'wash', label: 'Wash' }], correct_order: ['wash', 'dry'] }
async function fixture(page, { role = 'student', id = 'learner', empty = false, wordHunt = false } = {}) {
  const writes = []
  const requests = []
  const progress = new Map()
  page.on('pageerror', error => { throw error })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    requests.push({ path, method, query: new URL(route.request().url()).search })
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
      const onboarding = new URL(route.request().url()).searchParams.get('context') === 'onboarding'
      if (!onboarding && method === 'POST') progress.set(selected, saved)
      value = { ...lessons.find(item => item.id === selected), ...(onboarding ? { context: 'onboarding' } : {}), progress: onboarding ? { completed_slide_ids: [], activity_evidence: {} } : saved, slides: [{ id: selected * 10, title: selected === 41 ? 'Match the helpers' : 'Order the steps', activity: { type: 'interactive', configuration: wordHunt ? { task_template: 'word_search', question: 'Find the words. Tap the first and last letter, or drag across them.', word_search_subject: 'word', grid: [['S', 'O', 'A', 'P']], targets: [{ word: 'SOAP', cells: [[0,0], [0,1], [0,2], [0,3]] }] } : configuration(selected) } }, { id: selected * 10 + 1, title: 'Make a choice', activity: { type: 'interactive', configuration: { task_template: 'multiple_choice', question: 'Who can help?', choices: ['Teacher', 'Nobody'], answer: 'Teacher' } } }] }
    }
    else if (path === '/api/student/sessions/') value = { summary: { completed_sessions: 0, average_focus_score: 0, total_duration_seconds: 0 }, sessions: [] }
    else if (path === '/api/sync/status/') value = { enabled: false }
    else if (!['/api/auth/csrf/', '/api/auth/logout/'].includes(path)) { status = 404; value = { detail: 'Outside fixture' } }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
  })
  return { writes, progress, requests }
}
const tour = page => page.getByRole('dialog', { name: /./ })
const heading = page => tour(page).getByRole('heading', { level: 2 })
const next = page => tour(page).getByRole('button', { name: 'Next', exact: true }).click()
const completionKey = 'cortex:onboarding:v1:student:learner'
async function openPractice(page, lesson = 41, originalEntry = false) {
  await page.goto('/student/help/tour')
  await expect(page.getByRole('button', { name: 'Maybe later', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Show me around' }).click()
  await expect(heading(page)).toHaveText('Find something to learn')
  await next(page)
  await page.getByRole('button', { name: /Existing class/ }).click()
  await page.locator('[data-tour="package-choice"]').click()
  await page.getByRole('button', { name: lesson === 41 ? /Existing matching lesson/ : /Existing ordering lesson/ }).click()
  await expect(heading(page)).toHaveText('Practice introduction')
  await expect(page).toHaveURL(/\/student\/class\/7\/lesson\/(41|42)\?context=onboarding$/)
  await expect(page.getByRole('heading', { name: 'Choose how to learn' })).toBeVisible()
  await expect(tour(page).getByRole('progressbar')).toHaveAttribute('value', '3')
  if (originalEntry) await page.getByRole('button', { name: 'Continue to practice', exact: true }).click()
  else await next(page)
  await expect(page).toHaveURL(/\/practice\?context=onboarding&stage=activity$/)
  await expect(heading(page)).toHaveText('Practice activity')
  await expect(page.locator('[data-tour="practice-player"]')).toHaveAttribute('data-practice-context', 'onboarding')
}
async function answer(page, lesson = 41) {
  if (lesson === 41) {
    for (const label of ['Soap', 'Wash', 'Towel', 'Dry']) await page.getByRole('button', { name: label, exact: true }).click()
  } else {
    for (const label of ['Wash', 'Dry', 'Check order']) await page.getByRole('button', { name: label, exact: true }).click()
  }
}
function isolated({ writes, progress, requests }) {
  expect(writes).toEqual([])
  expect(progress.size).toBe(0)
  expect(requests.filter(item => item.method !== 'GET')).toEqual([])
  expect(requests.filter(item => /\/lessons\/[^/]+\/$/.test(item.path) && item.query.includes('context=onboarding')).length).toBeGreaterThan(0)
}

for (const lesson of [41, 42]) test(`original player ${lesson}: introduction, interactive activity, finish and original feature tour resume without writes`, async ({ page }) => {
  const data = await fixture(page)
  await openPractice(page, lesson, lesson === 42)
  await expect(tour(page).getByRole('button', { name: /Soap|Wash|Dry/, exact: true })).toHaveCount(0)
  await expect(page.getByText('Activity 1 of 1', { exact: true })).toBeVisible()
  await expect(page.getByText(/Onboarding practice only/)).toBeVisible()
  await expect(tour(page).getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await expect(page.locator('[data-tour="activity-answer-area"]')).toHaveAttribute('data-guided', 'true')
  await expect(tour(page).getByText('Answer the highlighted activity to unlock Next.')).toBeVisible()
  await answer(page, lesson)
  await expect(page.locator('[data-tour="onboarding-activity-finish"]')).toHaveAttribute('data-guided', 'true')
  await page.getByRole('button', { name: 'Finish practice', exact: true }).click()
  await expect(heading(page)).toHaveText('Practice finished')
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeVisible()
  await expect(tour(page).getByRole('progressbar')).toHaveAttribute('max', '11')
  await expect(tour(page).getByRole('progressbar')).toHaveAttribute('value', '5')
  expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBeNull()
  await page.reload()
  await expect(heading(page)).toHaveText('Practice finished')
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeVisible()
  await next(page)
  await expect(heading(page)).toHaveText('See your garden grow')
  await expect(page).toHaveURL(/\/student\/home$/)
  await expect(tour(page).getByRole('progressbar')).toHaveAttribute('value', '6')
  await tour(page).getByRole('button', { name: 'Back', exact: true }).click()
  await expect(heading(page)).toHaveText('Practice finished')
  await expect(page.getByRole('heading', { name: 'Practice complete', exact: true })).toBeVisible()
  await next(page)
  await page.locator('[data-tour="student-garden"]').click()
  await expect(heading(page)).toHaveText('Every bloom tells a story')
  await next(page)
  await page.locator('[data-tour="student-sessions"]').click()
  await next(page)
  await page.locator('[data-tour="student-settings"]').click()
  await expect(tour(page).getByRole('button', { name: 'Finish tour', exact: true })).toBeVisible()
  await tour(page).getByRole('button', { name: 'Finish tour', exact: true }).click()
  await expect(heading(page)).toHaveText('You know your way around')
  isolated(data)
  expect(await page.evaluate(key => localStorage.getItem(key), completionKey)).toBe('completed')
})

for (const [width, height] of [[360, 900], [768, 900], [1440, 900], [360, 480]]) test(`actual player and tour navigation remain accessible at ${width}x${height}`, async ({ page }) => {
  await fixture(page); await page.setViewportSize({ width, height }); await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPractice(page)
  await answer(page)
  const back = tour(page).getByRole('button', { name: 'Back', exact: true }), forward = tour(page).getByRole('button', { name: 'Next', exact: true })
  await expect(forward).toBeEnabled()
  const left = await back.boundingBox(), right = await forward.boundingBox()
  expect(left.x + left.width).toBeLessThan(right.x)
  await expect(back).toBeInViewport(); await expect(forward).toBeInViewport()
  expect(await tour(page).locator('[class*="stepContent"]').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([])
  await page.screenshot({ path: `../.runtime/restored-practice-${width}x${height}.png` })
  await forward.click()
  await expect(heading(page)).toHaveText('Practice finished')
  await tour(page).getByRole('button', { name: 'Exit tour' }).focus(); await page.keyboard.press('Enter')
  await expect(tour(page)).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.dataset.practiceGuidance ?? null)).toBeNull()
})

test('Maybe later and X persist dismissal; duplicate Next clicks stop at one step', async ({ page }) => {
  await fixture(page); await page.goto('/student/help/tour')
  await page.getByRole('button', { name: 'Maybe later', exact: true }).click()
  await expect(tour(page)).toHaveCount(0)
  await page.reload(); await expect(tour(page)).toHaveCount(0)
  await page.goto('/student/help/tour'); await page.getByRole('button', { name: 'Show me around' }).click()
  await expect(tour(page).getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0)
  await tour(page).getByRole('button', { name: 'Next', exact: true }).evaluate(button => { button.click(); button.click() })
  await expect(heading(page)).toHaveText('Choose your own lesson')
  await tour(page).getByRole('button', { name: 'Exit tour' }).click()
  await expect(tour(page)).toHaveCount(0)
})

for (const lesson of [41, 42]) test(`normal lesson ${lesson} still persists answers and every actual slide`, async ({ page }) => {
  const { writes, progress } = await fixture(page)
  await page.goto(`/student/class/7/lesson/${lesson}/practice`)
  await answer(page, lesson)
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await page.getByRole('button', { name: 'Teacher', exact: true }).click()
  await page.getByRole('button', { name: 'Finish lesson', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible()
  expect(progress.get(lesson).completed_slide_ids).toEqual([lesson * 10, lesson * 10 + 1])
  expect(writes.some(item => item.body?.action === 'answer')).toBe(true)
})

test('teacher tour preserves its original feature navigation', async ({ page }) => {
  const { writes } = await fixture(page, { role: 'teacher' })
  await page.goto('/teacher/help/tour'); await page.getByRole('button', { name: 'Show me around' }).click()
  await page.locator('[data-guide="/teacher/classes"]').click(); await next(page)
  await page.locator('[data-guide="/teacher/sessions"]').click(); await next(page); await next(page)
  await page.locator('[data-guide="/teacher/reports"]').click(); await next(page)
  await page.locator('[data-tour="teacher-account"]').click(); await page.locator('[data-tour="teacher-settings"]').click()
  await page.locator('[data-guide="/teacher/help"]').click()
  await expect(heading(page)).toHaveText('You know your way around')
  expect(writes).toEqual([])
})


test('word hunt highlights the answer grid and explains why Next is locked', async ({ page }) => {
  const data = await fixture(page, { wordHunt: true })
  await openPractice(page)
  const answers = page.locator('[data-tour="activity-answer-area"]')
  await expect(answers).toHaveAttribute('data-guided', 'true')
  await expect(page.locator('[data-tour="practice-player"] h2')).not.toHaveAttribute('data-guided', 'true')
  const forward = tour(page).getByRole('button', { name: 'Next', exact: true })
  await expect(forward).toBeDisabled()
  await expect(tour(page).getByText(/Find every word in the highlighted grid/)).toBeVisible()
  await expect(forward).toHaveAttribute('aria-describedby', 'onboarding-answer-hint')
  await page.screenshot({ path: '../.runtime/onboarding-word-hunt-answer-area.png' })
  await page.getByRole('button', { name: 'S, row 1, column 1', exact: true }).click()
  await page.getByRole('button', { name: 'P, row 1, column 4', exact: true }).click()
  await expect(tour(page).getByText('Answer complete. Select Next to continue.')).toBeVisible()
  await expect(forward).toBeEnabled()
  await expect(page.locator('[data-tour="onboarding-activity-finish"]')).toHaveAttribute('data-guided', 'true')
  isolated(data)
})
