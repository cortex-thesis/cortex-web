import { version } from '../../../package.json'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, CircleHelp } from 'lucide-react'
import { PlayfulZoneTemplate, TeacherDashboardTemplate } from '../../components/templates'
import { useAuthStore } from '../../store/authStore'
import { topicsFor } from './content'
import { hasSeenOnboarding, type HelpRole } from './persistence'
import styles from './Help.module.css'

function useHeadingFocus(key: string | number) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => { ref.current?.focus() }, [key])
  return ref
}

export default function HelpCenter() {
  const user = useAuthStore(s => s.user)!
  const role = user.role as HelpRole
  const home = role === 'teacher' ? '/teacher/dashboard' : '/student/home'
  const root = `/${role}/help`
  const location = useLocation()
  const [search, setSearch] = useState('')
  const heading = useHeadingFocus(location.pathname + location.hash)
  const topics = topicsFor(role)
  const selected = topics.find(topic => `#${topic.id}` === location.hash)
  const results = topics.filter(topic => `${topic.category} ${topic.title} ${topic.description} ${topic.steps.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
  const body = <div className={`${styles.page} ${role === 'student' ? styles.student : ''}`}>
    <Link to={home}>← Back to {role === 'teacher' ? 'dashboard' : 'Home'}</Link>
    <>
      <header className={styles.hero}><CircleHelp size={36} aria-hidden="true" /><span className={styles.eyebrow}>{role === 'teacher' ? 'Your teaching companion' : 'A little help, whenever you need it'}</span><h1 ref={heading} tabIndex={-1}>Help & Guides</h1><p>{role === 'teacher' ? 'Practical guides for your classroom, learning sessions and reports.' : 'Explore, try something new, and find your next learning step.'}</p><div className={styles.actions}><Link className={styles.primary} to={`${root}/tour`}>{hasSeenOnboarding(user.id, role) ? 'Restart onboarding' : 'Start exploring'}</Link><Link to={`${root}#about`}>About Cortex</Link></div></header>
      {location.hash === '#about' ? <article className={styles.panel}><Link to={root}>← All help topics</Link><h2>About Cortex</h2><p>Cortex is an assistive educational application for ADHD learners in SPED transition curriculum settings. Students explore lessons and activities; teachers guide classes and review learning records.</p><p>{role === 'student' ? 'EEG signals can help Cortex estimate when to offer learning support. It cannot read your thoughts, and it does not define what you can do.' : 'EEG-derived signals are classified into learning-related cognitive-state estimates. Supported rules can adapt instructional presentation, refocusing activities and breathing support. Signal quality and available recordings limit interpretation.'}</p><p>Cognitive-state classifications are system estimates, not an ADHD diagnosis or clinical conclusions. Collect EEG only through the supported consent and acquisition workflow. This help experience records no EEG.</p><p>Frontend package version: {version} (project configuration).</p></article> : selected ? <article className={styles.panel}><Link to={root}>← All help topics</Link><span className={styles.eyebrow}>{selected.category}</span><h2>{selected.title}</h2><p>{selected.description}</p><ol>{selected.steps.map(step => <li key={step}>{step}</li>)}</ol>{selected.path && <Link className={styles.primary} to={selected.path}>Open {selected.path.split('/').pop()}</Link>}<p><Link to={`${root}/tour?topic=${selected.id}`}>Explore this workflow in the app</Link></p><h3>Related guides</h3>{topics.filter(topic => topic.category === selected.category && topic.id !== selected.id).map(topic => <p key={topic.id}><Link to={`${root}#${topic.id}`}>{topic.title}</Link></p>)}</article> : <>
        <label className={styles.search}>Search help topics<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Try lessons, EEG, reports…" /></label>
        <p role="status">{results.length} {results.length === 1 ? 'guide' : 'guides'} found</p>
        {!results.length && <p>Try a shorter phrase, or clear your search to see all guides.</p>}
        {[...new Set(results.map(topic => topic.category))].map(category => <section key={category}><h2>{category}</h2><div className={styles.grid}>{results.filter(topic => topic.category === category).map(topic => <Link className={styles.topic} to={`${root}#${topic.id}`} key={topic.id}><BookOpen size={22} aria-hidden="true" /><h3>{topic.title}</h3><p>{topic.description}</p><span>Read guide →</span></Link>)}</div></section>)}
      </>}
    </>
  </div>
  return role === 'teacher' ? <TeacherDashboardTemplate user={user}>{body}</TeacherDashboardTemplate> : <PlayfulZoneTemplate>{body}</PlayfulZoneTemplate>
}
