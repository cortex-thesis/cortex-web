import { useState, type CSSProperties } from 'react'
import { ArrowRight, Sprout } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from './AchievementGarden.module.css'

export interface GardenAchievement { id: string; label: string; detail: string; earned: boolean; unlockedAt?: string }

const flowerColors = ['pink', 'blue', 'yellow', 'green', 'purple'] as const
const offsets = [4, -9, 10, -3, 7, -7, 2, 11, -5, 6]

export default function AchievementGarden({ achievements }: { achievements: GardenAchievement[] }) {
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const earnedCount = achievements.filter((item) => item.earned).length

  return <section className={styles.section} id="achievement-garden" aria-labelledby="garden-title">
    <header className={styles.header}><div><span className={styles.eyebrow}>Achievements</span><h2 id="garden-title">Achievement Garden</h2><p>Every achievement helps your garden grow.</p></div><span className={styles.count}>{earnedCount} blooming</span></header>
    <div className={styles.garden}>
      <div className={`${styles.cloud} ${styles.cloudOne}`} aria-hidden="true" /><div className={`${styles.cloud} ${styles.cloudTwo}`} aria-hidden="true" />
      <div className={styles.distantGarden} aria-hidden="true"><i /><i /><i /><i /><i /></div><div className={styles.grass} aria-hidden="true" /><div className={styles.soil} aria-hidden="true" />
      <div className={styles.plots}>
        {achievements.map((achievement, index) => {
          const color = flowerColors[index % flowerColors.length]
          const active = openId === achievement.id
          const style = { '--garden-offset': `${offsets[index % offsets.length]}px`, '--garden-delay': `${Math.min(index, 8) * 70}ms`, '--garden-scale': `${.92 + (index % 3) * .06}` } as CSSProperties
          const earnedLabel = achievement.unlockedAt ? ` Earned ${new Date(achievement.unlockedAt).toLocaleDateString()}.` : ''
          return <div className={styles.plot} style={style} key={achievement.id}><button type="button" className={`${styles.flowerButton} ${achievement.earned ? styles.earned : styles.locked}`} aria-expanded={active} aria-label={`${achievement.label}. ${achievement.detail}.${achievement.earned ? earnedLabel : ' Not earned yet.'}`} onClick={() => setOpenId(active ? null : achievement.id)} onFocus={() => setOpenId(achievement.id)} onBlur={() => setOpenId(null)} onKeyDown={(event) => { if (event.key === 'Escape') { setOpenId(null); event.currentTarget.blur() } }}>
            <span className={styles.shortLabel}>{achievement.label}</span>
            {achievement.earned ? <span className={styles.plant} aria-hidden="true"><span className={styles.bloom}><img src={`/assets/profile-flowers/flower-${color}.svg`} alt="" /></span><span className={styles.stem}><i /><i /></span></span> : <span className={styles.bud} aria-hidden="true"><Sprout size={28} /><span /></span>}
            <span className={styles.plotShadow} aria-hidden="true" />
            <span className={`${styles.tooltip} ${active ? styles.tooltipOpen : ''}`} role="tooltip"><strong>{achievement.label}</strong><span>{achievement.detail}</span>{achievement.earned && achievement.unlockedAt && <time dateTime={achievement.unlockedAt}>Earned {new Date(achievement.unlockedAt).toLocaleDateString()}</time>}{!achievement.earned && <span>Still growing</span>}</span>
          </button></div>
        })}
      </div>
      {earnedCount === 0 && <div className={styles.empty}><strong>Your garden is ready to grow.</strong><span>Complete a lesson and your first flower will bloom here.</span><button onClick={() => navigate('/student/classes')}>Choose a class <ArrowRight size={15} /></button></div>}
    </div>
  </section>
}
