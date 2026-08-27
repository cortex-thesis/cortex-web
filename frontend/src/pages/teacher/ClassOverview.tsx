import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { TeacherTabTemplate } from '../../components/templates'
import { EEGWaveDisplay, StatSummaryCard } from '../../components/molecules'
import { LiveDashboardGrid, OverrideModal } from '../../components/organisms/teacher'
import { Users, Zap, Flame, ClipboardList } from 'lucide-react'
import type { StudentLive } from '../../types'
import type { InterventionAction } from '../../types'
import type { CognitiveState } from '../../constants/states'
import {
  mockTeacher,
  mockClasses,
  mockStudentsLive,
  createMockEEGStream,
} from '../../mocks'
import styles from './ClassOverview.module.css'

const CLASS_TABS = (classId: string) => [
  { label: 'Overview', path: `/teacher/class/${classId}/overview` },
  { label: 'Students', path: `/teacher/class/${classId}/students` },
  { label: 'Content', path: `/teacher/class/${classId}/content` },
  { label: 'Analytics', path: `/teacher/class/${classId}/analytics` },
]

export default function ClassOverview() {
  const { classId = 'class-001' } = useParams()

  const classData = mockClasses.find((c) => c.id === classId) ?? mockClasses[0]

  const [students, setStudents] = useState<StudentLive[]>(mockStudentsLive)
  const [selectedId, setSelectedId] = useState<string | null>(mockStudentsLive[0]?.id ?? null)
  const [overrideTarget, setOverrideTarget] = useState<StudentLive | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Live mock EEG updates
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const stops = mockStudentsLive.map((s) =>
      createMockEEGStream(
        (state: CognitiveState) => {
          setStudents((prev) =>
            prev.map((st) =>
              st.id === s.id
                ? {
                    ...st,
                    currentState: state,
                    stateStartedAt: new Date().toISOString(),
                    stateTransitions: [
                      ...(st.stateTransitions ?? []),
                      { state, timestamp: new Date().toISOString() },
                    ].slice(-4),
                    bandPowers: getBandPowers(state) ?? undefined,
                  }
                : st
            )
          )
        },
        4000 + Math.random() * 2000
      )
    )
    return () => {
      window.clearInterval(timer)
      stops.forEach((stop) => stop())
    }
  }, [])

  const active = students.filter((s) => s.isConnected)
  const avgFocus = active.length
    ? Math.round(
        active.reduce((sum, s) => sum + s.focusScore, 0) / active.length
      )
    : 0

  const tabs = CLASS_TABS(classId)
  const selectedStudent = students.find((student) => student.id === selectedId)

  return (
    <TeacherTabTemplate
      user={mockTeacher}
      tabs={tabs}
      title={`${classData.iconEmoji} ${classData.name}`}
    >
      <div className={styles.content}>
        <div className={styles.statsRow}>
          <StatSummaryCard
            value={classData.studentIds.length}
            label="Students"
            icon={<Users size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
          />
          <StatSummaryCard
            value={active.length}
            label="Active now"
            icon={<Zap size={18} strokeWidth={1.75} color="#534AB7" />}
            iconBg="#EEEDFE"
            sub="In session"
            subColor="#534AB7"
          />
          <StatSummaryCard
            value={`${avgFocus}%`}
            label="Avg focus score"
            icon={<Flame size={18} strokeWidth={1.75} color="#D4537E" />}
            iconBg="#FBEAF0"
            sub="This session"
            subColor="#1D9E75"
          />
          <StatSummaryCard
            value={18}
            label="Total sessions"
            icon={
              <ClipboardList size={18} strokeWidth={1.75} color="#5F5E5A" />
            }
            iconBg="#F8F8FC"
          />
        </div>

        <div className={styles.liveLayout}>
          <LiveDashboardGrid
            students={students}
            sessionLabel={`${classData.name} — Session in progress`}
            selectedId={selectedId}
            onSelectStudent={setSelectedId}
            onOverride={(id) => setOverrideTarget(students.find((student) => student.id === id) ?? null)}
          />
          <aside className={styles.eegSidebar}>
            {selectedStudent ? (
              <>
                <span className={styles.sidebarTitle}>Live EEG — {selectedStudent.name.split(' ')[0]}</span>
                <EEGWaveDisplay
                  state={selectedStudent.currentState}
                  bandPowers={selectedStudent.isConnected ? selectedStudent.bandPowers : null}
                  signalQuality={selectedStudent.signalQuality}
                  connectionStatus={selectedStudent.connectionStatus}
                />
                <div className={styles.contextPanel}>
                  <div><span>Active activity</span><strong>{selectedStudent.activeActivity ?? 'No activity assigned'}</strong></div>
                  <div><span>Engine mode</span><strong>{selectedStudent.engineMode === 'teacher-override' ? 'Teacher override' : 'Automatic'}</strong></div>
                  <div><span>Workstation path</span><strong>{selectedStudent.workstationPath ?? 'Unverified'}</strong></div>
                  <div><span>State history</span><strong>{(selectedStudent.stateTransitions ?? []).map((transition) => transition.state).join(' > ') || 'No transitions'}</strong></div>
                  <div><span>Current state time</span><strong>{formatDuration(selectedStudent.stateStartedAt ? Math.max(0, Math.floor((now - Date.parse(selectedStudent.stateStartedAt)) / 1000)) : 0)}</strong></div>
                </div>
                <button className={styles.overrideBtn} onClick={() => setOverrideTarget(selectedStudent)}>
                  Override state
                </button>
              </>
            ) : (
              <span className={styles.noSelection}>Select a student to see live EEG details.</span>
            )}
          </aside>
        </div>
      </div>
      {overrideTarget && (
        <OverrideModal
          student={overrideTarget}
          onConfirm={(action: InterventionAction, mode?: 'focus' | 'relax') => {
            fetch(`/api/students/${overrideTarget.id.replace('student-', '')}/interventions/`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, mode, priority: overrideTarget.currentState === 'overstimulated' ? 'urgent' : 'normal', state: overrideTarget.currentState ?? '' }) }).catch(() => undefined)
            if (action === 'set_mode' && mode) setStudents((previous) => previous.map((student) => student.id === overrideTarget.id ? { ...student, currentState: mode === 'focus' ? 'focused' : 'relaxed', engineMode: 'teacher-override' } : student))
            if (action === 'return_auto') setStudents((previous) => previous.map((student) => student.id === overrideTarget.id ? { ...student, engineMode: 'auto' } : student))
            setOverrideTarget(null)
          }}
          onClose={() => setOverrideTarget(null)}
        />
      )}
    </TeacherTabTemplate>
  )
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function getBandPowers(state: CognitiveState | null | undefined) {
  if (!state) return null
  if (state === 'focused') return { theta: 2.5, alpha: 3.2, beta: 9.8, gamma: 4.1, tbr: 0.8 }
  if (state === 'relaxed') return { theta: 4.1, alpha: 8.6, beta: 3.1, gamma: 1.2, tbr: 1.3 }
  if (state === 'distracted') return { theta: 8.4, alpha: 4.0, beta: 2.9, gamma: 0.9, tbr: 2.8 }
  return { theta: 3.0, alpha: 2.1, beta: 11.5, gamma: 4.8, tbr: 0.6 }
}
