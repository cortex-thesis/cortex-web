from pathlib import Path
p=Path('frontend/src/pages/teacher/Dashboard.tsx')
s=p.read_text(encoding='utf-8')
start=s.index('        <div className={styles.activityGrid}>')
end=s.index('      </>}',start)
s=s[:start]+'''        <RecentClassActivity sessions={data.recent_sessions} badges={data.recent_badges} />
'''+s[end:]
start=s.index('      <div className={analyticsStyles.statsRow}>')
s=s[:start]+'''      <section className={styles.statsPanel} aria-label="Class statistics">
        <div className={styles.statsHeader}>
          <h2>Statistics</h2>
          <div className={styles.filters}>
            <label>Class<select value={classId} onChange={event => setClassId(event.target.value)}><option value="">All my classes</option>{data?.classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Period<select value={month === 'all' ? 'all' : 'month'} onChange={event => setMonth(event.target.value === 'all' ? 'all' : new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))}><option value="month">Monthly</option><option value="all">All time</option></select></label>
            {month !== 'all' && <label>Month<input type="month" value={month} onChange={event => { if (event.target.value) setMonth(event.target.value) }} /></label>}
          </div>
        </div>
'''+s[start:]
s=s.replace(' sub="Within the reporting period" subColor="var(--color-teal)"','')
start=s.index('      <section className={styles.liveSection}>')
s=s[:start]+'''        <p className={styles.statsNote}>EEG percentages use valid samples from completed sessions.</p>
      </section>
'''+s[start:]
s=s.replace('Current sessions | Refreshes every four seconds | Independent of reporting month','Live updates')
s=s.replace('No online sessions match your filters. Online status uses a recent heartbeat; EEG status requires a fresh headset sample.','No live sessions match your filters.')
p.write_text(s,encoding='utf-8')
p=Path('frontend/src/pages/teacher/ClassOverview.tsx')
s=p.read_text(encoding='utf-8')
s=s.replace("import { PACKAGE_META } from '../../constants/packages'\nimport { PACKAGE_EMOJI } from '../../lib/studentApi'", "import { RecentClassActivity } from '../../components/organisms/teacher/RecentClassActivity'")
start=s.index('      <div className={styles.recentGrid}>')
end=s.index('      <div className={styles.liveLayout}>',start)
s=s[:start]+'''      <RecentClassActivity sessions={activity?.recent_sessions.slice(0, 3)} badges={activity?.recent_badges.slice(0, 3)} classId={classId} />
'''+s[end:]
p.write_text(s,encoding='utf-8')
p=Path('frontend/src/pages/teacher/Dashboard.module.css')
s=p.read_text(encoding='utf-8')
remove=['.activityGrid ','.activityList ','.activityItem ','.activityItem:last-child ','.activityItem > svg ','.activityItem > div ','.activityItem small, ','.activityItem a ','.badgeClasses ']
s='\n'.join(line for line in s.split('\n') if not any(line.lstrip().startswith(x) for x in remove))
s=s.replace('.activityList:focus-visible, ', '')
p.write_text(s,encoding='utf-8')
