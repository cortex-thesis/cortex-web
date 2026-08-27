import { useState } from 'react'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PlayfulZoneTemplate } from '../../components/templates'
import { CURRICULUM_PACKAGES, type CurriculumPackage } from '../../constants/states'
import { PACKAGE_META } from '../../constants/packages'
import styles from './FreeLessonSelect.module.css'

const LESSONS: Record<CurriculumPackage, string[]> = {
  care: ['Morning self-care routine', 'Healthy habits at home', 'Keeping personal spaces tidy'],
  life: ['Getting ready for school', 'Packing my school bag', 'Making a simple breakfast'],
  pre_vocational: ['Using tools safely', 'Following work instructions', 'Organizing a workspace'],
  livelihood: ['Growing a small garden', 'Caring for plants', 'Preparing items to sell'],
  functional_academics: ['Reading a bus schedule', 'Using money at a shop', 'Following a daily timetable'],
  career: ['Exploring jobs I enjoy', 'Preparing for a workplace', 'Practicing introductions'],
  enrichment: ['Drawing what I learned', 'Music and movement', 'Creative problem solving'],
}

const PACKAGE_EMOJI: Record<CurriculumPackage, string> = {
  care: '🤲',
  life: '🍳',
  pre_vocational: '🛠️',
  livelihood: '🌱',
  functional_academics: '📖',
  career: '💼',
  enrichment: '🎨',
}

export default function FreeLessonSelect() {
  const navigate = useNavigate()
  const [selectedPackage, setSelectedPackage] = useState<CurriculumPackage | null>(null)

  function handleBack() {
    if (selectedPackage) {
      setSelectedPackage(null)
      return
    }
    navigate('/student/mode-select', { replace: true })
  }

  function chooseLesson(lesson: string) {
    if (!selectedPackage) return
    navigate('/student/focus', {
      replace: true,
      state: { mode: 'free', package: selectedPackage, lesson },
    })
  }

  return (
    <PlayfulZoneTemplate showNav={false}>
      <div className={styles.page}>
        <header className={styles.header}>
          <button
            className={styles.backBtn}
            onClick={handleBack}
            aria-label={selectedPackage ? 'Back to package selection' : 'Back to mode selection'}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div>
            <span className={styles.eyebrow}>Free explore</span>
            <h1>Choose a lesson</h1>
            <p>
              {selectedPackage
                ? `Choose a lesson from ${PACKAGE_META[selectedPackage].label}.`
                : 'Start by choosing a learning package.'}
            </p>
          </div>
        </header>

        {!selectedPackage ? (
          <div className={styles.packageGrid} role="list" aria-label="Learning packages">
            {CURRICULUM_PACKAGES.map((pkg) => {
              return (
                <button
                  key={pkg}
                  className={styles.packageCard}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <span className={styles.packageIcon} style={{ background: PACKAGE_META[pkg].bg }}>
                    {PACKAGE_EMOJI[pkg]}
                  </span>
                  <span className={styles.packageName}>{PACKAGE_META[pkg].label}</span>
                  <span className={styles.lessonCount}>{LESSONS[pkg].length} lessons</span>
                  <ChevronRight className={styles.chevron} size={18} />
                </button>
              )
            })}
          </div>
        ) : (
          <section className={styles.lessonSection} aria-labelledby="lesson-list-heading">
            <h2 id="lesson-list-heading">{PACKAGE_META[selectedPackage].label} lessons</h2>
            <div className={styles.lessonList}>
              {LESSONS[selectedPackage].map((lesson, index) => (
                <button key={lesson} className={styles.lessonCard} onClick={() => chooseLesson(lesson)}>
                  <span className={styles.lessonNumber}>{index + 1}</span>
                  <span className={styles.lessonName}>{lesson}</span>
                  <span className={styles.startLabel}>Start</span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedPackage && (
          <div className={styles.selectedPackage}>
            <Check size={15} /> {PACKAGE_META[selectedPackage].label} selected
          </div>
        )}
      </div>
    </PlayfulZoneTemplate>
  )
}
