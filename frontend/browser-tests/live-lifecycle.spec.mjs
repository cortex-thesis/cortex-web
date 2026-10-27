import { test, expect } from '@playwright/test'

async function fixture(page, role = 'student') {
  await page.addInitScript(({ role }) => {
    localStorage.setItem(`cortex:onboarding:v1:${role}:1`, 'dismissed')
    if (location.pathname === '/student/eeg-live') history.replaceState({ usr: { sessionId: 'record', classSessionId: 'group', classId: 7 } }, '', location.href)
  }, { role })
  const lesson = { id: 9, title: 'Lifecycle lesson', package: 'life', slides: [1, 2, 3].map(id => ({ id, title: `Step ${id}`, activity: { type: 'text', configuration: { template: 'visual_narrative', steps: [{ id: 'explain', title: `Step ${id}`, description: 'Read this small step.' }] } } })) }
  const participant = { id: 'record', student_id: 1, name: 'Student', status: 'active', online: true, signal_fresh: false, answered: 0, correct: 0, completed_steps: 0, task_total: 3, lesson_completed_steps: 0, lesson_step_total: 3, lesson_progress_percentage: 0, state_distribution: {}, eeg_samples: 0, duration_seconds: 5 }
  const group = { id: 'group', class_id: 7, class_name: 'Live Class', teacher_name: 'Teacher', lesson_id: 9, lesson_title: lesson.title, lesson_revision: 0, lesson, status: 'active', presentation_mode: 'focus', updated_at: new Date().toISOString(), roster: [{ student_id: 1, name: 'Student', joined: true }], participants: [participant], student_session: participant }
  const state = { group, calls: [], completed: [], failComplete: false, failEnd: false, holdHeartbeat: false, release: null, endGate: null, progressError: false }
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const data = req.method() === 'POST' ? req.postDataJSON() : null
    state.calls.push({ path, method: req.method(), data })
    let status = 200, body = {}
    if (path === '/api/auth/me/') body = { id: 1, name: role === 'teacher' ? 'Teacher' : 'Student', role, avatar: null }
    else if (path === '/api/class-sessions/') body = { sessions: [group] }
    else if (path === '/api/classes/') body = { classes: [{ id: 7, name: 'Live Class', status: 'active' }] }
    else if (path.includes('/session-lessons/')) body = { lessons: [{ id: 9, title: lesson.title, package: 'Life' }] }
    else if (path === '/api/class-sessions/group/') {
      if (data?.action === 'heartbeat' && state.holdHeartbeat) {
        state.holdHeartbeat = false
        const snapshot = structuredClone(group)
        await new Promise(resolve => { state.release = resolve })
        return route.fulfill({ json: snapshot })
      }
      if (data?.action === 'end') {
        if (state.endGate) await state.endGate
        if (state.failEnd) { status = 503; body = { detail: 'Ending failed. Try again.' } }
        else { group.status = 'completed'; group.report = { participant_count: 1, answered: 0, correct: 0, participants: [], lessons: [], controls: [], ended_at: new Date().toISOString() } }
      } else if (data?.action === 'pause') group.status = 'paused'
      else if (data?.action === 'resume') group.status = 'active'
      if (status === 200) body = group
    } else if (path === '/api/sessions/record/eeg/' && req.method() === 'GET') {
      status = state.progressError ? 503 : 200
      body = state.progressError ? { detail: 'Progress temporarily unavailable.' } : { lesson: group.lesson, progress: { completed_slide_ids: state.completed, responses: {}, last_sequence_number: 0 } }
    } else if (path === '/api/sessions/record/eeg/') body = { state: 'focused', focus_score: 90 }
    else if (/\/api\/sessions\/record\/slides\/\d+\//.test(path) && data?.action === 'complete') {
      if (state.failComplete || group.status === 'paused') { status = 409; body = { detail: 'Progress not saved.' } }
      else { state.completed.push(Number(path.split('/').at(-2))); participant.lesson_completed_steps = state.completed.length; participant.lesson_progress_percentage = state.completed.length / 3 * 100; body = { status: 'completed' } }
    } else if (path.includes('notifications')) body = { notifications: [], unread_count: 0 }
    else if (path === '/api/sync/status/') body = { enabled: false }
    await route.fulfill({ status, json: body })
  })
  return state
}
async function signal(page, extra = {}) {
  await page.evaluate(async extra => {
    const { useMuseStore } = await import('/src/store/museStore.ts')
    useMuseStore.setState({ status: 'streaming', baselineProgress: 100, acceptedChannels: 4, quality: [2, 2, 2, 2], bandsUpdatedAt: Date.now(), ...extra })
  }, extra)
}

test('pairing never declares ready from Bluetooth alone; fresh contacts recover readiness', async ({ page }) => {
  await fixture(page)
  await page.goto('/student/eeg-pairing')
  await signal(page, { baselineProgress: 0, acceptedChannels: 0, quality: [0, 0, 0, 0], bandsUpdatedAt: null })
  await expect(page.getByRole('heading', { name: 'Check your headset signal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  await signal(page, { baselineProgress: 40 })
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  await signal(page, { bandsUpdatedAt: Date.now() - 10000 })
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
})

test('calibration waits for baseline and usable signal; reconnect preserves progress and completed steps restore', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/student/eeg-live')
  await signal(page, { baselineProgress: 40 })
  await expect(page.getByRole('progressbar', { name: 'Headset calibration' })).toHaveAttribute('value', '40')
  await expect(page.getByRole('button', { name: 'Next activity', exact: true })).not.toBeVisible()
  await signal(page)
  const progress = page.getByRole('progressbar', { name: 'Lesson steps completed' })
  await expect(progress).toHaveAttribute('aria-valuenow', '0')
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  expect(await progress.locator('span').evaluate(el => el.style.width)).toBe('33.3333%')
  await signal(page, { status: 'connecting', acceptedChannels: 0, bandsUpdatedAt: null })
  await expect(page.getByRole('heading', { name: 'Reconnecting to your headset' })).toBeVisible()
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  expect(state.calls.filter(call => call.path.includes('/end/'))).toEqual([])
  await signal(page)
  await expect(page.getByRole('heading', { name: 'Reconnecting to your headset' })).toHaveCount(0)
  await page.reload()
  await signal(page)
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByText('Activity 2 of 3', { exact: true })).toBeVisible()
  state.group.status = 'paused'
  await expect(page.getByRole('heading', { name: 'Your class is paused' })).toBeVisible()
  state.group.status = 'active'
  await expect(page.getByRole('button', { name: 'Next activity', exact: true })).toBeVisible()
  await signal(page)
  state.failComplete = true
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('could not be saved')
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  state.failComplete = false
  await page.getByRole('button', { name: 'Next activity', exact: true }).click()
  await page.getByRole('button', { name: 'Finish lesson', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lesson complete', exact: true })).toBeVisible()
  await expect(progress).toHaveAttribute('aria-valuenow', '3')
  expect(state.group.status).toBe('active')
  state.group.status = 'completed'
  await expect(page.getByRole('heading', { name: 'Session complete', exact: true })).toBeVisible()
})

test('failed progress loading offers retry without starting a new session', async ({ page }) => {
  const state = await fixture(page)
  state.progressError = true
  await page.goto('/student/eeg-live')
  await signal(page)
  await expect(page.getByRole('button', { name: 'Retry loading lesson', exact: true })).toBeVisible()
  state.progressError = false
  await page.getByRole('button', { name: 'Retry loading lesson', exact: true }).click()
  await expect(page.getByText('Activity 1 of 3', { exact: true })).toBeVisible()
  expect(state.calls.some(call => call.path === '/api/sessions/start/')).toBe(false)
})

for (const width of [360, 768, 1024, 1440]) test(`teacher classroom controls, offline indicator and explicit ending at ${width}`, async ({ page }) => {
  const state = await fixture(page, 'teacher')
  state.group.participants[0].online = false
  await page.setViewportSize({ width, height: 1000 })
  await page.goto('/teacher/class-session/group')
  await expect(page.getByText('Offline', { exact: true })).toBeVisible()
  await page.screenshot({ path: `../.runtime/batch6-${width}-classroom.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Pause session', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume session', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resume session', exact: true }).click()
  await page.getByRole('button', { name: 'End session', exact: true }).click()
  state.failEnd = true
  await page.getByRole('button', { name: 'End and save report', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Unable to complete the request. Please try again.')
  await expect(page.getByRole('heading', { name: 'Session overview', exact: true })).toHaveCount(0)
  state.failEnd = false
  state.endGate = new Promise(resolve => { state.release = resolve })
  await page.getByRole('button', { name: 'End and save report', exact: true }).dblclick()
  try { await expect(page.getByRole('button', { name: 'End and save report', exact: true })).toBeDisabled(); expect(state.calls.filter(call => call.data?.action === 'end')).toHaveLength(2) } finally { state.release() }
  await expect(page.getByRole('heading', { name: 'Session overview', exact: true })).toBeVisible()
})

test('stale heartbeat cannot overwrite pause and navigation does not send an end request', async ({ page }) => {
  const state = await fixture(page, 'teacher')
  await page.goto('/teacher/class-session/group')
  await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible()
  state.holdHeartbeat = true
  await expect.poll(() => Boolean(state.release)).toBe(true)
  await page.getByRole('button', { name: 'Pause session', exact: true }).click()
  const staleResponse = page.waitForResponse(response => response.url().endsWith('/api/class-sessions/group/') && response.request().postDataJSON()?.action === 'heartbeat')
  state.release()
  await staleResponse
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.getByRole('button', { name: 'Resume session', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'All class sessions', exact: true }).click()
  await expect(page).toHaveURL(/\/teacher\/sessions$/)
  expect(state.calls.some(call => call.data?.action === 'end')).toBe(false)
})

test('failed student leave never claims completion and allows retry', async ({ page }) => {
  await fixture(page)
  await page.route('**/api/sessions/record/end/', route => route.fulfill({ status: 503, json: { detail: 'Unavailable' } }))
  await page.goto('/student/eeg-live')
  await signal(page)
  await expect(page.getByText('Activity 1 of 3', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Leave and save my session', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Session could not be saved')
  await expect(page.getByRole('heading', { name: 'Session complete', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save and finish session', exact: true })).toBeEnabled()
})

test('teacher logout sends authentication logout and no classroom termination', async ({ page }) => {
  const state = await fixture(page, 'teacher')
  await page.goto('/teacher/class-session/group')
  await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open account menu for Teacher', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Log out', exact: true }).click()
  await expect.poll(() => state.calls.some(call => call.path === '/api/auth/logout/')).toBe(true)
  expect(state.calls.some(call => call.data?.action === 'end')).toBe(false)
  expect(state.group.status).toBe('active')
})
