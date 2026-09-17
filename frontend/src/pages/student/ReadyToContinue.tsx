import { useEffect, useRef } from 'react'
import styles from './EEGRegulation.module.css'
import playerStyles from './PracticeLesson.module.css'

export default function ReadyToContinue({ allowResume, paused, onResume }: {
  allowResume: boolean; paused: boolean; onResume: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <div className={styles.continuation}>
    <h1 ref={heading} tabIndex={-1}>Ready to continue?</h1>
    <p>{allowResume ? "Let's go back to your lesson." : 'Your teacher will continue the lesson when the class is ready.'}</p>
    {allowResume && <div className={styles.actions}><button className={`${playerStyles.button} ${playerStyles.next}`} disabled={paused} onClick={onResume}>Continue</button></div>}
  </div>
}
