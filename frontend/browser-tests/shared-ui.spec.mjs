import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
async function fixture(page, role) {
  await page.addInitScript(({ role }) => localStorage.setItem(`cortex:onboarding:v1:${role}:${role}`, 'dismissed'), { role })
  const student = { id: 3, name: 'Alexandra Student With A Longer Name', role: 'student', avatar: null, avatar_color: 'blue', student_number: '000123', school: null }
  const group = { id: 7, name: 'Independent Living Skills With A Longer Section Name', student_count: 12, teacher_name: 'Teacher', package_count: 1, average_focus: null }
  const teacher = { id: 'teacher', name: 'Morgan Teacher', avatar: null, role: 'teacher' }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let body = {}
    if (path === '/api/auth/me/') body = role === 'teacher' ? teacher : { ...student, id: 'student' }
    else if (path === '/api/teacher/dashboard/') body = {
      teacher, classes: [group], reporting: { period: 'month', is_partial: false, month: '2026-10', start: null, end_exclusive: null, generated_at: new Date().toISOString(), sample_count: 0, measured_sessions: 0, basis: 'samples' }, comparison: null,
      class_count: 1, student_count: 12, unread_notifications: 0, active_sessions: 0, total_sessions: 2, average_focus: null, state_distribution: { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0 }, live_sessions: [],
      recent_sessions: [null, 'life'].map((pkg, index) => ({ id: `recent-${index}`, class_id: 7, class_name: group.name, student: { ...student, id: 3 + index, ...(index ? { name: 'Jamie Learner', avatar: '/assets/profile-flowers/flower-blue.svg' } : {}) }, lesson: 'A lesson with a longer descriptive title', package: pkg, started_at: '2026-10-20T08:00:00Z', ended_at: '2026-10-20T08:10:00Z', status: 'completed', completion_percentage: 100 })),
      recent_badges: ['lessons-1', 'lessons-3', 'lessons-12', 'life'].map((key, index) => ({ id: index, key, student, unlocked_at: '2026-10-20T08:10:00Z', classes: [{ id: 7, name: group.name }] })),
    }
    else if (path === '/api/classes/7/') body = { ...group, code: 'EXAMPLE', status: 'active', school_year: 'Current', packages: [] }
    else if (path === '/api/teacher/classes/7/live/') body = { active_sessions: [] }
    else if (path === '/api/teacher/classes/7/analytics/') body = { recent_sessions: [], recent_badges: [] }
    else if (path === '/api/student/dashboard/') body = { student, classes: [group], unread_notifications: 0, active_session: null }
    else if (path === '/api/student/sessions/') body = { sessions: [], summary: { completed_sessions: 2, total_duration_seconds: 1200, average_focus_score: null } }
    else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 }
    else if (path.includes('class-sessions')) body = { sessions: [] }
    else if (path === '/api/sync/status/') body = { enabled: false }
    await route.fulfill({ json: body })
  })
}
for (const role of ['student', 'teacher']) for (const width of [360, 768, 1024, 1440]) test(`${role} shared UI at ${width}`, async ({ page }) => {
  await fixture(page, role); await page.setViewportSize({ width, height: 900 })
  await page.goto(role === 'teacher' ? '/teacher/dashboard' : '/student/home')
  if (role === 'teacher') await expect(page.getByRole('heading', { name: 'Recent student sessions' })).toBeVisible()
  else await expect(page.getByText('Completed sessions', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const shell = page.locator('#root > div').first()
  expect(await shell.evaluate(el => {
    const reference = document.createElement('div')
    reference.style.background = 'var(--shell-corner-background)'
    document.body.append(reference)
    const same = getComputedStyle(el).backgroundImage === getComputedStyle(reference).backgroundImage
    reference.remove()
    return same
  })).toBe(true)
  await expect(page.getByText('Learn about this workspace', { exact: true })).toHaveCount(0)
  if (role === 'teacher') {
    const sessions = page.getByRole('region', { name: 'Recent student sessions', exact: true })
    await expect(sessions.locator('article').first().getByText('AS', { exact: true })).toBeVisible()
    await expect(sessions.locator('article').nth(1).locator('img')).toHaveAttribute('src', '/assets/profile-flowers/flower-blue.svg')
    await expect(sessions.locator('svg.lucide-book-open')).toHaveCount(2)
    await expect(sessions.getByRole('link', { name: 'Alexandra Student With A Longer Name', exact: true })).toHaveAttribute('href', '/teacher/class/7/student/3?session=recent-0')
    const badges = page.getByRole('region', { name: 'Recently earned badges', exact: true })
    await expect(badges.locator('svg.lucide-sprout')).toHaveCount(1)
    await expect(badges.locator('svg.lucide-star')).toHaveCount(1)
    await expect(badges.locator('svg.lucide-trophy')).toHaveCount(1)
    await expect(badges.locator('svg.lucide-award')).toHaveCount(1)
    await expect(badges.locator('img')).toHaveCount(0)
    expect((await new AxeBuilder({ page }).include('nav[aria-label="Teacher navigation"]').include('[aria-label="Recent student sessions"]').include('[aria-label="Recently earned badges"]').analyze()).violations).toEqual([])
  }
  await page.screenshot({ path: `../.runtime/batch3-final-${role}-${width}.png`, fullPage: true })
  const bell = page.getByRole('button', { name: 'Notifications', exact: true })
  await bell.scrollIntoViewIfNeeded()
  const bellBounds = await bell.boundingBox()
  expect(bellBounds.width).toBeGreaterThanOrEqual(44)
  expect(bellBounds.height).toBeGreaterThanOrEqual(44)
  await bell.focus(); await page.keyboard.press('Enter')
  const notification = page.getByRole('dialog', { name: 'Notifications', exact: true })
  await expect(notification).toBeVisible()
  const bounds = await notification.boundingBox()
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(900)
  await page.keyboard.press('Escape'); await expect(notification).toHaveCount(0)
  if (role === 'teacher') {
    const account = page.getByRole('button', { name: 'Open account menu for Morgan Teacher', exact: true })
    await account.focus(); await page.keyboard.press('Enter')
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/teacher\/settings$/)
    await page.getByRole('link', { name: /Help & Guides/ }).click()
    await expect(page).toHaveURL(/\/teacher\/help$/)
  }
})


for (const width of [360, 768, 1024, 1440]) test(`shared Teacher tab header wraps long titles at ${width}`, async ({ page }) => {
  await fixture(page, 'teacher'); await page.setViewportSize({ width, height: 900 })
  await page.goto('/teacher/class/7/overview')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Independent Living Skills With A Longer Section Name')
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const title = await page.getByRole('heading', { level: 1 }).boundingBox()
  const tabs = await page.getByRole('tablist', { name: 'Class navigation' }).boundingBox()
  expect(title.x + title.width).toBeLessThanOrEqual(width)
  expect(tabs.x + tabs.width).toBeLessThanOrEqual(width)
  expect(title.y + title.height <= tabs.y + 1 || title.x + title.width <= tabs.x + 1).toBe(true)
  for (const tab of await page.getByRole('tab').all()) {
    const box = await tab.boundingBox()
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  for (const card of await page.locator('[class*="statsRow"] > div').all()) {
    const box = await card.boundingBox()
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  }
  await page.screenshot({ path: `../.runtime/batch3-tab-header-${width}.png`, fullPage: true })
})

test('new teachers retain the existing workspace tour without the redundant link', async ({ page }) => {
  await fixture(page, 'teacher')
  await page.addInitScript(() => localStorage.removeItem('cortex:onboarding:v1:teacher:teacher'))
  await page.goto('/teacher/dashboard')
  await expect(page.getByRole('heading', { name: 'Discover your teaching workspace', exact: true })).toBeVisible()
  await expect(page.getByText('Learn about this workspace', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Maybe later', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Teacher dashboard', exact: true })).toBeVisible()
})
