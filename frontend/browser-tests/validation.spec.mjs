import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const categories = { access: 'Login, logout and role access', eeg: 'EEG filtering, band power, TBR and events', adaptive: 'Adaptive states and signal fallback', lessons: 'Answers, progress, resume and completion', commands: 'Teacher authorization, targeting and retries', reports: 'Report totals and exports', session: 'Session integration', security: 'Routes, uploads, stale data and privacy', usability: 'Performance and accessibility', regression: 'Regression and correction rechecks' }
const sample = { id: 'a'.repeat(32), status: 'complete', started_at: '2026-01-01T00:00:00Z', tests: [
  { id: 'fixture.pass', name: 'Synthetic signal processing', category: 'eeg', status: 'passed', expected: 'Known signal recovered', actual: 'All assertions passed.', duration_ms: 5 },
  { id: 'fixture.fail', name: 'Synthetic failure detail', category: 'reports', status: 'failed', expected: 'Two report records', actual: 'Expected 2, received 1', duration_ms: 2 },
  { id: 'fixture.skip', name: 'Skipped fixture', category: 'regression', status: 'skipped', expected: 'Check executes', actual: 'Unavailable fixture', duration_ms: 0 },
], manual: {} }

async function fixture(page, role = 'super', runs = [structuredClone(sample)]) {
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    let value = {}
    let status = 200
    if (pathname === '/api/auth/me/') {
      if (role === 'anonymous') { status = 401; value = { detail: 'Authentication required.' } }
      else value = { id: 'fixture-admin', name: 'Synthetic administrator', role: role === 'student' ? 'student' : 'admin', admin_scope: role === 'super' ? 'super' : 'school', pseudonym: 'fixture' }
    } else if (pathname === '/api/admin/validation/') {
      if (route.request().method() === 'POST') { const run = { ...structuredClone(sample), id: 'b'.repeat(32), tests: [], status: 'running' }; runs.unshift(run); value = run; status = 202 }
      else value = { categories, manual_checks: [['headset', 'session', 'Connect a real headset and verify the teacher report.']], runs }
    } else if (pathname.includes('/manual/')) {
      const evidence = route.request().postDataJSON()
      runs[0].manual[evidence.check] = { ...evidence, checked_at: new Date().toISOString() }
      value = runs[0]
    } else if (pathname === '/api/notifications/') value = { notifications: [], unread_count: 0 }
    else if (pathname === '/api/sync/status/') value = { enabled: false }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
  })
  return runs
}

test('[regression] dashboard calculates percentage including failed and skipped checks and shows expected/actual defects', async ({ page }) => {
  await fixture(page)
  await page.goto('/admin/evaluation')
  await expect(page.getByText('33.3% automated checks passed')).toBeVisible()
  await page.getByLabel('Show unsuccessful checks only').check()
  await expect(page.getByText('Synthetic signal processing', { exact: false })).toHaveCount(0)
  await page.getByText('Synthetic failure detail', { exact: false }).click()
  await expect(page.getByText('Two report records', { exact: true })).toBeVisible()
  await expect(page.getByText('Expected 2, received 1')).toBeVisible()
})

test('[regression] run button starts a run and prevents duplicate browser requests', async ({ page }) => {
  await fixture(page)
  await page.goto('/admin/evaluation')
  await page.getByRole('button', { name: 'Run all automated tests' }).click()
  await expect(page.getByRole('button', { name: 'Tests running…' })).toBeDisabled()
  await expect(page.getByText('No results yet')).toBeVisible()
})

test('[regression] manual expected and actual results are saved and displayed', async ({ page }) => {
  await fixture(page)
  await page.goto('/admin/evaluation')
  await page.getByLabel('Expected result', { exact: true }).fill('Connect within ten seconds')
  await page.getByLabel('Actual result and measurements').fill('Connected in four seconds')
  await page.getByRole('button', { name: 'Save manual check' }).click()
  await expect(page.getByText('Actual: Connected in four seconds')).toBeVisible()
})

for (const role of ['anonymous', 'school', 'student']) {
  test(`[security] direct validation route denies ${role} access`, async ({ page }) => {
    await fixture(page, role)
    await page.goto('/admin/evaluation')
    await expect(page).not.toHaveURL(/\/admin\/evaluation/)
    await expect(page.getByRole('heading', { name: 'System validation' })).toHaveCount(0)
  })
}

for (const width of [360, 390, 768, 1280]) {
  test(`[usability] validation phone/tablet layout fits ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await fixture(page)
    await page.goto('/admin/evaluation')
    await expect(page.getByRole('heading', { name: 'System validation' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (width === 1280) await page.screenshot({ path: '../.runtime/validation-preview.png', fullPage: true })
  })
}

test('[usability] validation passes WCAG accessibility and contrast scan', async ({ page }) => {
  await fixture(page)
  await page.goto('/admin/evaluation')
  await expect(page.getByRole('heading', { name: 'System validation' })).toBeVisible()
  const result = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(result.violations.map(item => ({ id: item.id, description: item.description, nodes: item.nodes.map(node => node.target) }))).toEqual([])
})

test('[usability] keyboard can reach and activate validation controls with visible focus', async ({ page }) => {
  await fixture(page)
  await page.goto('/admin/evaluation')
  await expect(page.getByRole('heading', { name: 'System validation' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '← System overview' })).toBeFocused()
  await page.keyboard.press('Tab')
  const button = page.getByRole('button', { name: 'Run all automated tests' })
  await expect(button).toBeFocused()
  expect(await button.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Tests running…' })).toBeDisabled()
})

test('[usability] reduced-motion preference disables validation animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await fixture(page)
  await page.goto('/admin/evaluation')
  const button = page.getByRole('button', { name: 'Run all automated tests' })
  await expect(button).toBeVisible()
  expect(await button.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
  expect(await button.evaluate(element => getComputedStyle(element).transitionDuration)).toBe('0s')
})

test('[usability] validation renders within five seconds with synthetic API responses', async ({ page }) => {
  await fixture(page)
  const started = Date.now()
  await page.goto('/admin/evaluation')
  await expect(page.getByText('33.3% automated checks passed')).toBeVisible()
  expect(Date.now() - started).toBeLessThan(5000)
})

test('[access] login succeeds and logout removes access to validation', async ({ page }) => {
  await fixture(page, 'anonymous')
  await page.route('**/api/auth/login/', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'fixture-admin', name: 'Synthetic administrator', role: 'admin', admin_scope: 'super', pseudonym: 'fixture' }) }))
  await page.goto('/')
  await page.getByLabel('Username or email address').fill('synthetic@example.test')
  await page.getByLabel(/^Password/).fill('synthetic-password')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/dashboard/)
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/admin/evaluation')
  await expect(page).not.toHaveURL(/\/admin\/evaluation/)
})

test('[access] failed login displays the server error and keeps protected routes inaccessible', async ({ page }) => {
  await fixture(page, 'anonymous')
  await page.route('**/api/auth/login/', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Invalid credentials.' }) }))
  await page.goto('/')
  await page.getByLabel('Username or email address').fill('synthetic@example.test')
  await page.getByLabel(/^Password/).fill('incorrect-password')
  await page.getByLabel(/^Password/).press('Enter')
  await expect(page.getByText('Invalid credentials.', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('[usability] login fits a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await fixture(page, 'anonymous')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome to Cortex' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
