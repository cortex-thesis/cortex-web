import type { CSSProperties } from 'react'
import type { CurriculumPackage } from '../../constants/states'
import { PACKAGE_META } from '../../constants/packages'

/** Decorative alongside a package name; preserves the enclosing icon tile's size. */
export default function PackageIcon({ packageId, size, className }: { packageId: CurriculumPackage; size?: number; className?: string }) {
  const style: CSSProperties = { display: 'block', width: size ?? '100%', height: size ?? '100%', objectFit: 'contain', padding: size ? 0 : '12%', boxSizing: 'border-box', flexShrink: 0 }
  return <img className={className} src={PACKAGE_META[packageId].image} alt="" aria-hidden="true" style={style} />
}
