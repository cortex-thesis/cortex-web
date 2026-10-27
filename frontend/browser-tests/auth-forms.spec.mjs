import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function setup(page, handler) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (handler && await handler(route, path)) return
    const status = path === '/api/auth/me/' ? 401 : 200
    const body = path === '/api/auth/schools/' ? { schools: [{ id: 'school-1', name: 'Cortex School' }] } : {}
    await route.fulfill({ status, json: body })
  })
}
async function valid(page) {
  for (const [label, value] of [['Username','ana'], ['Email address','ana@example.test'], ['First name','Ana-María'], ['Last name',"O'Neill"], ['Password','auth-test-password-123!'], ['Confirm password','auth-test-password-123!']]) await page.getByLabel(new RegExp(`^${label}(?:\\s*\\*)?$`)).fill(value)
  await page.getByLabel('Choose school').selectOption('school-1')
  if (await page.locator('#registration-studentNumber').count()) {
    for (const [key, value] of Object.entries({ studentNumber: '001234', birthdate: '2005-02-01', guardianName: 'Guardian Name', guardianContact: '09171234567', guardianEmail: 'guardian@example.test' })) await page.locator(`#registration-${key}`).fill(value)
  }
}

test('registration validates fields, retains backend errors and prevents duplicates', async ({ page }) => {
  let calls = 0, release
  await setup(page, async (route, path) => {
    if (path !== '/api/auth/register/') return false
    calls++
    expect(route.request().postDataJSON().email).toBe('ana@example.test')
    if (calls === 1) {
      await new Promise(resolve => { release = resolve })
      await route.fulfill({ status: 400, json: { detail: 'Please correct the highlighted fields.', errors: { student_number: 'That student number is already in use.' } } })
    } else await route.fulfill({ status: 201, json: { account_status: 'active' } })
    return true
  })
  await page.goto('/register')
  const submit = page.locator('form button[type=submit]')
  await submit.click()
  await expect(page.locator('#registration-firstName')).toHaveAttribute('aria-invalid', 'true')
  expect(calls).toBe(0)
  await valid(page)
  for (const [label, value] of [['First name','Ana2'], ['Student number','12A'], ['Guardian contact','09abc'], ['Email address','ana@']]) {
    const input = page.getByLabel(new RegExp(`^${label}(?:\\s*\\*)?$`))
    const previous = await input.inputValue()
    await input.fill(value); await submit.click()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
    await input.fill(previous)
  }
  for (const key of ['studentNumber', 'birthdate', 'guardianName', 'guardianContact', 'guardianEmail']) {
    const input = page.locator(`#registration-${key}`)
    await expect(input).toHaveAttribute('required', '')
    const previous = await input.inputValue()
    await input.fill(key === 'birthdate' ? '' : '   ')
    await submit.click()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toBe(0)
    await input.fill(previous)
  }
  await submit.click()
  await expect(submit).toBeDisabled()
  await page.locator('form').evaluate(form => { form.requestSubmit(); form.requestSubmit() })
  await expect.poll(() => calls).toBe(1)
  release()
  await expect(page.getByText('That student number is already in use.', { exact: true })).toBeVisible()
  await expect(page.locator('#registration-firstName')).toHaveValue('Ana-María')
  await submit.click()
  await expect(page.getByRole('heading', { name: 'Account saved' })).toBeVisible()
  expect(calls).toBe(2)
})

for (const width of [360, 768, 1440]) test(`auth responsive layout and accessibility at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await setup(page)
  for (const path of ['/', '/register']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
  }
})

test('login missing fields, invalid credentials, server errors, pending guard and redirect', async ({ page }) => {
  let calls = 0, release
  await setup(page, async (route, path) => {
    if (path !== '/api/auth/login/') return false
    calls++
    if (calls === 1) {
      await new Promise(resolve => { release = resolve })
      await route.fulfill({ status: 401, json: { detail: 'Invalid credentials.' } })
    } else if (calls === 2) await route.fulfill({ status: 500, json: { detail: 'sensitive internal error' } })
    else await route.fulfill({ json: { id: 5, name: 'Ana', role: 'teacher', account_status: 'active' } })
    return true
  })
  await page.goto('/')
  const submit = page.getByRole('button', { name: 'Continue', exact: true })
  await submit.click()
  await expect(page.getByText('Enter your password.', { exact: true })).toBeVisible()
  expect(calls).toBe(0)
  await page.getByLabel('Username or email address').fill('ana')
  await page.getByLabel(/^Password/).fill('wrong')
  await submit.click(); await expect(submit).toBeDisabled()
  await page.locator('form').evaluate(form => form.requestSubmit())
  expect(calls).toBe(1); release()
  await expect(page.getByRole('alert')).toHaveText('Invalid credentials.')
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Unable to complete the request. Please try again.')
  await submit.click()
  await expect(page).toHaveURL(/\/welcome$/)
})

test('teacher route defaults to teacher and explains approval on success', async ({ page }) => {
  await setup(page, async (route, path) => {
    if (path !== '/api/auth/register/') return false
    expect(route.request().postDataJSON().role).toBe('teacher')
    await route.fulfill({ status: 201, json: { account_status: 'pending' } })
    return true
  })
  await page.goto('/teacher/register'); await valid(page)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByText(/awaiting school administrator approval/)).toBeVisible()
})
