import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Circle } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { PACKAGE_META } from '../../constants/packages'
import { classPresentation, getStudentClass, type StudentClass } from '../../lib/studentApi'
import styles from './ClassDetail.module.css'

type Detail = ReturnType<typeof classPresentation> & { activities: Array<{ id: string; title: string; done: boolean }> }

export default function ClassDetail() {
  const { classId = '' } = useParams(); const navigate = useNavigate()
  const [classData, setClassData] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void getStudentClass(classId).then((data) => setClassData({ ...classPresentation(data as StudentClass), activities: data.activities })).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load class.')) }, [classId])
  if (!classData) return <PlayfulZoneTemplate><div className={styles.body}>{error || 'Loading class...'}</div></PlayfulZoneTemplate>
  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}><button className={styles.backBtn} onClick={() => navigate('/student/classes', { replace: true })} aria-label="Back to classes"><ChevronLeft size={18} strokeWidth={1.75} /></button><span className={styles.classIconSm} style={{ background: classData.iconBg }}>{classData.iconEmoji}</span><h1 className={styles.className}>{classData.name}</h1><span className={styles.packagePill} style={{ background: PACKAGE_META[classData.package].bg }}>{PACKAGE_META[classData.package].label}</span></div>
      <div className={styles.body}>
        <div className={styles.main}><span className={styles.sectionLabel}>Activities</span><ul className={styles.activityList}>{classData.activities.length ? classData.activities.map((activity) => <li key={activity.id} className={styles.activityRow}><Circle size={18} strokeWidth={1.75} className={styles.activityIconMuted} /><span className={styles.activityText}>{activity.title}</span></li>) : <li className={styles.activityRow}><span className={styles.activityText}>No assigned activities yet.</span></li>}</ul></div>
        <aside className={styles.sidebar}><div className={styles.infoCard}><span className={styles.infoLabel}>Class info</span><div className={styles.infoRow}><span className={styles.infoKey}>Teacher</span><span className={styles.infoVal}>{classData.teacher.name}</span></div><div className={styles.infoRow}><span className={styles.infoKey}>Class code</span><span className={styles.infoVal}>{classData.code}</span></div><div className={styles.infoRow}><span className={styles.infoKey}>Category</span><span className={styles.infoVal}>{PACKAGE_META[classData.package].label}</span></div></div></aside>
      </div>
    </PlayfulZoneTemplate>
  )
}
