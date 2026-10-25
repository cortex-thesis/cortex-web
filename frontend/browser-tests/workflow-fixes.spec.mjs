import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function fixture(page, role, handler) {
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    const result = await handler(path, route.request())
    const body = result?.body ?? (path === '/api/auth/me/'
      ? { id: 'workflow-user', name: 'Workflow Test', role, pseudonym: 'workflow' }
      : path === '/api/notifications/' ? { notifications: [], unread_count: 0 }
      : path === '/api/sync/status/' ? { enabled: false }
      : path === '/api/class-sessions/' ? { sessions: [] } : {})
    await route.fulfill({ status: result?.status ?? 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
}

test('student home reuses dashboard and session data when returning from another page', async ({ page }) => {
  let dashboardReads = 0
  let sessionReads = 0
  await fixture(page, 'student', async path => {
    if (path === '/api/student/dashboard/') {
      dashboardReads++
      return { body: { student: { student_number: 'TEST' }, classes: [], unread_notifications: 0, active_session: null } }
    }
    if (path === '/api/student/sessions/') {
      sessionReads++
      return { body: { sessions: [], summary: { completed_sessions: 2, total_duration_seconds: 120, average_focus_score: 75 } } }
    }
  })
  await page.goto('/student/home')
  await expect(page.getByText('Completed sessions', { exact: true })).toBeVisible()
  await expect.poll(() => sessionReads).toBe(1)
  await page.getByRole('button', { name: /Get started.*Join a class/ }).click()
  await expect(page).toHaveURL(/join-class/)
  await page.getByRole('button', { name: 'Go back', exact: true }).click()
  await expect(page.getByText('Completed sessions', { exact: true })).toBeVisible()
  expect(dashboardReads).toBe(1)
  expect(sessionReads).toBe(1)
})

test('invalid class code can be cleared and entered again without a QR placeholder', async ({ page }) => {
  const attempts = []
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/student/classes/join/') {
      attempts.push(request.postDataJSON().code)
      return { status: 404, body: { detail: 'Class code not found.' } }
    }
  })
  await page.goto('/student/join-class')
  await expect(page.getByRole('button', { name: 'Scan QR code' })).toHaveCount(0)
  for (let index = 0; index < 4; index++) await page.getByLabel(`Code character ${index + 1} of 4`).fill('ABCD'[index])
  await page.getByRole('button', { name: 'Try another class code' }).click()
  await expect(page.getByLabel('Code character 1 of 4')).toBeFocused()
  for (let index = 0; index < 4; index++) await page.getByLabel(`Code character ${index + 1} of 4`).fill('WXYZ'[index])
  await expect(page.getByRole('button', { name: 'Try another class code' })).toBeVisible()
  expect(attempts).toEqual(['ABCD', 'WXYZ'])
})

test('continue without video saves the skip and advances with one click', async ({ page }) => {
  const saved = []
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/student/classes/1/lessons/2/') {
      const data = request.postDataJSON()
      if (data.slide_id) saved.push(data)
      return { body: { id: 2, title: 'Video workflow', package: 'enrichment', progress: { completed_slide_ids: [] }, slides: [
        { id: 10, title: 'Unavailable video', activity: { type: 'video', configuration: { template: 'instructional_video' } } },
        { id: 11, title: 'Next step', activity: { type: 'image', configuration: { template: 'visual_narrative', steps: [{ id: 'next', title: 'You moved ahead' }] } } },
      ] } }
    }
  })
  await page.goto('/student/class/1/lesson/2/practice')
  await page.getByRole('button', { name: 'Continue without video' }).first().click()
  await expect(page.getByRole('heading', { name: 'Next step', exact: true })).toBeVisible()
  expect(saved).toEqual([{ slide_id: 10, selected: 'continued_without_video' }])
})

test('practice saves an answer before Next and restores the unfinished step after reload', async ({ page }) => {
  const progress = { completed_slide_ids: [10], activity_evidence: {} }
  const drafts = []
  await fixture(page, 'student', async (path, request) => {
    if (path !== '/api/student/classes/1/lessons/2/') return
    if (request.method() === 'POST') {
      const data = request.postDataJSON()
      if (data.action === 'answer') {
        drafts.push(data)
        progress.activity_evidence[String(data.slide_id)] = { selected: data.selected, practice_correct: data.correct }
      } else if (data.slide_id) progress.completed_slide_ids.push(data.slide_id)
    }
    return { body: { id: 2, title: 'Resume practice', package: 'enrichment', progress, slides: [
      { id: 10, title: 'Already complete', activity: { type: 'text', configuration: {} } },
      { id: 11, title: 'Saved question', activity: { type: 'interactive', configuration: { template: 'multiple_choice', question: 'Pick Yes', choices: ['Yes', 'No'], answer: 'Yes' } } },
    ] } }
  })
  await page.goto('/student/class/1/lesson/2/practice')
  await expect(page.getByRole('heading', { name: 'Saved question', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Answer: Yes', exact: true }).click()
  await expect.poll(() => drafts.length).toBe(1)
  expect(progress.completed_slide_ids).toEqual([10])
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Saved question', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Correct.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Finish lesson', exact: false })).toBeEnabled()
  await page.getByRole('button', { name: 'Finish lesson', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Practice complete' })).toBeVisible()
  expect(progress.completed_slide_ids).toEqual([10, 11])
})

test('EEG resume restores the first unfinished step and its saved answer', async ({ page }) => {
  const completions = []
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/sessions/resume-session/eeg/') return { body: {
      lesson: { id: 2, title: 'Resume EEG', package: 'enrichment', slides: [
        { id: 10, title: 'Already complete', activity: { type: 'text', configuration: {} } },
        { id: 11, title: 'Saved EEG question', activity: { type: 'interactive', configuration: { template: 'multiple_choice', question: 'Pick Yes', choices: ['Yes', 'No'], answer: 'Yes' } } },
      ] }, progress: { completed_slide_ids: [10], responses: { 11: { selected: 'Yes', correct: true, attempt: 2 } }, last_sequence_number: 17 },
    } }
    if (path === '/api/sessions/resume-session/control/') return { body: { control_mode: 'free', status: 'active', ended_at: null } }
    if (path === '/api/sessions/resume-session/slides/11/' && request.postDataJSON().action === 'complete') completions.push(11)
  })
  await page.addInitScript(() => {
    if (location.pathname === '/student/eeg-live') history.replaceState({ usr: { sessionId: 'resume-session', devBypass: true }, key: 'resume', idx: 0 }, '')
  })
  await page.goto('/student/eeg-live')
  await expect(page.getByRole('heading', { name: 'Saved EEG question', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Correct.' })).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Lesson steps completed' })).toHaveAttribute('aria-valuenow', '1')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Saved EEG question', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Finish lesson', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Lesson complete', exact: true })).toBeVisible()
  expect(completions).toEqual([11])
})

test('journal without a completed session shows a useful empty state', async ({ page }) => {
  await fixture(page, 'student', async path => path === '/api/student/journals/' ? { status: 404, body: { detail: 'Complete a learning session before writing a journal.' } } : undefined)
  await page.goto('/student/journal')
  await expect(page.getByRole('heading', { name: 'Your first reflection starts after a session' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start a learning session' })).toBeVisible()
  await expect(page.getByText('Session complete', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
})

for (const [seconds, label] of [[20, 'Less than a minute'], [60, '1 minute'], [120, '2 minutes']]) {
  test(`journal duration formats ${seconds} seconds truthfully`, async ({ page }) => {
    await fixture(page, 'student', async path => path === '/api/student/journals/' ? { body: { session: { id: 'session', title: 'A completed lesson', duration_seconds: seconds, completed_tasks: [] }, entry: null } } : undefined)
    await page.goto('/student/journal')
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  })
}

test('teacher bell opens a dropdown and persists read actions without leaving the page', async ({ page }) => {
  let read = false
  await fixture(page, 'teacher', async (path, request) => {
    if (path === '/api/classes/') return { body: { classes: [{ id: 1, name: 'Test class', status: 'active' }] } }
    if (path === '/api/class-sessions/') return { body: { sessions: [] } }
    if (path === '/api/notifications/') {
      if (request.method() === 'POST') read = true
      return { body: { unread_count: read ? 0 : 1, notifications: [{ id: 'notification', kind: 'journal', title: 'A student shared a journal', body: 'A real event in your inbox.', link: '', createdAt: new Date().toISOString(), read }] } }
    }
  })
  await page.goto('/teacher/sessions')
  await expect(page.getByRole('option', { name: 'Choose a class' })).toHaveAttribute('disabled', '')
  await page.getByRole('button', { name: /^Notifications/ }).click()
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible()
  await expect(page).toHaveURL(/\/teacher\/sessions$/)
  await page.getByRole('button', { name: 'Mark all read' }).click()
  await expect(page.getByText('You’re all caught up', { exact: true })).toBeVisible()
  expect(read).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const [lessonIndex, position] of [[0, 4], [1, 4], [2, 2]]) {
  test(`enrichment ${lessonIndex + 1} challenge requires a complete response and saves it`, async ({ page }) => {
    const definitions = JSON.parse(await readFile(new URL('../../web/enrichment_lessons.json', import.meta.url), 'utf8'))
    const definition = definitions[lessonIndex]
    const saved = []
    await fixture(page, 'student', async (path, request) => {
      if (path === '/api/student/classes/1/lessons/2/') {
        const data = request.postDataJSON()
        if (data.slide_id) saved.push(data)
        return { body: {
          id: 2, title: definition.title, package: 'enrichment',
          progress: { completed_slide_ids: Array.from({ length: position }, (_, i) => i + 100) },
          slides: definition.slides.map((slide, i) => ({ id: i + 100, title: slide.title, activity: { type: slide.type, configuration: slide.configuration } })),
        } }
      }
    })
    await page.goto('/student/class/1/lesson/2/practice')
    const next = page.getByRole('button', { name: 'Next activity' })
    await expect(next).toBeDisabled()
    const config = definition.slides[position].configuration
    if (config.task_template === 'scenario_classifier') {
      for (let i = 0; i < config.scenarios.length; i++) {
        await page.getByRole('button', { name: config.scenarios[i].answer, exact: true }).click()
        if (i < config.scenarios.length - 1) {
          await expect(next).toBeDisabled()
          await page.getByRole('button', { name: 'Next clue' }).click()
        }
      }
    } else if (config.task_template === 'audio_sequence') {
      for (const [index, round] of config.rounds.entries()) {
        if (index === 0 && round.audio_url) {
          await page.getByRole('button', { name: '▶ Listen', exact: true }).click()
          await expect(page.getByRole('button', { name: /Low note/ })).toBeEnabled()
        } else await page.getByRole('button', { name: 'Show a visual prompt' }).click()
        for (const id of round.correct_order) {
          const item = config.items.find(item => item.id === id)
          await page.getByRole('button', { name: new RegExp(item.label) }).click()
        }
      }
    } else {
      await page.getByRole('button', { name: 'Tap', exact: true }).click()
      await expect(next).toBeDisabled()
      await page.getByRole('button', { name: 'Pause', exact: true }).click()
    }
    await expect(next).toBeEnabled()
    await next.click()
    await expect(page.getByRole('heading', { name: definition.slides[position + 1].title, exact: true })).toBeVisible()
    expect(saved.some(item => item.action === 'answer')).toBe(true)
    const completions = saved.filter(item => item.action !== 'answer')
    expect(completions).toHaveLength(1)
    expect(completions[0].slide_id).toBe(position + 100)
    expect(completions[0].selected).toBeTruthy()
    if (config.task_template === 'audio_sequence') expect(JSON.parse(completions[0].selected).rounds[0].audio_played).toBe(true)
  })
}
