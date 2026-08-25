import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, CheckCircle2, Circle } from 'lucide-react'
import { PlayfulZoneTemplate } from '../../components/templates'
import { Button } from '../../components/atoms'
import { PACKAGE_META } from '../../constants/packages'
import { mockClasses, mockTeacher } from '../../mocks'
import styles from './ClassDetail.module.css'

// Mock activity list for this class — replace with GET
// /api/classes/:id/tasks/ once the backend is up. Task shape mirrors
// the `Task` type in types/index.tsx, trimmed to what this list needs.
const MOCK_ACTIVITIES = [
  { id: 't1', title: 'Waking Up on Time', done: true },
  { id: 't2', title: 'Brushing Teeth', done: true },
  { id: 't3', title: 'Getting Dressed', done: true },
  { id: 't4', title: 'Eating Breakfast', done: false },
  { id: 't5', title: 'Packing My Bag', done: false },
]

export default function ClassDetail() {
  const { classId = 'class-001' } = useParams()
  const navigate = useNavigate()

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const completedCount = MOCK_ACTIVITIES.filter((a) => a.done).length

  return (
    <PlayfulZoneTemplate>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/student/classes')}
          aria-label="Back to classes"
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <span
          className={styles.classIconSm}
          style={{ background: classData.iconBg }}
        >
          {classData.iconEmoji}
        </span>
        <h1 className={styles.className}>{classData.name}</h1>
        <span
          className={styles.packagePill}
          style={{ background: PACKAGE_META[classData.package].bg }}
        >
          {PACKAGE_META[classData.package].label}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          <span className={styles.sectionLabel}>Activities</span>
          <ul className={styles.activityList}>
            {MOCK_ACTIVITIES.map((a) => (
              <li key={a.id} className={styles.activityRow}>
                {a.done ? (
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.75}
                    color="#1D9E75"
                    className={styles.activityIcon}
                  />
                ) : (
                  <Circle
                    size={18}
                    strokeWidth={1.75}
                    className={styles.activityIconMuted}
                  />
                )}
                <span
                  className={a.done ? styles.activityDone : styles.activityText}
                >
                  {a.title}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sessionCard}>
            <span className={styles.sessionLabel}>Today's session</span>
            <span className={styles.sessionSub}>
              {completedCount} of {MOCK_ACTIVITIES.length} activities done
            </span>
            <Button fullWidth onClick={() => navigate('/student/eeg-pairing')}>
              <Play size={14} strokeWidth={2} />
              Start session
            </Button>
          </div>

          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Class info</span>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Teacher</span>
              <span className={styles.infoVal}>{mockTeacher.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Class code</span>
              <span className={styles.infoVal}>{classData.code}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Category</span>
              <span className={styles.infoVal}>
                {PACKAGE_META[classData.package].label}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </PlayfulZoneTemplate>
  )
}
