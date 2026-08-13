import { useMemo } from 'react'
import { PILLAR_CLASS, PILLARS, STATUSES, type FeedPost } from '../lib/types'

export function FeedStats({ feed }: { feed: FeedPost[] }) {
  const stats = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10)
    const late = feed.filter((p) => p.post_date < todayIso && p.status !== 'postado').length
    const byStatus = STATUSES.map((s) => ({ ...s, count: feed.filter((p) => p.status === s.value).length }))
    const byPillar = PILLARS.map((p) => ({ pillar: p, count: feed.filter((f) => f.pillar === p).length })).filter(
      (p) => p.count > 0
    )
    return { late, byStatus, byPillar }
  }, [feed])

  if (feed.length === 0) return null

  return (
    <div className="stats-row">
      <div className={`stat-tile ${stats.late > 0 ? 'stat-tile-warn' : ''}`}>
        <span className="stat-num">{stats.late}</span>
        <span className="stat-label">Atrasado{stats.late === 1 ? '' : 's'}</span>
      </div>
      <div className="stat-group">
        <span className="stat-group-label">Por status</span>
        <div className="stat-chips">
          {stats.byStatus.map((s) => (
            <span key={s.value} className={`stat-chip status-${s.value}`}>
              {s.label} <b>{s.count}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="stat-group">
        <span className="stat-group-label">Por pilar</span>
        <div className="stat-chips">
          {stats.byPillar.map((p) => (
            <span key={p.pillar} className="stat-chip">
              <span className={`dot dot-${PILLAR_CLASS[p.pillar]}`} /> {p.pillar} <b>{p.count}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
