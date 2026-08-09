import { Routes, Route, Navigate } from 'react-router-dom'
import Splash from '../pages/student/Splash'
import Home from '../pages/student/Home'
import { FocusMode } from '../pages/student/FocusMode'
import RelaxMode from '../pages/student/RelaxMode'
import SwitchingModes from '../pages/student/SwitchingModes'
import SessionSummary from '../pages/student/SessionSummary'
import LearningJournal from '../pages/student/LearningJournal'
import EEGPairing from '../pages/student/EEGPairing'
import Dashboard from '../pages/teacher/Dashboard'
import ClassOverview from '../pages/teacher/ClassOverview'
import ClassStudents from '../pages/teacher/ClassStudents'
import ClassContent from '../pages/teacher/ClassContent'
import ClassAnalytics from '../pages/teacher/ClassAnalytics'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/student/home" element={<Home />} />
      <Route path="/student/eeg-pairing" element={<EEGPairing />} />
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="/student/relax" element={<RelaxMode />} />
      <Route path="/student/switching" element={<SwitchingModes />} />
      <Route path="/student/session-summary" element={<SessionSummary />} />
      <Route path="/student/journal" element={<LearningJournal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/teacher/dashboard" element={<Dashboard />} />
      <Route
        path="/teacher/class/:classId/overview"
        element={<ClassOverview />}
      />
      <Route
        path="/teacher/class/:classId/students"
        element={<ClassStudents />}
      />
      <Route
        path="/teacher/class/:classId/content"
        element={<ClassContent />}
      />
      <Route
        path="/teacher/class/:classId/analytics"
        element={<ClassAnalytics />}
      />
    </Routes>
  )
}
