import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { AchievementGarden } from '../../components/organisms/student'
import type { GardenAchievement } from '../../components/organisms/student/AchievementGarden'
import { api } from '../../lib/api'
import { PACKAGE_META } from '../../constants/packages'
import styles from './Achievements.module.css'

interface ProgressResponse { badge_unlocks: Record<string, string> }

function achievementList(unlocks: Record<string, string>): GardenAchievement[] {
  const milestones = [1, 3, 12].map((count) => ({
    id: `lessons-${count}`,
    label: count === 1 ? 'First Lesson Bloom' : `${count} Lessons Bloom`,
    detail: unlocks[`lessons-${count}`] ? `Completed ${count} ${count === 1 ? 'lesson' : 'lessons'}.` : `Complete ${count} ${count === 1 ? 'lesson' : 'lessons'} to grow this flower.`,
    earned: Boolean(unlocks[`lessons-${count}`]),
    unlockedAt: unlocks[`lessons-${count}`],
  }))
  const packages = Object.entries(PACKAGE_META).map(([slug, meta]) => ({
    id: slug,
    label: `${meta.label} Bloom`,
    detail: unlocks[slug] ? `Completed every activity in the ${meta.label} package.` : `Complete the ${meta.label} package to grow this flower.`,
    earned: Boolean(unlocks[slug]),
    unlockedAt: unlocks[slug],
  }))
  return [...milestones, ...packages].sort((a, b) => a.earned === b.earned ? (a.earned ? new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime() : a.label.localeCompare(b.label)) : a.earned ? -1 : 1)
}

export default function Achievements() {
  const navigate = useNavigate()
  const [achievements, setAchievements] = useState<GardenAchievement[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void api<ProgressResponse>('/student/package-progress/', { cache: 'no-store' }).then((data) => setAchievements(achievementList(data.badge_unlocks))).catch((reason: Error) => setError(reason.message)) }, [])
  return <PlayfulZoneTemplate><div className={styles.page}>
    <button className={styles.back} onClick={() => navigate('/student/profile')}><ArrowLeft size={16} /> Profile</button>
    {error && <p className={styles.error} role="alert">The garden could not be loaded. {error}</p>}
    {!achievements && !error && <div className={styles.loading} role="status">Growing your garden…</div>}
    {achievements && <AchievementGarden achievements={achievements} />}
  </div></PlayfulZoneTemplate>
}
