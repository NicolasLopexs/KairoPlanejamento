import { useState } from 'react'
import { Editable } from './Editable'
import { weekdayFromDate } from '../lib/weekday'
import { PILLAR_CLASS, PILLARS, STATUSES, type FeedPost, type Pillar, type PostStatus } from '../lib/types'

export function FeedPostCard({
  post,
  canManage,
  onUpdate,
  onDelete,
}: {
  post: FeedPost
  canManage: boolean
  onUpdate: (id: string, patch: Partial<FeedPost>) => void
  onDelete: (id: string) => void
}) {
  const [flashing, setFlashing] = useState<'pillar' | 'status' | null>(null)

  function flash(field: 'pillar' | 'status') {
    setFlashing(null)
    requestAnimationFrame(() => setFlashing(field))
    setTimeout(() => setFlashing((f) => (f === field ? null : f)), 700)
  }

  return (
    <div
      className="card"
      style={
        {
          '--p-bg': `var(--p-${PILLAR_CLASS[post.pillar]}-bg)`,
          '--p-fg': `var(--p-${PILLAR_CLASS[post.pillar]}-fg)`,
          '--p-line': `var(--p-${PILLAR_CLASS[post.pillar]}-line)`,
        } as React.CSSProperties
      }
    >
      <div className="card-top">
        <div className="date-badge">
          <input
            type="date"
            className="date-input"
            value={post.post_date}
            onChange={(e) => {
              const post_date = e.target.value
              if (!post_date) return
              onUpdate(post.id, { post_date, weekday: weekdayFromDate(post_date) })
            }}
          />
          <span className="dow">{post.weekday}</span>
        </div>
        <div className="tag-row">
          <Editable as="span" className="tag" value={post.format} onSave={(v) => onUpdate(post.id, { format: v })} />
          <select
            className={`pillar-select ${flashing === 'pillar' ? 'select-flash' : ''}`}
            value={post.pillar}
            style={
              {
                '--p-bg': `var(--p-${PILLAR_CLASS[post.pillar]}-bg)`,
                '--p-fg': `var(--p-${PILLAR_CLASS[post.pillar]}-fg)`,
              } as React.CSSProperties
            }
            onChange={(e) => {
              onUpdate(post.id, { pillar: e.target.value as Pillar })
              flash('pillar')
            }}
          >
            {PILLARS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-label">Tema / ideia</div>
      <Editable className="tema" value={post.tema} onSave={(v) => onUpdate(post.id, { tema: v })} />

      <div className="field-label">Legenda / CTA sugerida</div>
      <Editable className="legenda" value={post.legenda} onSave={(v) => onUpdate(post.id, { legenda: v })} />

      <div className="card-bottom">
        <select
          className={`status-select status-${post.status} ${flashing === 'status' ? 'select-flash' : ''}`}
          value={post.status}
          onChange={(e) => {
            onUpdate(post.id, { status: e.target.value as PostStatus })
            flash('status')
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {canManage && (
          <button className="btn-danger-ghost" onClick={() => onDelete(post.id)}>
            Remover
          </button>
        )}
      </div>
    </div>
  )
}
