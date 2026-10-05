import NotificationCenter from '../pages/NotificationCenter'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

import Splash from '../pages/student/Splash'
import UnifiedLogin from '../pages/Login'
import Baseline from '../pages/Baseline'
import ModelAnalysis from '../pages/ModelAnalysis'
import Home from '../pages/student/Home'
import JoinClass from '../pages/student/JoinClass'
import EEGPairing from '../pages/student/EEGPairing'
import EEGSession from '../pages/student/EEGSession'
import ModeSelect from '../pages/student/ModeSelect'
import { FocusMode } from '../pages/student/FocusMode'
import RelaxMode from '../pages/student/RelaxMode'
import SwitchingModes from '../pages/student/SwitchingModes'
import SessionSummary from '../pages/student/SessionSummary'
import LearningJournal from '../pages/student/LearningJournal'
import JournalHistory from '../pages/student/JournalHistory'
import Settings from '../pages/student/Settings'
import Profile from '../pages/student/Profile'
import Achievements from '../pages/student/Achievements'
import Classes from '../pages/student/Classes'
import ClassDetail from '../pages/student/ClassDetail'
import ClassPackageLessons from '../pages/student/ClassPackageLessons'
import PracticeLesson from '../pages/student/PracticeLesson'
import LessonModeSelect from '../pages/student/LessonModeSelect'
import StudentSessions from '../pages/student/Sessions'
import FreeLessonSelect from '../pages/student/FreeLessonSelect'
import { AudioJournal, DrawingJournal } from '../pages/student/JournalMedia'

import Dashboard from '../pages/teacher/Dashboard'
import TeacherClassSession from '../pages/teacher/ClassSession'
import TeacherEnrollment from '../pages/teacher/Enrollment'
import ClassSessionLobby from '../pages/student/ClassSessionLobby'
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
import Reports from '../pages/teacher/Reports'
import AdvancedReports from '../pages/teacher/AdvancedReports'
import ResearchAnalysis from '../pages/admin/ResearchAnalysis'
import AdminSchools from '../pages/admin/Schools'
import SchoolAdminDashboard from '../pages/schoolAdmin/Dashboard'
import SchoolAdminClasses from '../pages/schoolAdmin/Classes'
import SchoolAdminDirectory from '../pages/schoolAdmin/Directory'
import SuperAdminAccounts from '../pages/superAdmin/Accounts'
import SuperAdminDashboard from '../pages/superAdmin/Dashboard'
import SuperAdminRequests from '../pages/superAdmin/Requests'
import SystemValidation from '../pages/superAdmin/Validation'
import {
  AdminDashboard as TemplateAdminDashboard, AdminAccounts as TemplateAdminAccounts,
  TeacherJournals as TemplateTeacherJournals, Reports as TemplateReports, ClassSetup as TemplateClassSetup,
  StudentRegistration, TeacherRegistration,
  ForgotPassword, ResetPassword, StudentCalibration, EEGDiagnostics,
  HardwareRequired, Enrollment,
  StudentHistory,
} from '../pages/prototype'

const templateOnly = import.meta.env.VITE_TEMPLATE_ONLY === 'true'

export default function AppRouter() {
  return (
    <Routes>
      {/* Student */}
      <Route path="/" element={<UnifiedLogin />} />
      <Route element={<ProtectedRoute roles={['student', 'teacher', 'super_admin']} />}><Route path="/baseline" element={<Baseline />} /></Route>
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
      <Route path="/student/class-session/:groupId" element={<ClassSessionLobby />} />
      <Route path="/student/home" element={<Home />} />
      <Route path="/student/join-class" element={<JoinClass />} />
      <Route path="/student/eeg-pairing" element={<EEGPairing />} />
      <Route path="/student/eeg-live" element={<EEGSession />} />
      <Route path="/student/mode-select" element={<ModeSelect />} />
      <Route path="/student/free-lesson-select" element={<FreeLessonSelect />} />
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="/student/relax" element={<RelaxMode />} />
      <Route path="/student/switching" element={<SwitchingModes />} />
      <Route path="/student/session-summary" element={<SessionSummary />} />
      <Route path="/student/journal" element={<LearningJournal />} />
      <Route path="/student/journal/history" element={<JournalHistory />} />
      <Route path="/student/notifications" element={<Navigate to="/student/home" replace />} />
      <Route path="/student/settings" element={<Settings />} />
      <Route path="/student/profile" element={<Profile />} />
      <Route path="/student/achievements" element={<Achievements />} />
      <Route path="/student/classes" element={<Classes />} />
      <Route path="/student/sessions" element={<StudentSessions />} />
      <Route path="/student/class/:classId" element={<ClassDetail />} />
      <Route path="/student/class/:classId/package/:packageSlug" element={<ClassPackageLessons />} />
      <Route path="/student/class/:classId/lesson/:lessonId/practice" element={<PracticeLesson />} />
      <Route path="/student/class/:classId/lesson/:lessonId" element={<LessonModeSelect />} />
      <Route path="/student/calibration" element={<StudentCalibration />} />
      <Route path="/student/eeg-diagnostics" element={<EEGDiagnostics />} />
      <Route path="/student/hardware-required" element={<HardwareRequired />} />
      <Route path="/student/journal/draw" element={<DrawingJournal />} />
      <Route path="/student/journal/audio" element={<AudioJournal />} />
      </Route>

      {/* Teacher */}
      <Route element={<ProtectedRoute roles={['teacher']} />}>
      <Route path="/teacher/sessions" element={<TeacherClassSession />} />
      <Route path="/teacher/class-session/:groupId" element={<TeacherClassSession />} />
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
      <Route path="/teacher/journals" element={templateOnly ? <TemplateTeacherJournals /> : <TeacherJournals />} />
      <Route path="/teacher/reports" element={templateOnly ? <TemplateReports /> : <Reports />} />
      <Route path="/teacher/reports/advanced" element={<AdvancedReports />} />
      <Route path="/teacher/classes/new" element={templateOnly ? <TemplateClassSetup /> : <TeacherClassSetup />} />
      <Route path="/teacher/class/:classId/enroll" element={templateOnly ? <Enrollment /> : <TeacherEnrollment />} />
      <Route path="/teacher/class/:classId/session" element={<TeacherClassSession />} />
      <Route path="/teacher/student/:studentId/analytics" element={<StudentHistory />} />
      </Route>

      {/* School administrator */}
      <Route element={<ProtectedRoute roles={['school_admin']} />}>
        <Route path="/school-admin/notifications" element={<NotificationCenter />} />
        <Route path="/school-admin/dashboard" element={<SchoolAdminDashboard />} />
        <Route path="/school-admin/classes" element={<SchoolAdminClasses />} />
        <Route path="/school-admin/teachers" element={<SchoolAdminDirectory />} />
        <Route path="/school-admin/students" element={<SchoolAdminDirectory />} />
      </Route>

      {/* Super administrator */}
      <Route element={<ProtectedRoute roles={['super_admin']} />}>
        <Route path="/admin/notifications" element={<NotificationCenter />} />
        <Route path="/model_analysis" element={<ModelAnalysis />} />
        <Route path="/admin/dashboard" element={templateOnly ? <TemplateAdminDashboard /> : <SuperAdminDashboard />} />
        <Route path="/admin/accounts" element={templateOnly ? <TemplateAdminAccounts /> : <SuperAdminAccounts />} />
        <Route path="/admin/requests" element={<SuperAdminRequests />} />
        <Route path="/admin/evaluation" element={<SystemValidation />} />
        <Route path="/admin/analysis" element={<ResearchAnalysis />} />
        <Route path="/admin/schools" element={<AdminSchools />} />
      </Route>
      <Route path="/admin/login" element={<Navigate to="/" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
