import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SkeletonRows } from './Skeleton'
import { EmptyState } from './EmptyState'

interface LogRow {
  id: string
  table_name: string
  action: 'insert' | 'update' | 'delete' | 'error'
  summary: string
  created_at: string
  profiles: { full_name: string | null; email: string | null } | null
}

const TABLE_LABEL: Record<string, string> = {
  feed_posts: 'Feed',
  stories_template: 'Stories',
  capture_guide: 'Captação',
  notificacoes: 'Notificações',
}

const ACTION_LABEL: Record<Exclude<LogRow['action'], 'error'>, string> = {
  insert: 'criou',
  update: 'editou',
  delete: 'removeu',
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function ActivityLog({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('activity_log')
      .select('id, table_name, action, summary, created_at, profiles ( full_name, email )')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (cancelled) return
        setRows((data as unknown as LogRow[]) ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  return (
    <section className="fade-in">
      <p className="sub">Últimas 100 alterações neste cliente — feed, stories e orientações de captação.</p>

      {loading ? (
        <SkeletonRows count={4} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma alteração registrada ainda" hint="Assim que algo for criado ou editado, aparece aqui." />
      ) : (
        <div className="log-list">
          {rows.map((r) =>
            r.action === 'error' ? (
              <div className="log-row log-row-error" key={r.id}>
                <span className="log-when">{formatWhen(r.created_at)}</span>
                <span className="log-body">{r.summary}</span>
              </div>
            ) : (
              <div className="log-row" key={r.id}>
                <span className="log-when">{formatWhen(r.created_at)}</span>
                <span className="log-body">
                  <strong>{r.profiles?.full_name || r.profiles?.email || 'Alguém'}</strong> {ACTION_LABEL[r.action]} em{' '}
                  <span className="log-table">{TABLE_LABEL[r.table_name] ?? r.table_name}</span>
                  {r.action === 'update' && <> — {r.summary}</>}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </section>
  )
}
