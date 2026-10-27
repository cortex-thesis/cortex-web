export type IllustrationName = 'muscle' | 'stars' | 'star' | 'school-building' | 'trophy' | 'medal' | 'sprout'
export default function IllustrationIcon({ name, size = 28 }: { name: IllustrationName; size?: number }) {
  const src = name === 'sprout' ? '/assets/learning-growth/sprout.png' : `/assets/interface/${name}.png`
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} style={{ display: 'inline-block', width: size, height: size, objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0 }} />
}
