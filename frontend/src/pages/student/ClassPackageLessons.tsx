import { useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, Play } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { PACKAGE_META } from '../../constants/packages'
import { getStudentClassPackage, PACKAGE_EMOJI, type StudentClass, type StudentLesson, type StudentPackage } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import styles from './FreeLessonSelect.module.css'

interface PackageData { class: StudentClass; package: StudentPackage; lessons: StudentLesson[] }

export default function ClassPackageLessons() {
  const navigate = useNavigate()
  const { classId = '', packageSlug = '' } = useParams()
  const cachePath = `/student/classes/${classId}/packages/${packageSlug}/`
  const [data, setData] = useState<PackageData | null>(() => cachedApiValue<PackageData>(cachePath) ?? null)
  const [error, setError] = useState('')
  useEffect(() => { void getStudentClassPackage(classId, packageSlug).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load lessons.')) }, [classId, packageSlug])
  if (!data) return <PlayfulZoneTemplate><div className={styles.page}>{error || 'Loading lessons...'}</div></PlayfulZoneTemplate>
  const pkg = data.package.slug
  return <PlayfulZoneTemplate>
    <div className={styles.page}>
      <header className={styles.header}><button className={styles.backBtn} onClick={() => navigate(`/student/class/${classId}`)}><ArrowLeft size={18} /></button><span className={styles.packageIcon} style={{ background: PACKAGE_META[pkg].bg }}>{PACKAGE_EMOJI[pkg]}</span><div><span className={styles.eyebrow}>{data.class.name}</span><h1>{data.package.name}</h1><p>Choose one of the lessons below to begin.</p></div></header>
      <section className={styles.lessonSection}><h2>{data.package.name} lessons</h2>{data.lessons.length === 0 ? <p>No approved lessons have been added to this package yet.</p> : <div className={styles.lessonList}>{data.lessons.map((lesson, index) => <button key={lesson.id} className={styles.lessonCard} onClick={() => navigate('/student/eeg-pairing', { state: { classId: data.class.id, package: pkg, lessonId: lesson.id, lesson: lesson.title } })}><span className={styles.lessonNumber}>{index + 1}</span><span className={styles.lessonName}>{lesson.title}</span><span className={styles.startLabel}><Play size={12} /> Start session</span><ChevronRight size={18} /></button>)}</div>}</section>
    </div>
  </PlayfulZoneTemplate>
}
