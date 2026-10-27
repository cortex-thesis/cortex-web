import type { CurriculumPackage } from './states'

interface PackageMeta {
  label: string
  image: string
  bg: string
}

export const PACKAGE_META: Record<CurriculumPackage, PackageMeta> = {
  care: { label: 'Care', image: '/assets/packages/care.png', bg: '#E6F1FB' },
  life: { label: 'Life', image: '/assets/packages/life.png', bg: '#E1F5EE' },
  pre_vocational: { label: 'Pre-Vocational', image: '/assets/packages/pre_vocational.png', bg: '#FAEEDA' },
  livelihood: { label: 'Livelihood', image: '/assets/packages/livelihood.png', bg: '#EFF6E4' },
  functional_academics: {
    label: 'Functional Academics',
    image: '/assets/packages/functional_academics.png',
    bg: '#EEEDFE',
  },
  career: { label: 'Career', image: '/assets/packages/career.png', bg: '#FBEAF0' },
  enrichment: { label: 'Enrichment', image: '/assets/packages/enrichment.png', bg: '#FDF1E7' },
}
