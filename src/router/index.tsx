import { Routes, Route, Navigate } from 'react-router-dom'
import { FocusMode } from '../pages/student/FocusMode'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="*" element={<Navigate to="/student/focus" replace />} />
    </Routes>
  )
}
