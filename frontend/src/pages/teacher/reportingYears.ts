import { useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
export interface SchoolYearOption { value: string; label: string; is_active: boolean; is_archived: boolean }
export interface ReportYearData { school_years: SchoolYearOption[]; selected_school_year: string }
export function useReportYear() {
  const [params, setParams] = useSearchParams()
  const schoolYear = params.get('school_year') ?? ''
  const explicitSelection = useRef(false)
  const setSchoolYear = useCallback((value: string, onlyIfUnset = false) => {
    // Router search-param updaters use the previous render's params. A late
    // initial response must not replace an explicit selection made meanwhile.
    if (onlyIfUnset && explicitSelection.current) return
    if (!onlyIfUnset) explicitSelection.current = true
    setParams(previous => {
      if (onlyIfUnset && previous.has('school_year')) return previous
      const next = new URLSearchParams(previous)
      next.set('school_year', value)
      return next
    }, { replace: true })
  }, [setParams])
  return { schoolYear, setSchoolYear, yearQuery: schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '' }
}
