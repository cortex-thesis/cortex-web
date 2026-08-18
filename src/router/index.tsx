import { Routes, Route, Navigate } from 'react-router-dom'

import Splash from '../pages/student/Splash'
import Login from '../pages/student/Login'
import Home from '../pages/student/Home'
import JoinClass from '../pages/student/JoinClass'
import EEGPairing from '../pages/student/EEGPairing'
import ModeSelect from '../pages/student/ModeSelect'
import { FocusMode } from '../pages/student/FocusMode'
import RelaxMode from '../pages/student/RelaxMode'
import SwitchingModes from '../pages/student/SwitchingModes'
import SessionSummary from '../pages/student/SessionSummary'
import LearningJournal from '../pages/student/LearningJournal'
import Notifications from '../pages/student/Notifications'
import Settings from '../pages/student/Settings'
import Profile from '../pages/student/Profile'
import Classes from '../pages/student/Classes'
import ClassDetail from '../pages/student/ClassDetail'

import Dashboard from '../pages/teacher/Dashboard'
import ClassOverview from '../pages/teacher/ClassOverview'
import ClassStudents from '../pages/teacher/ClassStudents'
import ClassContent from '../pages/teacher/ClassContent'
import ClassAnalytics from '../pages/teacher/ClassAnalytics'
import TeacherLogin from '../pages/teacher/Login'
import TeacherNotifications from '../pages/teacher/Notifications'
import TeacherSettings from '../pages/teacher/Settings'
import TeacherProfile from '../pages/teacher/Profile'
import TeacherClasses from '../pages/teacher/Classes'
import TeacherContent from '../pages/teacher/Content'
import TeacherAnalytics from '../pages/teacher/Analytics'

export default function AppRouter() {
  return (
    <Routes>
      {/* Student */}
      <Route path="/" element={<Splash />} />
      <Route path="/student/login" element={<Login />} />
      <Route path="/student/home" element={<Home />} />
      <Route path="/student/join-class" element={<JoinClass />} />
      <Route path="/student/eeg-pairing" element={<EEGPairing />} />
      <Route path="/student/mode-select" element={<ModeSelect />} />
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="/student/relax" element={<RelaxMode />} />
      <Route path="/student/switching" element={<SwitchingModes />} />
      <Route path="/student/session-summary" element={<SessionSummary />} />
      <Route path="/student/journal" element={<LearningJournal />} />
      <Route path="/student/notifications" element={<Notifications />} />
      <Route path="/student/settings" element={<Settings />} />
      <Route path="/student/profile" element={<Profile />} />
      <Route path="/student/classes" element={<Classes />} />
      <Route path="/student/class/:classId" element={<ClassDetail />} />

      {/* Teacher */}
      <Route path="/teacher/dashboard" element={<Dashboard />} />
      <Route path="/teacher/classes" element={<TeacherClasses />} />
      <Route path="/teacher/content" element={<TeacherContent />} />
      <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
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

      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route path="/teacher/notifications" element={<TeacherNotifications />} />
      <Route path="/teacher/settings" element={<TeacherSettings />} />
      <Route path="/teacher/profile" element={<TeacherProfile />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
