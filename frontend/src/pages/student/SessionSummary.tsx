import { useNavigate, useLocation } from 'react-router-dom'
import { OverlayTemplate } from '../../components/templates'
import { SessionSummaryModal } from '../../components/organisms/student/SessionSummaryModal'
import type { SessionSummary as SessionSummaryType } from '../../types'

const MOCK_SUMMARY: SessionSummaryType = {
  sessionId: 'session-001',
  duration: 1450,
  focusScore: 82,
  stateDistribution: {
    focused: 68,
    relaxed: 20,
    distracted: 12,
    overstimulated: 0,
  },
  taskCompleted: 5,
  taskTotal: 5,
}

export default function SessionSummary() {
  const navigate = useNavigate()
  const location = useLocation()

  const summary: SessionSummaryType =
    (location.state as { summary?: SessionSummaryType })?.summary ??
    MOCK_SUMMARY

  const { taskCompleted } = summary

  function handleJournal() {
    navigate('/student/journal', {
      state: {
        sessionId: summary.sessionId,
        tasksDone: Array.from(
          { length: taskCompleted },
          (_, i) => `Task ${i + 1}`
        ),
      },
    })
  }

  return (
    <OverlayTemplate>
      <SessionSummaryModal
        summary={summary}
        onJournal={handleJournal}
        onHome={() => navigate('/student/home', { replace: true })}
      />
    </OverlayTemplate>
  )
}
