import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Opt-in against a sanitized export of the actual restored database definitions.
const fixturePath = process.env.CORTEX_RESTORATION_FIXTURE
const lessons = fixturePath ? JSON.parse(await readFile(fixturePath, 'utf8')) : []
for (const lesson of lessons) test(`restored ${lesson.id}: all eight screens use the standard Practice player`, async ({page}) => {
  let position = 0
  await page.setViewportSize({width: 390, height: 844})
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let value = {}
    if (path === '/api/auth/me/') value = {id:'restoration-test',name:'Test learner',role:'student'}
    else if (path === '/api/notifications/') value = {notifications:[],unread_count:0}
    else if (path === '/api/class-sessions/') value = {sessions:[]}
    else if (path === '/api/student/preferences/') value = {sound_enabled:false}
    else if (path === `/api/student/classes/1/lessons/${lesson.id}/`) value = {...lesson,progress:{completed_slide_ids:lesson.slides.slice(0,position).map(s=>s.id),activity_evidence:{}}}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
  })
  expect(lesson.slides).toHaveLength(8)
  for (position = 0; position < 8; position++) {
    await page.goto(`/student/class/1/lesson/${lesson.id}/practice`)
    await expect(page.getByRole('heading',{name:lesson.slides[position].title,exact:true})).toBeVisible()
    await expect(page.getByText(`Activity ${position+1} of 8`,{exact:true})).toBeVisible()
    await expect(page.getByRole('button',{name:'Back to lessons',exact:true})).toBeVisible()
    expect(lesson.slides[position].activity.configuration.task_template).not.toBe('creative_experience')
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
})

for (const [id, position] of [[17,3],[18,4]]) if (lessons.length) test(`refined ${id}: familiar choices retry and save the original answer`, async ({page}) => {
  const lesson = lessons.find(row=>row.id===id), slide = lesson.slides[position]
  const config = slide.activity.configuration, saved = []
  await page.route('**/api/**', async route=>{
    const path = new URL(route.request().url()).pathname
    let value = {}
    if (path==='/api/auth/me/') value={id:'refinement-test',name:'Test learner',role:'student'}
    else if (path==='/api/notifications/') value={notifications:[],unread_count:0}
    else if (path==='/api/class-sessions/') value={sessions:[]}
    else if (path==='/api/student/preferences/') value={sound_enabled:false}
    else if (path===`/api/student/classes/1/lessons/${id}/`) {
      const body = route.request().method()==='POST' ? route.request().postDataJSON() : {}
      if (body.slide_id) saved.push(body)
      value={...lesson,progress:{completed_slide_ids:lesson.slides.slice(0,position).map(s=>s.id),activity_evidence:{}}}
    }
    await route.fulfill({contentType:'application/json',body:JSON.stringify(value)})
  })
  await page.goto(`/student/class/1/lesson/${id}/practice`)
  await page.getByRole('button',{name:config.choices.find(c=>c!==config.answer),exact:true}).click()
  await expect(page.getByRole('button',{name:'Next activity',exact:true})).toBeDisabled()
  await page.getByRole('button',{name:'Try again',exact:true}).click()
  await page.getByRole('button',{name:config.answer,exact:true}).click()
  await expect(page.getByText(config.correct_feedback,{exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Next activity',exact:true}).click()
  await expect(page.getByRole('heading',{name:lesson.slides[position+1].title,exact:true})).toBeVisible()
  expect(saved).toEqual([{slide_id:slide.id,selected:config.answer}])
})
