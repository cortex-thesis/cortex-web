import { useState, useEffect } from 'react'
import { TeacherDashboardTemplate } from '../../components/templates'
import { EEGWaveDisplay } from '../../components/molecules'
import {
  LiveDashboardGrid,
  OverrideModal,
} from '../../components/organisms/teacher'
import type { StudentLive } from '../../types'
import type { CognitiveState } from '../../constants/states'
import { mockTeacher, mockStudentsLive, createMockEEGStream } from '../../mocks'
import styles from './Dashboard.module.css'

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

export default function Dashboard() {
  const [students, setStudents] = useState<StudentLive[]>(mockStudentsLive)
  const [selectedId, setSelectedId] = useState<string | null>(
    mockStudentsLive[0]?.id ?? null
  )
  const [showOverride, setShowOverride] = useState(false)
  const [overrideTarget, setOverrideTarget] = useState<StudentLive | null>(null)

  const selectedStudent = students.find((s) => s.id === selectedId)

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
    const student = students.find((s) => s.id === studentId)
    if (student) {
      setOverrideTarget(student)
      setShowOverride(true)
    }
  }

  function handleOverrideConfirm(targetMode: 'focus' | 'relax') {
    const targetId = overrideTarget?.id || selectedStudent?.id
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
  }

  return (
    <TeacherDashboardTemplate user={mockTeacher} hasNotification>
      <div className={styles.layout}>
        <div className={styles.main}>
          <LiveDashboardGrid
            students={students}
            sessionLabel="Life Skills — Session in progress"
            selectedId={selectedId}
            onSelectStudent={setSelectedId}
            onOverride={handleOverride}
          />
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
                <button
                  className={styles.overrideBtn}
                  onClick={() => handleOverride(selectedStudent.id)}
                >
                  Override State
                </button>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>
              <span>Click a student card to see their EEG data</span>
            </div>
          )}
        </div>
      </div>

      {showOverride && overrideTarget && (
        <OverrideModal
          student={overrideTarget}
          onConfirm={(targetMode) => {
            handleOverrideConfirm(targetMode)
            setShowOverride(false)
            setOverrideTarget(null)
          }}
          onClose={() => {
            setShowOverride(false)
            setOverrideTarget(null)
          }}
        />
      )}
    </TeacherDashboardTemplate>
  )
}
