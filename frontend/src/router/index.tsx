import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

import Splash from '../pages/student/Splash'
import UnifiedLogin from '../pages/Login'
import Home from '../pages/student/Home'
import JoinClass from '../pages/student/JoinClass'
import EEGPairing from '../pages/student/EEGPairing'
import LiveEEG from '../pages/student/LiveEEG'
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
import ClassPackageLessons from '../pages/student/ClassPackageLessons'
import StudentSessions from '../pages/student/Sessions'
import FreeLessonSelect from '../pages/student/FreeLessonSelect'

import Dashboard from '../pages/teacher/Dashboard'
import ClassOverview from '../pages/teacher/ClassOverview'
import ClassStudents from '../pages/teacher/ClassStudents'
import ClassAnalytics from '../pages/teacher/ClassAnalytics'
import TeacherStudentProfile from '../pages/teacher/StudentProfile'
import TeacherNotifications from '../pages/teacher/Notifications'
import TeacherSettings from '../pages/teacher/Settings'
import TeacherProfile from '../pages/teacher/Profile'
import TeacherClasses from '../pages/teacher/Classes'
import TeacherClassSetup from '../pages/teacher/ClassSetup'
import TeacherJournals from '../pages/teacher/Journals'
import {
  AdminDashboard, AdminAccounts, StudentRegistration, TeacherRegistration,
  ForgotPassword, ResetPassword, StudentCalibration, EEGDiagnostics,
  HardwareRequired, Reports, Enrollment,
  SessionControl, StudentHistory, Evaluation,
  DrawingJournal, AudioJournal,
} from '../pages/prototype'

export default function AppRouter() {
  return (
    <Routes>
      {/* Student */}
      <Route path="/" element={<UnifiedLogin />} />
      <Route path="/welcome" element={<Splash />} />
      <Route path="/student/login" element={<Navigate to="/" replace />} />
      <Route path="/student/register" element={<StudentRegistration />} />
      <Route path="/student/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<StudentRegistration />} />
      <Route
        path="/preview/activities"
        element={import.meta.env.DEV ? <FocusMode preview /> : <Navigate to="/" replace />}
      />
      <Route element={<ProtectedRoute roles={['student']} />}>
      <Route path="/student/home" element={<Home />} />
      <Route path="/student/join-class" element={<JoinClass />} />
      <Route path="/student/eeg-pairing" element={<EEGPairing />} />
      <Route path="/student/eeg-live" element={<LiveEEG />} />
      <Route path="/student/mode-select" element={<ModeSelect />} />
      <Route path="/student/free-lesson-select" element={<FreeLessonSelect />} />
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="/student/relax" element={<RelaxMode />} />
      <Route path="/student/switching" element={<SwitchingModes />} />
      <Route path="/student/session-summary" element={<SessionSummary />} />
      <Route path="/student/journal" element={<LearningJournal />} />
      <Route path="/student/notifications" element={<Notifications />} />
      <Route path="/student/settings" element={<Settings />} />
      <Route path="/student/profile" element={<Profile />} />
      <Route path="/student/classes" element={<Classes />} />
      <Route path="/student/sessions" element={<StudentSessions />} />
      <Route path="/student/class/:classId" element={<ClassDetail />} />
      <Route path="/student/class/:classId/package/:packageSlug" element={<ClassPackageLessons />} />
      <Route path="/student/calibration" element={<StudentCalibration />} />
      <Route path="/student/eeg-diagnostics" element={<EEGDiagnostics />} />
      <Route path="/student/hardware-required" element={<HardwareRequired />} />
      <Route path="/student/journal/draw" element={<DrawingJournal />} />
      <Route path="/student/journal/audio" element={<AudioJournal />} />
      </Route>

      {/* Teacher */}
      <Route element={<ProtectedRoute roles={['teacher']} />}>
      <Route path="/teacher/dashboard" element={<Dashboard />} />
      <Route path="/teacher/classes" element={<TeacherClasses />} />
      <Route
        path="/teacher/class/:classId/overview"
        element={<ClassOverview />}
      />
      <Route
        path="/teacher/class/:classId/students"
        element={<ClassStudents />}
      />
      <Route
        path="/teacher/class/:classId/analytics"
        element={<ClassAnalytics />}
      />
      <Route
        path="/teacher/class/:classId/student/:studentId"
        element={<TeacherStudentProfile />}
      />

      <Route path="/teacher/login" element={<Navigate to="/" replace />} />
      <Route path="/teacher/register" element={<TeacherRegistration />} />
      <Route path="/teacher/forgot-password" element={<ForgotPassword />} />
      <Route path="/teacher/notifications" element={<TeacherNotifications />} />
      <Route path="/teacher/settings" element={<TeacherSettings />} />
      <Route path="/teacher/profile" element={<TeacherProfile />} />
      <Route path="/teacher/journals" element={<TeacherJournals />} />
      <Route path="/teacher/reports" element={<Reports />} />
      <Route path="/teacher/classes/new" element={<TeacherClassSetup />} />
      <Route path="/teacher/class/:classId/enroll" element={<Enrollment />} />
      <Route path="/teacher/class/:classId/session" element={<SessionControl />} />
      <Route path="/teacher/student/:studentId/analytics" element={<StudentHistory />} />
      </Route>

      {/* Administrator */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/accounts" element={<AdminAccounts />} />
        <Route path="/admin/evaluation" element={<Evaluation />} />
      </Route>
      <Route path="/admin/login" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
