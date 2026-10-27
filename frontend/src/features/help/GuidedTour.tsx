import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { hasSeenOnboarding, rememberOnboarding, type HelpRole } from './persistence'
import styles from './GuidedTour.module.css'

import { readTourRun, tourRunKey, type TourRun as Run } from './tourState'

type Step = { title: string; text: string; target: string; action?: string; result?: RegExp; expanded?: boolean; pressed?: boolean; browse?: boolean; practiceEntry?: boolean; chapter?: string; nextRoute?: string }
const target = (id: string) => `[data-tour="${id}"]`
const teacherNav = (route: string) => `[data-guide="/teacher/${route}"]`
const browsingRoutes = /^\/student\/(classes|class\/[^/]+(?:\/package\/[^/]+|\/lesson\/[^/]+)?)$/
const stepsFor = (role: HelpRole): Step[] => role === 'student' ? [
  { chapter: 'Lessons', title: 'Find something to learn', text: 'Tap Start a lesson to open your classes and lessons.', target: target('student-lessons'), action: target('student-lessons'), result: /^\/student\/classes$/, nextRoute: '/student/classes' },
  { chapter: 'Lessons', title: 'Choose your own lesson', text: 'Choose a class, package and available lesson for the practice tour. If none are available, ask your teacher about enrollment.', target: '[data-tour="class-choice"], [data-tour="package-choice"], [data-tour="lesson-choice"]', action: '[data-tour="class-choice"], [data-tour="package-choice"], [data-tour="lesson-choice"]', browse: true, result: /^\/student\/class\/[^/]+\/lesson\/[^/]+$/ },
  { chapter: 'Practice', title: 'Practice introduction', text: 'Choose Practice on this introduction page. Next opens the real lesson player for one representative activity. Onboarding answers and completion do not change schoolwork, scores or achievements.', target: target('practice-mode'), action: target('practice-start'), result: /^\/student\/class\/[^/]+\/lesson\/[^/]+\/practice$/ },
  { chapter: 'Practice', title: 'Practice activity', text: 'Use the highlighted answer area in the lesson player. Read the activity instruction and feedback, and try again if needed. Your onboarding answers are not saved as learning progress.', target: '[data-tour="practice-player"] [data-tour="activity-answer-area"]' },
  { chapter: 'Practice', title: 'Practice finished', text: 'You finished the onboarding activity, not a curriculum lesson. Next returns to the feature tour and introduces your Achievement Garden.', target: '[data-tour="practice-player"] h2', nextRoute: '/student/home' },
  { chapter: 'Garden', title: 'See your garden grow', text: 'Tap the flower card to explore your actual Achievement Garden.', target: target('student-garden'), action: target('student-garden'), result: /^\/student\/achievements$/, nextRoute: '/student/achievements' },
  { chapter: 'Garden', title: 'Every bloom tells a story', text: 'Tap a flower or bud to read its milestone. Only normal learning achievement rules can unlock a bloom.', target: target('garden-flower') },
  { chapter: 'Your learning', title: 'Look back at your learning', text: 'Tap Sessions to find saved recorded sessions and available summaries.', target: target('student-sessions'), action: target('student-sessions'), result: /^\/student\/sessions$/, nextRoute: '/student/sessions' },
  { chapter: 'Your learning', title: 'Your saved learning', text: 'Search and filter your recorded sessions here. Practice progress is also shown with your class lessons.', target: target('student-session-search') },
  { chapter: 'Help', title: 'Help is always nearby', text: 'Tap Settings to find your guides and restart this tour.', target: target('student-settings'), action: target('student-settings'), result: /^\/student\/settings$/, nextRoute: '/student/settings' },
  { chapter: 'Help', title: 'Make yourself at home', text: 'Open Help & Guides for quick answers, practical instructions and About Cortex.', target: '[data-guide="/student/help"]', action: '[data-guide="/student/help"]', result: /^\/student\/help$/, nextRoute: '/student/help' },
] : [
  { title: 'See your classroom workspace', text: 'Dashboard connects live learners with saved summaries. Select Classes to find your sections and learning packages.', target: teacherNav('classes'), action: teacherNav('classes'), result: /^\/teacher\/classes$/, nextRoute: '/teacher/classes' },
  { title: 'Classroom and learner records', text: 'Open a class for Overview, Students and Analytics. New sections include seven packages. The tour does not create classes or change enrollment.', target: '[data-tour-screen="teacher"]' },
  { title: 'Find session preparation', text: 'Select Sessions to see the real preparation screen and saved classroom sessions.', target: teacherNav('sessions'), action: teacherNav('sessions'), result: /^\/teacher\/sessions$/, nextRoute: '/teacher/sessions' },
  { title: 'Prepare, monitor and guide', text: 'Prepare a class lobby, then choose a lesson to send invitations. Live sessions offer pause, resume and class modes; this tour activates none.', target: '[data-tour-screen="teacher"]' },
  { title: 'Read estimates with care', text: 'EEG estimates are Focused, Relaxed, Distracted or Overstimulated; Focus Mode and Relax Mode describe delivery. Missing or stale signals cannot establish a current state.', target: '[data-tour-screen="teacher"]' },
  { title: 'Find the saved evidence', text: 'Select Reports to see recorded learning information and available filters.', target: teacherNav('reports'), action: teacherNav('reports'), result: /^\/teacher\/reports$/, nextRoute: '/teacher/reports' },
  { title: 'Review the learning record', text: 'Review recorded progress and state estimates here; Advanced reports adds lesson and slide detail. Missing EEG limits interpretation, and percentages are not clinical conclusions.', target: '[data-tour-screen="teacher"]' },
  { title: 'Open your account menu', text: 'Select your account control to find Settings.', target: target('teacher-account'), action: target('teacher-account'), expanded: true },
  { title: 'Go to Settings', text: 'Choose Settings from the open account menu.', target: target('teacher-settings'), action: target('teacher-settings'), result: /^\/teacher\/settings$/, nextRoute: '/teacher/settings' },
  { title: 'Keep practical help nearby', text: 'Select Help & Guides for searchable instructions, troubleshooting and tour replay.', target: '[data-guide="/teacher/help"]', action: '[data-guide="/teacher/help"]', result: /^\/teacher\/help$/, nextRoute: '/teacher/help' },
]
export function TourLaunch() {
  const navigate = useNavigate()
  const role = useAuthStore(s => s.user?.role)
  const location = useLocation()
  const topic = new URLSearchParams(location.search).get('topic')
  const first = role === 'teacher' ? topic === 'reports' || topic === 'advanced' ? 5 : topic === 'sessions' || topic === 'eeg' ? 2 : 0 : 0
  useEffect(() => { navigate(role === 'teacher' ? '/teacher/dashboard' : '/student/home', { replace: true, state: { launchCortexTour: true, first } }) }, [navigate, role, first])
  return null
}
export function HelpGuidance() {
  const user = useAuthStore(s => s.user)
  const initialized = useAuthStore(s => s.isInitialized)
  const authenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()
  if (!initialized || !authenticated || !user || !location.pathname.startsWith(`/${user.role}/`) || (user.role !== 'student' && user.role !== 'teacher')) return null
  return <TourController key={`${user.id}:${user.role}`} id={user.id} role={user.role} />
}
function TourController({ id, role }: { id: string; role: HelpRole }) {
  const location = useLocation()
  const currentRoute = location.pathname + location.search
  const navigate = useNavigate()
  const key = tourRunKey(id, role)
  const home = role === 'student' ? '/student/home' : '/teacher/dashboard'
  const steps = useMemo(() => stepsFor(role), [role])
  const [run, setRun] = useState<Run | null>(() => readTourRun(key, steps.length))
  const [hiddenOffer, setHiddenOffer] = useState(false)
  const [pending, setPending] = useState(() => readTourRun(key, steps.length)?.pending ?? false)
  const [highlight, setRect] = useState<{ box: DOMRect | null; index: number; route: string } | null>(null)
  const rect = highlight?.index === run?.index && highlight?.route === location.pathname ? highlight.box : null
  const [viewport, setViewport] = useState(() => ({ width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight, x: window.visualViewport?.offsetLeft ?? 0, y: window.visualViewport?.offsetTop ?? 0 }))
  const [panelSize, setPanelSize] = useState({ width: 360, height: 280 })
  const panel = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const baseStep = run?.phase === 'running' ? steps[run.index] : undefined
  const practiceStage = role === 'student' && run?.phase === 'running' && run.index >= 2 && run.index <= 4
  const [activityReady, setActivityReady] = useState(false)
  const [activityTemplate, setActivityTemplate] = useState('')
  const step = useMemo(() => role === 'student' && run?.index === 3 && baseStep && activityReady
    ? { ...baseStep, target: '[data-tour="onboarding-activity-finish"]' }
    : baseStep, [role, run?.index, baseStep, activityReady])
  const [transitioning, setTransitioning] = useState(false)
  const transitionLock = useRef(false)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function beginTransition() {
    transitionLock.current = true
    setTransitioning(true)
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    transitionTimer.current = setTimeout(() => { transitionLock.current = false; setTransitioning(false) }, 180)
  }
  useEffect(() => () => { if (transitionTimer.current) clearTimeout(transitionTimer.current) }, [])

  const offered = !run && !hiddenOffer && location.pathname === home && !hasSeenOnboarding(id, role)
  const welcome = offered || run?.phase === 'welcome'
  const visible = Boolean(run || offered)
  function save(next: Run | null) {
    setRun(next)
    try { if (next) sessionStorage.setItem(key, JSON.stringify(next)); else sessionStorage.removeItem(key) } catch { /* Tour remains usable in memory. */ }
  }
  function exit() {
    rememberOnboarding(id, role, 'dismissed')
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    transitionLock.current = false; setTransitioning(false)
    save(null); setHiddenOffer(true); setPending(false)
  }
  function advance(destination = currentRoute) {
    if (!run) return
    beginTransition()
    setPending(false)
    if (run.index + 1 >= steps.length) { rememberOnboarding(id, role, 'completed'); save({ ...run, phase: 'complete', route: destination }) }
    else save({ index: run.index + 1, phase: 'running', route: destination, history: [...(run.history ?? []), run.route] })
  }
  function next() {
    if (!run || run.phase !== 'running' || transitionLock.current) return
    let destination = step?.nextRoute ?? currentRoute
    if (role === 'student' && run.index === 1 && !/^\/student\/class\/[^/]+\/lesson\/[^/]+$/.test(location.pathname)) return
    if (role === 'student' && run.index === 2) {
      if (!/^\/student\/class\/[^/]+\/lesson\/[^/]+$/.test(location.pathname)) return
      destination = `${location.pathname}/practice?context=onboarding&stage=activity`
    }
    if (role === 'student' && run.index === 3) {
      const finish = document.querySelector<HTMLButtonElement>('[data-tour="onboarding-activity-finish"]')
      if (finish && !finish.disabled) finish.click()
      return
    }
    if (step?.expanded || step?.pressed) {
      const control = document.querySelector<HTMLElement>(step.target)
      if (control) {
        if (control.getAttribute(step.expanded ? 'aria-expanded' : 'aria-pressed') === 'true') advance()
        else control.click()
        return
      }
    }
    advance(destination)
    if (destination !== currentRoute) navigate(destination)
  }
  function back() {
    if (!run || run.index === 0 || transitionLock.current) return
    beginTransition()
    setPending(false)
    const previousRoute = run.history?.[run.index - 1] ?? home
    save({ index: run.index - 1, phase: 'running', route: previousRoute, history: run.history?.slice(0, -1) })
    if (previousRoute !== currentRoute) navigate(previousRoute)
  }
  useEffect(() => {
    if (!(location.state as { launchCortexTour?: boolean } | null)?.launchCortexTour) return
    queueMicrotask(() => { save({ index: (location.state as { first?: number }).first ?? 0, phase: 'welcome', route: home }); setHiddenOffer(false); setPending(false) })
    navigate(location.pathname, { replace: true, state: null })
    // A launch is an explicit route-state command, consumed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])
  useEffect(() => {
    if (!visible) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    heading.current?.focus({ preventScroll: true })
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }) }
  }, [visible, run?.index, run?.phase])
  useEffect(() => {
    if (!visible) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); exit() } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key])
  useEffect(() => {
    if (!step?.action) return
    const click = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(step.action!)) { setPending(true); if (run) save({ ...run, pending: true }) }
    }
    document.addEventListener('click', click, true)
    return () => document.removeEventListener('click', click, true)
    // Persist an intended action so a reload between route commit and progression can recover.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.action, run])
  useEffect(() => {
    if (!pending || !step) return
    const check = () => {
      if ((step.result?.test(location.pathname) && (!step.practiceEntry || location.pathname === `${run?.route}/practice`)) || (step.expanded && document.querySelector(`${step.target}[aria-expanded="true"]`)) || (step.pressed && document.querySelector(`${step.target}[aria-pressed="true"]`))) {
        const destination = role === 'student' && run?.index === 1 ? `${location.pathname}?context=onboarding` : currentRoute
        advance(destination)
        if (destination !== currentRoute) navigate(destination, { replace: true })
      }
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'aria-pressed'] })
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, location.pathname, run?.index])
  useEffect(() => {
    let cancelled = false
    if (role === 'student' && run?.phase === 'running' && run.index === 2 && /\/practice$/.test(location.pathname) && new URLSearchParams(location.search).get('context') === 'onboarding') queueMicrotask(() => { if (!cancelled) advance(currentRoute) })
    return () => { cancelled = true }
    // Recover original player links without replaying the introduction or writing progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, run?.index, run?.phase, location.pathname, location.search])
  useEffect(() => {
    if (role !== 'student' || run?.phase !== 'running' || run.index !== 3) return
    const check = () => {
      const finish = document.querySelector<HTMLButtonElement>('[data-tour="onboarding-activity-finish"]')
      setActivityReady(Boolean(finish && !finish.disabled))
      setActivityTemplate(document.querySelector<HTMLElement>('[data-tour="practice-player"]')?.dataset.practiceTemplate ?? '')
      if (document.querySelector('[data-tour="practice-player"][data-practice-context="onboarding"][data-practice-complete="true"]')) {
        const destination = `${location.pathname}?context=onboarding&stage=finish`
        advance(destination)
        navigate(destination, { replace: true })
      }
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-practice-complete', 'data-practice-template', 'disabled'] })
    return () => observer.disconnect()
    // The player owns activity completion; the tour only follows its explicit onboarding state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, run?.index, run?.phase, location.pathname])
  useLayoutEffect(() => {
    if (!step || (run?.route && currentRoute !== run.route && !pending && !(step.browse && browsingRoutes.test(location.pathname)))) { queueMicrotask(() => setRect(null)); return }
    let highlighted: HTMLElement | null = null
    let frame = 0
    let scrolled = false
    const resize = new ResizeObserver(() => schedule())
    const update = () => {
      const candidate = [...document.querySelectorAll<HTMLElement>(step.target)].find(element => { const bounds = element.getBoundingClientRect(); return bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== 'hidden' })
      const box = candidate?.getBoundingClientRect()
      const usable = candidate && box && box.width > 0 && box.height > 0 && getComputedStyle(candidate).visibility !== 'hidden'
      if (highlighted !== candidate) {
        highlighted?.removeAttribute('data-guided'); resize.disconnect()
        highlighted = usable ? candidate : null
        if (highlighted) { highlighted.setAttribute('data-guided', 'true'); resize.observe(highlighted) }
      }
      if (usable && (!scrolled || (step.action && box.height < window.innerHeight - 160 && (box.top < 50 || box.bottom > window.innerHeight - 80)))) { scrolled = true; candidate.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }) }
      const next = usable ? candidate.getBoundingClientRect() : null
      setRect(old => old?.index === run?.index && old?.route === location.pathname && old?.box?.x === next?.x && old?.box?.y === next?.y && old?.box?.width === next?.width && old?.box?.height === next?.height ? old : { box: next, index: run?.index ?? -1, route: location.pathname })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-expanded', 'aria-pressed'] })
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true)
    schedule()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); highlighted?.removeAttribute('data-guided'); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true) }
  }, [step?.target, run?.index, run?.route, location.pathname, currentRoute, step, pending])
  useLayoutEffect(() => {
    const update = () => setViewport({ width: window.visualViewport?.width ?? window.innerWidth, height: window.visualViewport?.height ?? window.innerHeight, x: window.visualViewport?.offsetLeft ?? 0, y: window.visualViewport?.offsetTop ?? 0 })
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update) }
  }, [])
  useLayoutEffect(() => {
    if (!panel.current) return
    const observer = new ResizeObserver(([entry]) => setPanelSize({ width: entry.target.getBoundingClientRect().width, height: entry.target.getBoundingClientRect().height }))
    observer.observe(panel.current)
    return () => observer.disconnect()
  }, [visible])
  const practiceGuidance = role === 'student' && run?.phase === 'running' && (run.index === 3 || run.index === 4) && /\/practice$/.test(location.pathname)
  useLayoutEffect(() => {
    if (practiceGuidance) {
      document.documentElement.dataset.practiceGuidance = 'true'
      document.documentElement.style.setProperty('--practice-guidance-height', `${Math.min(panelSize.height, viewport.height - 32) + 24}px`)
    }
    return () => { delete document.documentElement.dataset.practiceGuidance; document.documentElement.style.removeProperty('--practice-guidance-height') }
  }, [practiceGuidance, panelSize.height, viewport.height])
  const browseGuidance = visible && role === 'student' && Boolean(step?.browse) && browsingRoutes.test(location.pathname)
  useLayoutEffect(() => {
    if (browseGuidance) {
      document.documentElement.dataset.browseGuidance = 'true'
      document.documentElement.style.setProperty('--browse-guidance-height', `${Math.min(panelSize.height, viewport.height - 32) + 24}px`)
    }
    return () => { delete document.documentElement.dataset.browseGuidance; document.documentElement.style.removeProperty('--browse-guidance-height') }
  }, [browseGuidance, panelSize.height, viewport.height])
  if (!visible) return null
  const gardenDetail = step?.target === target('garden-flower') ? document.querySelector('[data-tour="garden-flower"] [role="tooltip"]')?.getBoundingClientRect() : null
  const anchor = rect && gardenDetail ? { left: Math.min(rect.left, gardenDetail.left), right: Math.max(rect.right, gardenDetail.right), top: Math.min(rect.top, gardenDetail.top), bottom: Math.max(rect.bottom, gardenDetail.bottom) } : rect
  const gap = 16
  const width = viewport.width
  const height = viewport.height
  const panelWidth = Math.min(panelSize.width, width - gap * 2)
  const above = anchor ? Math.max(0, anchor.top - viewport.y - gap * 2) : 0
  const below = anchor ? Math.max(0, viewport.y + height - anchor.bottom - gap * 2) : 0
  const sideRoom = anchor ? Math.max(anchor.left - viewport.x, viewport.x + width - anchor.right) : 0
  const dockedPractice = (browseGuidance || practiceGuidance) && width <= 800
  const availableHeight = dockedPractice ? Math.min(280, Math.max(240, height * .4), height - gap * 2) : anchor && sideRoom < panelWidth + gap * 2 && Math.max(above, below) >= 240 ? Math.min(height - gap * 2, Math.max(above, below)) : height - gap * 2
  const panelHeight = Math.min(panelSize.height, availableHeight)
  const minX = viewport.x + gap
  const minY = viewport.y + gap
  const maxX = viewport.x + width - gap - panelWidth
  const maxY = viewport.y + height - gap - panelHeight
  let left = viewport.x + (width - panelWidth) / 2
  let top = viewport.y + (height - panelHeight) / 2
  if (anchor) {
    const candidates = [
      { left: anchor.right + gap, top: Math.max(minY, Math.min(maxY, anchor.top)) },
      { left: anchor.left - panelWidth - gap, top: Math.max(minY, Math.min(maxY, anchor.top)) },
      { left: Math.max(minX, Math.min(maxX, anchor.left)), top: anchor.top - panelHeight - gap },
      { left: Math.max(minX, Math.min(maxX, anchor.left)), top: anchor.bottom + gap },
    ]
    const fit = candidates.find(candidate => candidate.left >= minX && candidate.left <= maxX && candidate.top >= minY && candidate.top <= maxY)
    if (fit) { left = fit.left; top = fit.top }
    else {
      // Clamp to the visible viewport, even when the target fills the page.
      left = anchor.left
      top = anchor.top - panelHeight - gap >= minY ? anchor.top - panelHeight - gap : anchor.bottom + gap
    }
  }
  left = Math.max(minX, Math.min(maxX, left))
  top = Math.max(minY, Math.min(maxY, top))
  if (dockedPractice) {
    left = viewport.x + (width - panelWidth) / 2
    top = viewport.y + height - panelHeight - gap
  }
  if ((browseGuidance || practiceGuidance) && width > 800) {
    left = viewport.x + width - panelWidth - gap
    top = Math.max(minY, Math.min(maxY, anchor?.top ?? minY))
  }
  const interrupted = run?.phase === 'running' && currentRoute !== run.route && !pending && !(step?.browse && browsingRoutes.test(location.pathname))
  return createPortal(<>
    {rect && step && <div className={styles.spotlight} aria-hidden="true" style={{ left: Math.max(0, rect.left - 4), top: Math.max(0, rect.top - 4), width: Math.min(width, rect.width + 8), height: rect.height + 8 }} />}
    <div ref={panel} role="dialog" aria-modal="false" aria-labelledby="cortex-tour-heading" className={styles.panel} style={{ left, top, maxWidth: width - gap * 2, maxHeight: availableHeight }}>
      <div className={styles.top}><span>{welcome ? 'Welcome to Cortex' : run?.phase === 'complete' ? 'Exploration complete' : `${step?.chapter ?? 'Workspace'}${practiceStage ? ` ${(run?.index ?? 2) - 1} of 3` : ''} / Tour ${(run?.index ?? 0) + 1} of ${steps.length}`}</span><button onClick={exit} aria-label="Exit tour">×</button></div>
      <div key={`${run?.phase}:${run?.index}`} className={styles.stepContent}>
      {run?.phase === 'running' && <progress className={styles.progress} max={steps.length} value={run.index + 1} aria-label="Tour progress" />}
      <h2 id="cortex-tour-heading" ref={heading} tabIndex={-1}>{welcome ? role === 'student' ? 'Let’s explore together' : 'Discover your teaching workspace' : run?.phase === 'complete' ? 'You know your way around' : step?.title}</h2>
      <div className={styles.body} tabIndex={0} role="region" aria-label="Tour details">
      {welcome ? <><p>{role === 'student' ? 'Cortex brings lessons and learning support together. Try the real controls with a little guidance.' : 'Follow the real workflow from classes to sessions, records and practical help. No session is started by the tour.'}</p><div className={styles.actions}><button onClick={() => save({ index: run?.index ?? 0, phase: 'running', route: home })}>Show me around</button><button type="button" onClick={exit}>Maybe later</button></div></> : run?.phase === 'complete' ? <><p>Keep exploring at your own pace. Help & Guides is always in Settings.</p><div className={styles.actions}><button onClick={() => { save(null); navigate(home) }}>Return Home</button><button onClick={() => { save(null); navigate(`/${role}/help`) }}>Browse Help & Guides</button><button onClick={() => save(null)}>Continue exploring</button></div></> : <>
        {role === 'student' && run?.index === 3 && <p id="onboarding-answer-hint" className={styles.answerHint} role="status">{activityReady
          ? 'Answer complete. Select Next to continue.'
          : activityTemplate === 'word_search'
            ? 'Find every word in the highlighted grid to unlock Next.'
            : 'Answer the highlighted activity to unlock Next.'}</p>}
        <p>{step?.text}</p>
        {!rect && <p role="status">This control is not available on this screen yet. You can wait, close the tour, or return to the previous screen.</p>}
        {interrupted && !rect && <button onClick={() => navigate(run!.route)}>Return to tour screen</button>}

      </>}
      </div>
      </div>
      {run?.phase === 'running' && <footer className={styles.footer} aria-label="Tour navigation">
        <button type="button" disabled={run.index === 0 || transitioning} onClick={(event) => { if (event.detail < 2) back() }} onKeyDown={(event) => { if (event.repeat) event.preventDefault() }}>Back</button>
        <button type="button" aria-describedby={role === 'student' && run.index === 3 ? 'onboarding-answer-hint' : undefined} disabled={transitioning || (role === 'student' && (run.index === 1 || (run.index === 3 && !activityReady)))} onClick={(event) => { if (event.detail < 2) next() }} onKeyDown={(event) => { if (event.repeat) event.preventDefault() }}>{run.index === steps.length - 1 ? 'Finish tour' : 'Next'}</button>
      </footer>}
    </div>
  </>, document.body)
}
