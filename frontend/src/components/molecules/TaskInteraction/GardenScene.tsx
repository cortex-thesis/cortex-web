import styles from './GardenMission.module.css'

export default function GardenScene({ scene, applied }: { scene: string; applied: boolean }) {
  const benefits = ['meal', 'display', 'practice'].includes(scene)
  const inspection = ['inspect', 'compare', 'reference'].includes(scene)
  if (benefits || inspection) {
    const labels: Record<string, [string, string]> = {
      meal: ['Meal plate waiting', 'Vegetables added to the meal'],
      display: ['Vase waiting', 'Flowers brighten the space'],
      practice: ['Practice corner', 'Supported plant-care practice'],
      inspect: ['Practice drawings on the tray', 'Practice drawings enlarged'],
      compare: ['Drawings waiting for comparison', 'Drawings shown side by side'],
      reference: ['Guidance card closed', 'Approved samples and criteria needed'],
    }
    const label = labels[scene][applied ? 1 : 0]
    const seed = (x: number, wide: boolean, scale: number) => <g transform={`translate(${x} 95) scale(${scale})`}>
      <ellipse rx={wide ? 24 : 15} ry="28" fill="#bb9366" stroke="#775a3e" strokeWidth="2" />
      <path d="M0 -20Q-7 0 0 20" fill="none" stroke="#e4c6a0" strokeWidth="3" />
    </g>
    return <svg className={styles.gardenScene} viewBox="0 0 400 210" role="img" aria-label={label}>
      <rect width="400" height="210" rx="16" fill="#eef7ed" />
      {scene === 'meal' && <>
        <ellipse cx="200" cy="113" rx="115" ry="57" fill="white" stroke="#9eafa4" strokeWidth="4" />
        <ellipse cx="200" cy="113" rx="90" ry="40" fill="#f5f4e8" />
        {applied && <><circle cx="170" cy="107" r="23" fill="#cd6652" /><path d="M165 80l5 9 8-9" stroke="#55854b" strokeWidth="5" fill="none" />
          <path d="M213 84l31 9-19 43Z" fill="#ecab51" /><path d="M230 87l-6-17m8 18 8-17" stroke="#55854b" strokeWidth="5" />
          <ellipse cx="192" cy="136" rx="25" ry="13" fill="#78a465" /></>}
      </>}
      {scene === 'display' && <>
        <rect x="80" y="160" width="240" height="10" rx="4" fill="#bf956b" />
        <path d="M164 108h72l-12 51h-48Z" fill="#9cbfc7" />
        {applied && [155, 200, 245].map((x, i) => <g key={x}><path d={`M200 126L${x} 65`} stroke="#56844d" strokeWidth="5" />
          {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx={x} cy="50" rx="11" ry="18" transform={`rotate(${angle} ${x} 65)`} fill={i === 1 ? '#a48bb8' : '#e2a0b1'} />)}
          <circle cx={x} cy="65" r="10" fill="#f1d678" /></g>)}
      </>}
      {scene === 'practice' && <>
        <path d="M162 104h76l-11 62h-54Z" fill="#c48459" /><ellipse cx="200" cy="104" rx="38" ry="10" fill="#75563c" />
        <path d="M200 101V65" stroke="#56844d" strokeWidth="6" /><path d="M200 87q-35 0-31-29 28 0 31 29m0-13q27 0 29-29-28 0-29 29" fill="#78a465" />
        {applied && <><path d="M275 73h43v43h-43Z" fill="#91b6c9" /><path d="M275 85l-36 15" stroke="#91b6c9" strokeWidth="12" />
          <path d="M241 112l-6 14m-6-12-6 14" stroke="#78aeca" strokeWidth="4" /><text x="200" y="185" textAnchor="middle" fontSize="14" fill="#355344">With appropriate support</text></>}
      </>}
      {inspection && <>
        <text x="200" y="24" textAnchor="middle" fontSize="14" fill="#514a6c">Illustrations only — not a quality test</text>
        {scene !== 'reference' ? <>
          <rect x="55" y="38" width="290" height="130" rx="12" fill="#fffdf6" stroke="#b3bdac" strokeWidth="2" />
          {scene === 'compare' && applied && <path d="M200 40v125" stroke="#b3bdac" strokeWidth="2" />}
          {seed(scene === 'compare' && !applied ? 175 : 130, false, applied || scene === 'compare' ? 1.35 : .65)}
          {seed(scene === 'compare' && !applied ? 220 : 270, true, applied || scene === 'compare' ? 1.35 : .65)}
          <text x="130" y="157" textAnchor="middle" fontSize="13" fill="#514a6c">Drawing A</text>
          <text x="270" y="157" textAnchor="middle" fontSize="13" fill="#514a6c">Drawing B</text>
        </> : <>
          <rect x="55" y="42" width="290" height="130" rx="12" fill="#fffdf6" stroke="#b3bdac" strokeWidth="2" />
          <text x="200" y="78" textAnchor="middle" fontSize="17" fill="#355344">{applied ? 'Before selecting seeds' : 'Guidance needed'}</text>
          {applied && <><text x="200" y="111" textAnchor="middle" fontSize="14" fill="#514a6c">Ask for approved samples and criteria.</text>
            <text x="200" y="141" textAnchor="middle" fontSize="14" fill="#514a6c">Quality selection is not unlocked yet.</text></>}
        </>}
      </>}
      <text x="200" y="205" textAnchor="middle" fill="#355344" fontSize="14">{label}</text>
    </svg>
  }
  const label = scene === 'soil' ? applied ? 'Soil loosened' : 'Small soil patch' : scene === 'water' ? applied ? 'Moist soil' : 'Dry soil' : applied ? 'Length checked' : 'Garden bed'
  return <svg className={styles.gardenScene} viewBox="0 0 400 210" role="img" aria-label={label}>
    <rect width="400" height="210" rx="16" fill="#eef7ed" />
    <path d="M0 150Q100 125 200 150T400 150V210H0Z" fill="#d6e8ca" />
    {scene === 'water' ? <>
      <path d="M155 105H245L230 185H170Z" fill="#c48459" />
      <ellipse cx="200" cy="105" rx="45" ry="13" fill={applied ? '#55402e' : '#b59570'} />
      <path d="M200 104V55" stroke="#487f47" strokeWidth="7" strokeLinecap="round" />
      <path d="M200 82Q160 85 162 50Q194 48 200 82M200 67Q232 73 240 35Q203 33 200 67" fill="#71a963" />
      {applied && <g className={styles.waterDrops} fill="#6aafcd"><path d="M175 20q-12 18 0 18q12 0 0-18M205 12q-12 18 0 18q12 0 0-18M230 19q-12 18 0 18q12 0 0-18" /></g>}
    </> : <>
      <rect x="60" y="77" width="280" height="100" rx="14" fill="#bd855b" />
      <rect x="70" y="87" width="260" height="80" rx="10" fill="#8d6549" />
      {scene === 'soil' && applied && [105,130,155].map(y => <path key={y} d={`M90 ${y}Q140 ${y-8} 195 ${y}T310 ${y}`} fill="none" stroke="#604632" strokeWidth="7" strokeLinecap="round" />)}
      {scene === 'measure' && applied && <g className={styles.measuringTape}><rect x="60" y="61" width="280" height="20" rx="4" fill="#ffdb74" />{Array.from({length:15},(_,i)=><path key={i} d={`M${70+i*18} 61v${i%2?7:12}`} stroke="#605437" strokeWidth="2" />)}</g>}
    </>}
    <text x="200" y="205" textAnchor="middle" fill="#355344" fontSize="15">{label}</text>
  </svg>
}
