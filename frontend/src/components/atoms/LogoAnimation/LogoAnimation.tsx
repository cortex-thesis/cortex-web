import { motion } from 'framer-motion'
import { useEffect, useState, type CSSProperties } from 'react'
import styles from './LogoAnimation.module.css'

import LetterC from '../../../assets/icons/logo/c.svg?react'
import LetterO from '../../../assets/icons/logo/o.svg?react'
import LetterR from '../../../assets/icons/logo/r.svg?react'
import Brain from '../../../assets/icons/logo/brain.svg?react'
import LetterT from '../../../assets/icons/logo/t.svg?react'
import LetterE from '../../../assets/icons/logo/e.svg?react'
import LetterX from '../../../assets/icons/logo/x.svg?react'

// Timing
const SPRING_SETTLE = 0.7
const SPIN_DELAY = SPRING_SETTLE
const LTR_START = 1.15
const LTR_STAGGER = 0.27
const LTR_DUR = 0.32
const X_SETTLE = LTR_START + 5 * LTR_STAGGER + LTR_DUR
const SPIN_DUR = X_SETTLE - SPIN_DELAY
const FREEZE = 1.0
const LOOP_TOTAL = X_SETTLE + FREEZE

const lDelay = (i: number) => LTR_START + i * LTR_STAGGER

interface LetterConfig {
  id: string
  Component: React.FC<React.SVGProps<SVGSVGElement>>
  index: number
  style: CSSProperties & { width: number; height: number }
  rotate: number
}

// Radial Layout Coordinates & Angles Matching Logo Reference
const LETTERS: LetterConfig[] = [
  {
    id: 'c',
    Component: LetterC,
    index: 0,
    style: { left: 242, top: 228, width: 95, height: 95 },
    rotate: -15,
  },
  {
    id: 'o',
    Component: LetterO,
    index: 1,
    style: { left: 168, top: 162, width: 98, height: 98 },
    rotate: -48,
  },
  {
    id: 'r',
    Component: LetterR,
    index: 2,
    style: { left: 205, top: 72, width: 95, height: 98 },
    rotate: -24,
  },
  {
    id: 't',
    Component: LetterT,
    index: 3,
    style: { left: 304, top: 60, width: 95, height: 98 },
    rotate: 24,
  },
  {
    id: 'e',
    Component: LetterE,
    index: 4,
    style: { left: 372, top: 135, width: 95, height: 82 },
    rotate: 52,
  },
  {
    id: 'x',
    Component: LetterX,
    index: 5,
    style: { left: 350, top: 218, width: 92, height: 92 },
    rotate: 12,
  },
]

interface LogoAnimationProps {
  onComplete?: () => void
  loop?: boolean
  className?: string
}

export default function LogoAnimation({
  onComplete,
  loop = true,
  className,
}: LogoAnimationProps) {
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (!loop) return
    const timer = setTimeout(() => {
      setAnimKey((prev) => prev + 1)
    }, LOOP_TOTAL * 1000)
    return () => clearTimeout(timer)
  }, [animKey, loop])

  return (
    <div className={`${styles.stage} ${className ?? ''}`}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />

      <div className={styles.canvas} role="img" aria-label="Cortex">
        {/* Brain: Center scale-in and spin */}
        <div className={styles.brainWrap}>
          <motion.div
            key={`brain-${animKey}`}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              scale: [0, 1, 1],
              opacity: [0, 1, 1],
              rotate: [0, 0, 720],
            }}
            transition={{
              scale: {
                type: 'spring',
                stiffness: 280,
                damping: 16,
                duration: SPRING_SETTLE,
              },
              opacity: { duration: 0.3 },
              rotate: {
                delay: SPIN_DELAY,
                duration: SPIN_DUR,
                ease: 'linear',
              },
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain width={95} height={95} aria-hidden="true" />
          </motion.div>
        </div>

        {/* Letters pop-in with radial placement */}
        {LETTERS.map(({ id, Component, index, style, rotate }) => (
          <motion.div
            key={`${id}-${animKey}`}
            className={styles.letter}
            style={{
              ...style,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: lDelay(index),
              duration: LTR_DUR,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            onAnimationComplete={() => {
              if (index === LETTERS.length - 1 && onComplete) {
                onComplete()
              }
            }}
          >
            <Component
              width={style.width}
              height={style.height}
              style={{
                transform: `rotate(${rotate}deg)`,
                width: '100%',
                height: '100%',
              }}
              aria-hidden="true"
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
