import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const introKey = 'cortex:introduction:v1:student:student-1'
async function fixture(page, role = 'student', { signedIn = true, status = 'active', completed = false } = {}) {
  let authenticated = signedIn
  const user = { id: `${role}-1`, name: 'Cortex User', role: role.includes('admin') ? 'admin' : role, admin_scope: role === 'school_admin' ? 'school' : role === 'super_admin' ? 'super' : 'none', account_status: status }
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/login/') {
      if (status !== 'active') { await route.fulfill({ status: 403, json: { detail: 'This account is pending approval or is disabled.' } }); return }
      authenticated = true
    }
    const auth = path === '/api/auth/me/' || path === '/api/auth/login/'
    await route.fulfill({ status: auth ? authenticated ? 200 : 401 : 200, json: auth ? authenticated ? user : { detail: 'Sign in required.' } : path.includes('notifications') ? { notifications: [], unread_count: 0 } : path.includes('class-sessions') ? { sessions: [] } : path.includes('sync') ? { enabled: false } : {} })
  })
  if (completed) await page.addInitScript(({ role }) => localStorage.setItem(`cortex:introduction:v1:${role}:${role}-1`, JSON.stringify({ step: 2, status: 'completed' })), { role })
}
async function login(page) {
  await page.goto('/')
  await page.getByLabel('Username or email address').fill('user')
  await page.getByLabel(/^Password/).fill('valid-password-123!')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}
async function introduction(page) {
  await expect(page.getByTestId('cortex-animation')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hi! Ready to learn today?' })).toBeVisible({ timeout: 15000 })
}

test('student Next, duplicate guard, refresh progress and final completion survive subsequent login', async ({ page }) => {
  await fixture(page, 'student', { signedIn: false })
  await login(page); await introduction(page)
  await page.getByRole('button', { name: 'Next', exact: true }).evaluate(button => { button.click(); button.click() })
  await expect(page.getByRole('heading', { name: 'Join your class' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Student introduction: step 2 of 3' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Join your class' })).toBeFocused()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Put on your headband' })).toBeVisible()
  await page.waitForTimeout(450)
  await page.getByRole('button', { name: 'Get started' }).click()
  await expect(page).toHaveURL(/\/student\/home$/)
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).status, introKey)).toBe('completed')
  await login(page)
  await expect(page).toHaveURL(/\/student\/home$/)
  await page.goto('/welcome'); await expect(page).toHaveURL(/\/student\/home$/)
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
})

for (const width of [360, 768, 1440]) test(`close introduction by keyboard, accessible layout at ${width}`, async ({ page }) => {
  await fixture(page); await page.setViewportSize({ width, height: 900 })
  await page.goto('/welcome'); await introduction(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Skip introduction' }).focus(); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/student\/home$/)
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).status, introKey)).toBe('dismissed')
  await page.goto('/welcome'); await expect(page).toHaveURL(/\/student\/home$/)
})

test('teacher animation uses authenticated role, ends at dashboard, and does not replay on refresh', async ({ page }) => {
  await fixture(page, 'teacher', { signedIn: false }); await login(page)
  await expect(page.getByTestId('cortex-animation')).toBeVisible()
  await expect(page).toHaveURL(/\/teacher\/dashboard$/, { timeout: 15000 })
  await page.goto('/welcome'); await expect(page).toHaveURL(/\/teacher\/dashboard$/)
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
})

for (const role of ['school_admin', 'super_admin']) test(`${role} never sees introduction or animation`, async ({ page }) => {
  await fixture(page, role, { signedIn: false }); await login(page)
  await expect(page).toHaveURL(role === 'school_admin' ? /\/school-admin\/dashboard$/ : /\/admin\/dashboard$/)
  await page.goto('/welcome'); await expect(page).not.toHaveURL(/\/welcome$/)
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
})

test('public and pending accounts cannot mount animation even with forged route state', async ({ page }) => {
  await fixture(page, 'teacher', { signedIn: false, status: 'pending' })
  await page.addInitScript(() => history.replaceState({ usr: { role: 'student' }, key: 'forged', idx: 0 }, ''))
  for (const path of ['/welcome', '/', '/register']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
  }
  await login(page)
  await expect(page.getByRole('alert')).toHaveText('This account is pending approval or is disabled.')
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
})


test('animation cannot flash before the server establishes authentication', async ({ page }) => {
  await fixture(page)
  let release
  await page.route('**/api/auth/me/', async route => {
    await new Promise(resolve => { release = resolve })
    await route.fulfill({ json: { id: 'student-1', name: 'Learner', role: 'student' } })
  })
  await page.goto('/welcome')
  await expect(page.getByRole('status').filter({ hasText: 'Loading Cortex' })).toBeVisible()
  await expect(page.getByTestId('cortex-animation')).toHaveCount(0)
  await expect.poll(() => typeof release).toBe('function')
  release()
  await expect(page.getByTestId('cortex-animation')).toBeVisible()
})


test('existing workspace onboarding completion also makes the student introduction ineligible', async ({ page }) => {
  await fixture(page)
  await page.addInitScript(() => localStorage.setItem('cortex:onboarding:v1:student:student-1', 'completed'))
  await page.goto('/welcome')
  await expect(page.getByTestId('cortex-animation')).toBeVisible()
  await expect(page).toHaveURL(/\/student\/home$/, { timeout: 15000 })
  await expect(page.getByRole('button', { name: 'Skip introduction' })).toHaveCount(0)
})
