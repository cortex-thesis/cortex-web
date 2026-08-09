import { useState, useEffect } from 'react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { StudentStateCard, EEGWaveDisplay } from '../../components/molecules'
import type { StudentLive } from '../../types'
import type { CognitiveState } from '../../constants/states'
import { mockTeacher, mockStudentsLive, createMockEEGStream } from '../../mocks'
import styles from './Dashboard.module.css'

type StateCount = Record<CognitiveState | 'offline', number>

function countStates(students: StudentLive[]): StateCount {
  return students.reduce(
    (acc, s) => {
      if (!s.isConnected || !s.currentState) {
        acc.offline += 1
      } else {
        acc[s.currentState] += 1
      }
      return acc
    },
    { focused: 0, relaxed: 0, distracted: 0, overstimulated: 0, offline: 0 }
  )
}

function getBandPowers(state: CognitiveState | null | undefined) {
  if (!state) return null
  switch (state) {
    case 'focused':
      return { theta: 2.5, alpha: 3.2, beta: 9.8, gamma: 4.1, tbr: 0.8 }
    case 'relaxed':
      return { theta: 4.1, alpha: 8.6, beta: 3.1, gamma: 1.2, tbr: 1.3 }
    case 'distracted':
      return { theta: 8.4, alpha: 4.0, beta: 2.9, gamma: 0.9, tbr: 2.8 }
    case 'overstimulated':
      return { theta: 3.0, alpha: 2.1, beta: 11.5, gamma: 4.8, tbr: 0.6 }
    default:
      return { theta: 4.0, alpha: 4.0, beta: 4.0, gamma: 2.0, tbr: 1.0 }
  }
}

const SUMMARY_STATES: {
  key: CognitiveState | 'offline'
  label: string
  color: string
}[] = [
  { key: 'focused', label: 'Focused', color: '#1D9E75' },
  { key: 'distracted', label: 'Distracted', color: '#EF9F27' },
  { key: 'relaxed', label: 'Relaxed', color: '#378ADD' },
  { key: 'overstimulated', label: 'Overstimulated', color: '#D85A30' },
  { key: 'offline', label: 'Offline', color: '#B4B2A9' },
]

export default function Dashboard() {
  const [students, setStudents] = useState<StudentLive[]>(mockStudentsLive)
  const [selectedId, setSelectedId] = useState<string | null>(
    mockStudentsLive[0]?.id ?? null
  )
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null)

  const selectedStudent = students.find((s) => s.id === selectedId)
  const counts = countStates(students)

  // Simulate live EEG state updates for all students
  useEffect(() => {
    const stops = mockStudentsLive.map((student) =>
      createMockEEGStream(
        (state: CognitiveState) => {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === student.id ? { ...s, currentState: state } : s
            )
          )
        },
        4000 + Math.random() * 2000
      )
    )
    return () => stops.forEach((stop) => stop())
  }, [])

  function handleOverride(studentId: string) {
    setOverrideTarget(studentId)
  }

  function handleOverrideConfirm(targetMode: 'focus' | 'relax') {
    const targetId = overrideTarget || selectedStudent?.id
    if (!targetId) return

    setStudents((prev) =>
      prev.map((s) =>
        s.id === targetId
          ? {
              ...s,
              currentState: targetMode === 'focus' ? 'focused' : 'relaxed',
            }
          : s
      )
    )
    setOverrideTarget(null)
  }

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.summaryBar}>
            {SUMMARY_STATES.map(({ key, label, color }) => (
              <div key={key} className={styles.summaryCard}>
                <span
                  className={styles.summaryDot}
                  style={{ background: color }}
                  aria-hidden="true"
                />
                <div className={styles.summaryInfo}>
                  <span className={styles.summaryNum}>
                    {counts[key as keyof StateCount]}
                  </span>
                  <span className={styles.summaryLabel}>{label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              Life Skills — Session in progress
            </span>
            <span className={styles.livePill}>
              <span className={styles.liveDot} aria-hidden="true" />
              Live
            </span>
          </div>

          <div className={styles.grid}>
            {students.map((student) => (
              <div
                key={student.id}
                onClick={() => setSelectedId(student.id)}
                className={selectedId === student.id ? styles.cardSelected : ''}
              >
                <StudentStateCard
                  student={student}
                  onOverride={handleOverride}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.sidebar}>
          {selectedStudent ? (
            <>
              <span className={styles.sidebarTitle}>
                Live EEG — {selectedStudent.name.split(' ')[0]}
              </span>
              <EEGWaveDisplay
                state={selectedStudent.currentState}
                bandPowers={
                  selectedStudent.isConnected
                    ? getBandPowers(selectedStudent.currentState)
                    : null
                }
              />

              <div className={styles.selectedInfo}>
                <span className={styles.sidebarTitle}>Quick override</span>
                <div className={styles.overrideButtons}>
                  <button
                    className={styles.overrideBtn}
                    onClick={() => handleOverrideConfirm('focus')}
                  >
                    Switch to Focus
                  </button>
                  <button
                    className={styles.overrideBtn}
                    onClick={() => handleOverrideConfirm('relax')}
                  >
                    Switch to Relax
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <span>Click a student card to see their EEG data</span>
            </div>
          )}
        </div>
      </div>
    </TeacherDashboardTemplate>
  )
}
