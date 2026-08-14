import { useEffect, useMemo, useState } from 'react'
import { FeedPostCard } from './FeedPostCard'
import { PILLAR_CLASS, type FeedPost } from '../lib/types'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAY_HEADS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface DayCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  posts: FeedPost[]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function buildMonthGrid(year: number, month: number, feed: FeedPost[]): DayCell[] {
  const byDate = new Map<string, FeedPost[]>()
  for (const post of feed) {
    if (!byDate.has(post.post_date)) byDate.set(post.post_date, [])
    byDate.get(post.post_date)!.push(post)
  }

  const first = new Date(Date.UTC(year, month, 1))
  const gridStart = new Date(first)
  gridStart.setUTCDate(first.getUTCDate() - first.getUTCDay())
  const todayIso = new Date().toISOString().slice(0, 10)

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setUTCDate(gridStart.getUTCDate() + i)
    const iso = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
    cells.push({
      date: iso,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
      isToday: iso === todayIso,
      posts: (byDate.get(iso) ?? []).sort((a, b) => a.tema.localeCompare(b.tema)),
    })
  }
  // corta a última semana se ela inteira já é do próximo mês (mês cabe em 5 linhas)
  while (cells.length > 35 && cells.slice(-7).every((c) => !c.inMonth)) {
    cells.splice(-7, 7)
  }
  return cells
}

export function FeedCalendar({
  feed,
  canManage,
  onUpdate,
  onDelete,
  onAddOnDate,
}: {
  feed: FeedPost[]
  canManage: boolean
  onUpdate: (id: string, patch: Partial<FeedPost>) => void
  onDelete: (id: string) => void
  onAddOnDate: (isoDate: string) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const cells = useMemo(() => buildMonthGrid(year, month, feed), [year, month, feed])
  const selectedPost = feed.find((p) => p.id === selectedId) ?? null

  useEffect(() => {
    if (!selectedId) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId])

  function goPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function goNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div>
      <div className="cal-nav">
        <button className="btn-ghost" onClick={goPrevMonth} aria-label="Mês anterior">
          ←
        </button>
        <span className="cal-month-label">
          {MONTH_NAMES[month]} {year}
        </span>
        <button className="btn-ghost" onClick={goNextMonth} aria-label="Próximo mês">
          →
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAY_HEADS.map((w) => (
          <div className="cal-head" key={w}>
            {w}
          </div>
        ))}
        {cells.map((cell) => (
          <div key={cell.date} className={`cal-cell ${cell.inMonth ? '' : 'cal-cell-out'} ${cell.isToday ? 'cal-cell-today' : ''}`}>
            <div className="cal-cell-head">
              <span className="cal-day-num">{cell.day}</span>
              {canManage && cell.inMonth && (
                <button className="cal-add" onClick={() => onAddOnDate(cell.date)} aria-label="Novo post nesta data">
                  +
                </button>
              )}
            </div>
            <div className="cal-chips">
              {cell.posts.map((post) => (
                <button
                  key={post.id}
                  className={`cal-chip cal-chip-${PILLAR_CLASS[post.pillar]}`}
                  onClick={() => setSelectedId(post.id)}
                  title={post.tema}
                >
                  {post.tema || '(sem tema)'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Editar post" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedId(null)} aria-label="Fechar">
              ×
            </button>
            <FeedPostCard
              post={selectedPost}
              canManage={canManage}
              onUpdate={onUpdate}
              onDelete={(id) => {
                onDelete(id)
                setSelectedId(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
