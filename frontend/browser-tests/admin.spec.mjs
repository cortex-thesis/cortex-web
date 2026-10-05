import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function fixture(page, protectedAccount = false) {
  let accounts = [{ id: 2, name: 'Alex Teacher', username: 'alex', email: 'alex@example.com', role: 'teacher', admin_scope: 'none', school: 'Cortex School', account_status: 'active' }, { id: 1, name: 'Super Admin', username: 'super', email: 'super@example.com', role: 'admin', admin_scope: 'super', account_status: 'active' }]
  const notifications = [{ id: 'notification-1', title: 'Account created', body: 'Alex Teacher was registered.', kind: 'account', read: false, link: '/admin/accounts', createdAt: '2026-01-01T12:00:00Z' }, { id: 'notification-2', title: 'Registration awaiting review', body: 'Review a new registration.', kind: 'registration', read: false, link: '', createdAt: '2026-01-02T12:00:00Z' }]
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    let value = {}, status = 200
    if (path === '/api/auth/me/') value = { id: 1, name: 'Super Admin', role: 'admin', admin_scope: 'super' }
    else if (path === '/api/admin/accounts/') value = { accounts }
    else if (path === '/api/admin/schools/') value = { schools: [{ id: '1', name: 'Cortex School', is_active: true }] }
    else if (path === '/api/admin/accounts/2/status/') { accounts[0].account_status = route.request().postDataJSON().status; value = accounts[0] }
    else if (path === '/api/admin/accounts/2/') {
      if (method === 'DELETE') {
        if (protectedAccount) { status = 409; value = { detail: 'This account has linked learning records. Deactivate it to preserve history.' } }
        else { accounts = accounts.filter(account => account.id !== 2); value = { status: 'deleted', id: 2 } }
      } else { Object.assign(accounts[0], route.request().postDataJSON()); value = accounts[0] }
    } else if (path === '/api/notifications/') {
      if (method === 'POST') { const body = route.request().postDataJSON(); notifications.forEach(item => { if (body.all || body.notification_id === item.id) item.read = true }) }
      value = { notifications, unread_count: notifications.filter(item => !item.read).length }
    } else if (path === '/api/sync/status/') value = { enabled: false }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) })
  })
}

test('[access] account action menu edits identity and deactivates/reactivates accounts', async ({ page }) => {
  await fixture(page); await page.goto('/admin/accounts')
  await expect(page.getByRole('button', { name: 'Actions for Super Admin' })).toBeDisabled()
  await page.getByRole('button', { name: 'Actions for Alex Teacher' }).click()
  await expect(page.getByRole('menuitem', { name: 'Edit account' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Deactivate account' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Actions for Alex Teacher' })).toBeFocused()
  await page.getByRole('button', { name: 'Actions for Alex Teacher' }).click()
  await page.getByRole('menuitem', { name: 'Edit account' }).click()
  await page.getByRole('dialog').getByLabel('Full name').fill('Alex Updated')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('button', { name: 'Actions for Alex Updated' })).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Alex Updated' }).click()
  await page.getByRole('menuitem', { name: 'Deactivate account' }).click()
  await expect(page.getByText('Alex Updated was deactivated.')).toBeVisible()
  await page.getByRole('button', { name: 'Actions for Alex Updated' }).click()
  await page.getByRole('menuitem', { name: 'Reactivate account' }).click()
  await expect(page.getByText('Alex Updated was reactivated.')).toBeVisible()
})

for (const protectedAccount of [false, true]) test(`[security] deletion requires confirmation and handles ${protectedAccount ? 'protected' : 'unlinked'} accounts`, async ({ page }) => {
  await fixture(page, protectedAccount); await page.goto('/admin/accounts')
  await page.getByRole('button', { name: 'Actions for Alex Teacher' }).click()
  await page.getByRole('menuitem', { name: 'Delete account' }).click()
  await expect(page.getByRole('button', { name: 'Delete account permanently' })).toBeDisabled()
  await page.getByLabel('Type alex to confirm deletion').fill('alex')
  await page.getByRole('button', { name: 'Delete account permanently' }).click()
  if (protectedAccount) {
    await expect(page.getByRole('alert')).toContainText('linked learning records')
    await page.getByRole('button', { name: 'Deactivate instead' }).click()
    await expect(page.getByText('Alex Teacher was deactivated.')).toBeVisible()
  } else await expect(page.getByRole('button', { name: 'Actions for Alex Teacher' })).toHaveCount(0)
})

test('[regression] inbox filters, marks individual updates and navigates to their target', async ({ page }) => {
  await fixture(page); await page.goto('/admin/notifications')
  await expect(page.getByText('2 unread notifications')).toBeVisible()
  await page.getByLabel('Search notifications').fill('Account')
  await expect(page.getByText('Registration awaiting review')).toHaveCount(0)
  await page.getByRole('button', { name: /Account created Alex Teacher/ }).click()
  await expect(page).toHaveURL(/\/admin\/accounts/)
  await page.getByRole('link', { name: /Notifications/ }).click()
  await expect(page.getByText('1 unread notifications')).toBeVisible()
  await page.getByLabel('Unread only').check()
  await expect(page.getByText('Account created', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Mark all read' }).click()
  await expect(page.getByText('0 unread notifications')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark all read' })).toBeDisabled()
})

for (const path of ['accounts', 'notifications']) test(`[usability] admin ${path} supports accessible mobile layout`, async ({ page }) => {
  await fixture(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`/admin/${path}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth && !element.closest('table')).map(element => ({ tag: element.tagName, class: element.className, right: element.getBoundingClientRect().right })))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: `../.runtime/admin-${path}-mobile.png`, fullPage: true })
})
