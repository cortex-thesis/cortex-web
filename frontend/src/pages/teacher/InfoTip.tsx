import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import styles from './Dashboard.module.css'

export default function InfoTip({ label, text }: { label: string; text: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return <span className={styles.infoTip} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label={label} aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}><Info size={15} aria-hidden="true" /></button>
    {open && <span id={id} role="tooltip" className={styles.infoTooltip}>{text}</span>}
  </span>
}
