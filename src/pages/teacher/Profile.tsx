import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, BookOpen } from 'lucide-react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { Avatar, Button } from '../../components/atoms'
import { mockTeacher, mockClasses } from '../../mocks'
import styles from './Profile.module.css'

export default function Profile() {
  const navigate = useNavigate()
  const teacher = mockTeacher
  const classes = mockClasses.filter((c) => c.teacherId === teacher.id)
  const totalStudents = classes.reduce((sum, c) => sum + c.studentIds.length, 0)

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.wrap}>
        <button className={styles.backLink} onClick={() => navigate(-1)}>
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back
        </button>

        <div className={styles.identity}>
          <Avatar name={teacher.name} imageUrl={teacher.avatar} size="lg" />
          <div className={styles.identityText}>
            <h1 className={styles.name}>{teacher.name}</h1>
            <span className={styles.role}>Teacher</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teacher/settings')}
          >
            Edit profile
          </Button>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>
              <BookOpen size={16} strokeWidth={1.75} color="#534AB7" />
            </span>
            <span className={styles.statValue}>{classes.length}</span>
            <span className={styles.statLabel}>Classes</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>
              <Users size={16} strokeWidth={1.75} color="#1D9E75" />
            </span>
            <span className={styles.statValue}>{totalStudents}</span>
            <span className={styles.statLabel}>Students</span>
          </div>
        </div>

        <span className={styles.sectionLabel}>My classes</span>
        <div className={styles.classList}>
          {classes.map((c) => (
            <button
              key={c.id}
              className={styles.classRow}
              onClick={() => navigate(`/teacher/class/${c.id}/overview`)}
            >
              <span
                className={styles.classIcon}
                style={{ background: c.iconBg }}
              >
                {c.iconEmoji}
              </span>
              <span className={styles.classText}>
                <span className={styles.className}>{c.name}</span>
                <span className={styles.classSub}>
                  {c.studentIds.length} students · Code {c.code}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}
