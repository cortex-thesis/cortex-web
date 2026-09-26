import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { OverlayTemplate } from '../../components/templates'
import { SessionSummaryModal } from '../../components/organisms/student/SessionSummaryModal'
import type { SessionSummary as SessionSummaryType } from '../../types'

export default function SessionSummary() {
  const navigate = useNavigate()
  const location = useLocation()

  const summary = (location.state as { summary?: SessionSummaryType } | null)?.summary

  if (!summary) return <Navigate to="/student/sessions" replace />
  const sessionSummary: SessionSummaryType = summary

  const { taskCompleted } = sessionSummary

  function handleJournal() {
    navigate('/student/journal', {
      state: {
        sessionId: sessionSummary.sessionId,
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
        summary={sessionSummary}
        onJournal={handleJournal}
        onHome={() => navigate('/student/home', { replace: true })}
      />
    </OverlayTemplate>
  )
}
