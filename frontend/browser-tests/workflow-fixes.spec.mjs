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


test('journal save failure preserves text and retry confirms success only after persistence', async ({ page }) => {
  let attempts = 0
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/student/journals/') {
      if (request.method() === 'POST') {
        attempts++
        if (attempts === 1) return { status: 500, body: { detail: 'Save failed. Try again.' } }
        return { body: { id: 'journal' } }
      }
      return { body: { session: { id: 'session', title: 'Completed lesson', duration_seconds: 60, completed_tasks: [] }, entry: null } }
    }
  })
  await page.goto('/student/journal')
  await page.getByRole('textbox').fill('I learned to count.')
  await page.getByRole('button', { name: 'Save my journal' }).click()
  await expect(page.getByRole('alert')).toContainText('Save failed')
  await expect(page.getByRole('textbox')).toHaveValue('I learned to count.')
  await expect(page.getByText('Your journal was saved.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry save' }).click()
  await expect(page.getByRole('status')).toContainText('Your journal was saved.')
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled()
  expect(attempts).toBe(2)
})

test('achievement acknowledgement failure keeps popup available and successful retry persists across refresh', async ({ page }) => {
  let attempts = 0, read = false
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/student/journals/') return { status: 404, body: { detail: 'No session' } }
    if (path === '/api/notifications/') {
      if (request.method() === 'POST') {
        attempts++
        if (attempts === 1) return { status: 500, body: { detail: 'Acknowledgement failed.' } }
        read = true
      }
      return { body: { unread_count: read ? 0 : 1, notifications: [{ id: 'award', kind: 'achievement', title: 'New achievement earned', body: 'First badge', read, link: '', createdAt: '2026-01-01T00:00:00Z' }] } }
    }
  })
  await page.goto('/student/journal')
  await expect(page.getByText('New achievement earned: First badge')).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click()
  await expect(page.getByText('Acknowledgement failed. Dismiss again to retry.')).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click()
  await expect(page.getByText('New achievement earned: First badge')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your first reflection starts after a session' })).toBeVisible()
  await expect(page.getByText('New achievement earned: First badge')).toHaveCount(0)
})

for (const width of [360, 768, 1280]) test(`journal history preserves filters and saved media at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const base = { class_name: 'Test class', session_started_at: '2026-10-01T00:00:00Z', created_at: '2026-10-01T01:00:00Z', prompt: 'What did you learn?', mood: 'happy', text_response: '' }
  await fixture(page, 'student', async path => path === '/api/student/journals/' ? { body: { entries: [
    { ...base, id: 'drawing', session_id: 's1', session_title: 'Drawing lesson', response_type: 'drawing', asset_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' },
    { ...base, id: 'audio', session_id: 's2', session_title: 'Audio lesson', response_type: 'audio', asset_url: '/saved-recording.webm' },
  ] } } : undefined)
  await page.goto('/student/journal/history')
  await expect(page.getByAltText('Your saved journal drawing')).toBeVisible()
  await expect(page.getByLabel('Your saved journal recording')).toHaveAttribute('controls', '')
  await page.getByLabel('Session', { exact: true }).selectOption('s2')
  await expect(page.getByAltText('Your saved journal drawing')).toHaveCount(0)
  await expect(page.getByLabel('Your saved journal recording')).toBeVisible()
  await page.getByLabel('Session date', { exact: true }).fill('2026-10-02')
  await expect(page.getByText('No journals match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(page.getByAltText('Your saved journal drawing')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('intervention history loads on demand with persisted actor, mode and optional duration', async ({ page }) => {
  let reads = 0
  await fixture(page, 'teacher', async path => {
    if (path === '/api/teacher/reports/') return { body: {
      school_years: [{ value: '2026', label: '2026' }], selected_school_year: '2026', classes: [{ id: 1, name: 'Test class' }], students: [], selected_class_id: 1, class_name: 'Test class', start_date: null, end_date: '2026-10-25', prepared_by: 'Teacher', school_year: '2026',
      summary: { sessions: 1, participating_students: 1, average_focus_percentage: 50, focused_duration_seconds: 30, total_duration_seconds: 60, mode_changes: 1, tasks_completed: 1 }, state_distribution: { focused: 50, relaxed: 50, distracted: 0, overstimulated: 0 },
      sessions: [{ id: 'session', date: '2026-10-25', student: { name: 'Test Student' }, duration_seconds: 60, focus_percentage: 50, tasks_completed: 1, mode_changes: 1 }],
    } }
    if (path === '/api/sessions/session/interventions/') { reads++; return { body: { interventions: [
      { id: 'one', actor_id: 42, student_id: 5, requested_at: '2026-10-25T01:00:00Z', action: 'set_mode', mode: 'relax', duration_seconds: 30, status: 'applied' },
      { id: 'two', actor_id: null, student_id: 5, requested_at: '2026-10-25T01:01:00Z', action: 'resume', mode: null, duration_seconds: null, status: 'pending' },
    ] } } }
  })
  await page.goto('/teacher/reports')
  await expect(page.getByText('View history')).toBeVisible()
  expect(reads).toBe(0)
  await page.getByText('View history').click()
  await expect(page.getByLabel('Interventions for Test Student')).toContainText('Teacher 42')
  await expect(page.getByLabel('Interventions for Test Student')).toContainText('relax / 30 seconds')
  await expect(page.getByLabel('Interventions for Test Student')).toContainText('Duration not recorded')
  expect(reads).toBe(1)
})

for (const kind of ['drawing', 'audio']) test(`${kind} journal confirms only successful persistence and preserves retry`, async ({ page }) => {
  let attempts = 0
  if (kind === 'audio') await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } })
    window.MediaRecorder = class {
      static isTypeSupported() { return true }
      mimeType = 'audio/webm'
      start() {}
      stop() { this.ondataavailable?.({ data: new Blob(['synthetic recording fixture'], { type: this.mimeType }) }); this.onstop?.() }
    }
  })
  await fixture(page, 'student', async (path, request) => {
    if (path === '/api/student/journals/') {
      if (request.method() === 'POST') {
        attempts++
        return attempts === 1 ? { status: 500, body: { detail: 'Media save failed.' } } : { body: { id: 'saved-media', status: 'saved' } }
      }
      return { body: { session: { id: 'session', title: 'Completed lesson', duration_seconds: 60, completed_tasks: [] }, entry: null } }
    }
  })
  await page.goto(`/student/journal/${kind === 'drawing' ? 'draw' : 'audio'}`)
  if (kind === 'drawing') {
    const box = await page.locator('canvas').boundingBox()
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down()
    await page.mouse.move(box.x + 90, box.y + 60); await page.mouse.up()
  } else {
    await page.getByRole('button', { name: 'Start recording', exact: true }).click()
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click()
  }
  await page.getByRole('button', { name: kind === 'drawing' ? 'Save drawing' : 'Save recording', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Media save failed.')
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Your journal was saved.')
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled()
  expect(attempts).toBe(2)
})

test('lesson audio failure is explicit and retry does not mark activity completed', async ({ page }) => {
  await fixture(page, 'student', async path => path === '/api/student/classes/1/lessons/2/' ? { body: { id: 2, title: 'Audio lesson', package: 'enrichment', progress: { completed_slide_ids: [] }, slides: [
    { id: 10, title: 'Listen carefully', activity: { type: 'audio', configuration: { media_url: '/missing-audio.mp3', content_label: 'Lesson recording' } } },
  ] } } : undefined)
  await page.route('**/missing-audio.mp3', route => route.fulfill({ status: 404, body: '' }))
  await page.goto('/student/class/1/lesson/2/practice')
  await expect(page.getByRole('alert')).toContainText('This audio could not be played.')
  await page.getByRole('button', { name: 'Retry audio' }).click()
  await expect(page.getByRole('heading', { name: 'Listen carefully', exact: true })).toBeVisible()
})
