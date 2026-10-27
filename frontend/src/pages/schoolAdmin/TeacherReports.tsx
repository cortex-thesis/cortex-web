import { useParams } from 'react-router-dom'
import Reports from '../teacher/Reports'
import AdvancedReports from '../teacher/AdvancedReports'

export default function TeacherReports({ advanced = false }: { advanced?: boolean }) {
  const { teacherId = '' } = useParams()
  return advanced ? <AdvancedReports key={teacherId} schoolAdminTeacherId={teacherId} /> : <Reports key={teacherId} schoolAdminTeacherId={teacherId} />
}
