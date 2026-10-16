import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
export interface SchoolYearOption { value: string; label: string; is_active: boolean; is_archived: boolean }
export interface ReportYearData { school_years: SchoolYearOption[]; selected_school_year: string }
export function useReportYear() {
  const [params, setParams] = useSearchParams()
  const schoolYear = params.get('school_year') ?? ''
  const setSchoolYear = useCallback((value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('school_year', value); return next }, { replace: true }), [setParams])
  return { schoolYear, setSchoolYear, yearQuery: schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '' }
}
