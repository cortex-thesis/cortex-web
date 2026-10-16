import type { SchoolYearOption } from './reportingYears'
export function SchoolYearOptions({ years }: { years?: SchoolYearOption[] }) {
  return <><option value="all">All non-archived school years</option>{years?.map(year => <option key={year.value} value={year.value}>{year.label}{year.is_archived ? ' (Archived)' : year.is_active ? ' (Active)' : ''}</option>)}</>
}
