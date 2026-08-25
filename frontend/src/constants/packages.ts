import type { ComponentType } from 'react'
import type { CurriculumPackage } from './states'
import {
  HeartHandshake,
  CookingPot,
  Wrench,
  Sprout,
  BookOpen,
  Briefcase,
  Palette,
} from 'lucide-react'

interface PackageMeta {
  label: string
  icon: ComponentType<{ className?: string }>
  bg: string
}

export const PACKAGE_META: Record<CurriculumPackage, PackageMeta> = {
  care: { label: 'Care', icon: HeartHandshake, bg: '#E6F1FB' },
  life: { label: 'Life', icon: CookingPot, bg: '#E1F5EE' },
  pre_vocational: { label: 'Pre-Vocational', icon: Wrench, bg: '#FAEEDA' },
  livelihood: { label: 'Livelihood', icon: Sprout, bg: '#EFF6E4' },
  functional_academics: {
    label: 'Functional Academics',
    icon: BookOpen,
    bg: '#EEEDFE',
  },
  career: { label: 'Career', icon: Briefcase, bg: '#FBEAF0' },
  enrichment: { label: 'Enrichment', icon: Palette, bg: '#FDF1E7' },
}
