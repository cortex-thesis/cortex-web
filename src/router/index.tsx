import { Routes, Route, Navigate } from 'react-router-dom'
import { FocusMode } from '../pages/student/FocusMode'
import RelaxMode from '../pages/student/RelaxMode'
import SwitchingModes from '../pages/student/SwitchingModes'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/student/focus" element={<FocusMode />} />
      <Route path="/student/relax" element={<RelaxMode />} />
      <Route path="/student/switching" element={<SwitchingModes />} />
      <Route path="*" element={<Navigate to="/student/focus" replace />} />
    </Routes>
  )
}
