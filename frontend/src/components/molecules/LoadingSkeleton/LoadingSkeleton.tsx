import { Skeleton } from '../../atoms'
import styles from './LoadingSkeleton.module.css'

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return <div className={styles.grid} role="status" aria-label="Loading content">
    {Array.from({ length: count }, (_, index) => <div className={styles.card} key={index}>
      <div className={styles.cardHead}><Skeleton width={44} height={44} borderRadius={12} /><div className={styles.grow}><Skeleton width="46%" height={13} /><Skeleton width="72%" height={9} /></div></div>
      <Skeleton height={10} /><Skeleton width="82%" height={10} /><Skeleton width="58%" height={10} />
    </div>)}
  </div>
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className={styles.list} role="status" aria-label="Loading content">
    {Array.from({ length: rows }, (_, index) => <div className={styles.row} key={index}>
      <Skeleton width={42} height={42} borderRadius={12} />
      <div className={styles.grow}><Skeleton width={`${58 + (index % 3) * 10}%`} height={12} /><Skeleton width={`${38 + (index % 2) * 18}%`} height={9} /></div>
      <Skeleton width={70} height={24} borderRadius={999} />
    </div>)}
  </div>
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return <div className={styles.table} role="status" aria-label="Loading table">
    {Array.from({ length: rows }, (_, row) => <div className={styles.tableRow} style={{ gridTemplateColumns: `repeat(${columns}, minmax(70px, 1fr))` }} key={row}>
      {Array.from({ length: columns }, (_, column) => <Skeleton key={column} width={column === 0 ? '82%' : `${52 + ((row + column) % 3) * 12}%`} height={row === 0 ? 11 : 13} />)}
    </div>)}
  </div>
}

export function DetailSkeleton() {
  return <div className={styles.detail} role="status" aria-label="Loading details">
    <div className={styles.hero}><Skeleton width={58} height={58} circle /><div className={styles.grow}><Skeleton width="42%" height={20} /><Skeleton width="68%" height={11} /></div></div>
    <CardGridSkeleton count={3} />
    <div className={styles.panel}><Skeleton width="28%" height={16} /><Skeleton height={12} /><Skeleton width="91%" height={12} /><Skeleton width="76%" height={12} /></div>
  </div>
}

export function InlineSkeleton({ width = 180, height = 18 }: { width?: number | string; height?: number }) {
  return <span className={styles.inline} role="status" aria-label="Loading"><Skeleton width={width} height={height} /></span>
}
