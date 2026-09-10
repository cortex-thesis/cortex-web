import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { PACKAGE_META } from '../../constants/packages'
import { PACKAGE_EMOJI, getStudentClass, type StudentClass } from '../../lib/studentApi'
import { cachedApiValue } from '../../lib/api'
import styles from './ClassDetail.module.css'
import selectionStyles from './FreeLessonSelect.module.css'

export default function ClassDetail() {
  const { classId = '' } = useParams()
  const navigate = useNavigate()
  const [classData, setClassData] = useState<StudentClass | null>(() => cachedApiValue<StudentClass>(`/classes/${classId}/?summary=1`) ?? null)
  const [error, setError] = useState('')
  useEffect(() => { void getStudentClass(classId).then(setClassData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load class.')) }, [classId])
  if (!classData) return <PlayfulZoneTemplate><div className={styles.body}>{error || 'Loading class...'}</div></PlayfulZoneTemplate>
  return <PlayfulZoneTemplate>
    <div className={styles.topBar}><button className={styles.backBtn} onClick={() => navigate('/student/classes', { replace: true })} aria-label="Back to classes"><ChevronLeft size={18} /></button><span className={styles.classIconSm} style={{ background: '#EEEDFE' }}>🏫</span><h1 className={styles.className}>{classData.name}</h1><span className={styles.packagePill}>{classData.package_count} learning packages</span></div>
    <div className={styles.body}>
      <span className={styles.sectionLabel}>Learning packages</span>
      <main className={styles.main}><div className={selectionStyles.packageGrid}>{classData.packages.map((pkg) => <button key={pkg.id} className={selectionStyles.packageCard} onClick={() => navigate(`/student/class/${classId}/package/${pkg.slug}`)}><span className={selectionStyles.packageIcon} style={{ background: PACKAGE_META[pkg.slug].bg }}>{PACKAGE_EMOJI[pkg.slug]}</span><span className={selectionStyles.packageName}>{pkg.name}</span><span className={selectionStyles.lessonCount}>{pkg.lesson_count ?? 0} {pkg.lesson_count === 1 ? 'lesson' : 'lessons'}</span><ChevronRight className={selectionStyles.chevron} size={18} /></button>)}</div></main>
      <aside className={styles.sidebar}><div className={styles.infoCard}><span className={styles.infoLabel}>Class info</span><div className={styles.infoRow}><span className={styles.infoKey}>Teacher</span><span className={styles.infoVal}>{classData.teacher.name}</span></div><div className={styles.infoRow}><span className={styles.infoKey}>Class code</span><span className={styles.infoVal}>{classData.code}</span></div><div className={styles.infoRow}><span className={styles.infoKey}>Curriculum</span><span className={styles.infoVal}>All 7 packages</span></div></div></aside>
    </div>
  </PlayfulZoneTemplate>
}
