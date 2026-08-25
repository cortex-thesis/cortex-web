import styles from './Skeleton.module.css'
import clsx from 'clsx'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  circle?: boolean
  className?: string
}

function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
  circle = false,
  className,
}: SkeletonProps) {
  const resolvedRadius = circle ? '50%' : borderRadius

  return (
    <div
      className={clsx(styles.skeleton, className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius:
          typeof resolvedRadius === 'number'
            ? `${resolvedRadius}px`
            : resolvedRadius,
      }}
      aria-hidden="true"
    />
  )
}

export default Skeleton
