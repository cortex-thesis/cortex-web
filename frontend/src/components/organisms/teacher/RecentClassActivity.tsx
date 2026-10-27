import IllustrationIcon from '../../atoms/IllustrationIcon'
import { Link } from 'react-router-dom'
import { PACKAGE_META } from '../../../constants/packages'
import PackageIcon from '../../atoms/PackageIcon'
import type { ClassAnalyticsData } from '../../../lib/teacherApi'
import styles from '../../../pages/teacher/ClassOverview.module.css'

type RecentSession = ClassAnalyticsData['recent_sessions'][number] & { class_id?: number; class_name?: string }
type RecentBadge = ClassAnalyticsData['recent_badges'][number] & { classes?: Array<{ id: number; name: string }> }

interface Props {
  sessions?: RecentSession[]
  badges?: RecentBadge[]
  classId?: string
}

export function RecentClassActivity({ sessions, badges, classId }: Props) {
  return <div className={styles.recentGrid}>
    <section className={styles.recentCard}>
      <h2>Recent student sessions</h2>
      <div className={styles.recentList} tabIndex={0} role="region" aria-label="Recent student sessions">
        {sessions?.map(item => <article key={item.id} className={styles.recentItem}>
          <span className={styles.itemIcon} style={{ background: item.package ? PACKAGE_META[item.package].bg : undefined }} aria-hidden="true">{item.package ? <PackageIcon packageId={item.package} /> : '📖'}</span>
          <div className={styles.itemDetails}>
            <Link to={`/teacher/class/${item.class_id ?? classId}/student/${item.student.id}?session=${encodeURIComponent(item.id)}`}><strong>{item.student.name}</strong></Link>
            <span>{item.lesson}{item.class_name && <> · <Link to={`/teacher/class/${item.class_id}/overview`}>{item.class_name}</Link></>}</span>
            <small>{new Date(item.started_at).toLocaleString()} · {item.ended_at ? 'Completed' : 'In progress'} · {item.completion_percentage}%</small>
          </div>
        </article>)}
        {sessions && !sessions.length && <p>No student sessions yet.</p>}
        {!sessions && <p role="status">Loading sessions…</p>}
      </div>
    </section>
    <section className={styles.recentCard}>
      <h2>Recently earned badges</h2>
      <div className={styles.recentList} tabIndex={0} role="region" aria-label="Recently earned badges">
        {badges?.map(item => <article key={`${item.student.id}-${item.key}`} className={styles.recentItem}>
          <span className={styles.itemIcon} aria-hidden="true">{item.key === 'lessons-1' ? <IllustrationIcon name="sprout" size={30} /> : item.key === 'lessons-3' ? <IllustrationIcon name="star" size={30} /> : item.key === 'lessons-12' ? <IllustrationIcon name="trophy" size={30} /> : (Object.hasOwn(PACKAGE_META, item.key) ? <PackageIcon packageId={item.key as keyof typeof PACKAGE_META} /> : null) ?? <IllustrationIcon name="medal" size={30} />}</span>
          <div className={styles.itemDetails}>
            <strong>{item.student.name}</strong>
            <span>{item.key.startsWith('lessons-') ? `Completed ${item.key.slice(8)} lesson${item.key === 'lessons-1' ? '' : 's'}` : `Completed ${PACKAGE_META[item.key as keyof typeof PACKAGE_META]?.label ?? item.key} Package`}</span>
            {item.classes && <span>{item.classes.map((schoolClass, index) => <span key={schoolClass.id}>{index > 0 && ' · '}<Link to={`/teacher/class/${schoolClass.id}/student/${item.student.id}`}>{schoolClass.name}</Link></span>)}</span>}
            <small>{new Date(item.unlocked_at).toLocaleString()}</small>
          </div>
        </article>)}
        {badges && !badges.length && <p>No badges earned yet.</p>}
        {!badges && <p role="status">Loading badges…</p>}
      </div>
    </section>
  </div>
}
