import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, Circle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { DetailSkeleton } from '../../components/molecules'
import { PACKAGE_META } from '../../constants/packages'
import { getStudentClassPackage, PACKAGE_EMOJI, type StudentClass, type StudentLesson, type StudentPackage } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import styles from './FreeLessonSelect.module.css'

interface PackageData { class: StudentClass; package: StudentPackage; lessons: (StudentLesson & { progress?: { status: string; percentage: number } })[] }

export default function ClassPackageLessons() {
  const navigate = useNavigate()
  const { classId = '', packageSlug = '' } = useParams()
  const cachePath = `/student/classes/${classId}/packages/${packageSlug}/`
  const [data, setData] = useState<PackageData | null>(() => cachedApiValue<PackageData>(cachePath) ?? null)
  const [error, setError] = useState('')
  useEffect(() => { void getStudentClassPackage(classId, packageSlug).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load lessons.')) }, [classId, packageSlug])
  if (!data) return <PlayfulZoneTemplate><div className={styles.page}>{error || <DetailSkeleton />}</div></PlayfulZoneTemplate>
  const pkg = data.package.slug
  return <PlayfulZoneTemplate>
    <div className={styles.page}>
      <header className={styles.header}><button className={styles.backBtn} onClick={() => navigate(`/student/class/${classId}`, { replace: true })} aria-label="Back to class"><ArrowLeft size={18} /></button><span className={styles.packageIcon} style={{ background: PACKAGE_META[pkg].bg }}>{PACKAGE_EMOJI[pkg]}</span><div><span className={styles.eyebrow}>{data.class.name}</span><h1>{data.package.name}</h1><p>Choose one of the lessons below to begin.</p></div></header>
      <section className={styles.lessonSection}><h2>{data.package.name} lessons</h2>{data.lessons.length === 0 ? <p>No approved lessons have been added to this package yet.</p> : <div className={styles.lessonList}>{data.lessons.map((lesson, index) => <div key={lesson.id} className={styles.lessonRow}>
        <button className={styles.lessonCard} onClick={() => navigate(`/student/class/${classId}/lesson/${lesson.id}`)}><span className={styles.lessonNumber}>{index + 1}</span><span className={styles.lessonName}>{lesson.title}</span>
          <span className={styles.lessonProgress}>
            {lesson.progress?.status === 'completed' ? <span className={styles.progressComplete}>Completed</span> : lesson.progress?.status === 'in_progress' ? <><svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="#e5e1ef" strokeWidth="3" /><circle cx="16" cy="16" r="12" fill="none" stroke="var(--color-interface-purple)" strokeWidth="3" pathLength="100" strokeDasharray={`${lesson.progress.percentage} 100`} transform="rotate(-90 16 16)" strokeLinecap="round" /></svg><span>{lesson.progress.percentage}%</span></> : <span className={styles.progressNotStarted}><Circle size={26} />Not started</span>}
          </span><ChevronRight size={18} /></button>
      </div>)}</div>}</section>
    </div>
  </PlayfulZoneTemplate>
}
