import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TopBar } from '../components/TopBar'
import { SkeletonTiles } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../contexts/ToastContext'
import type { ClientRow } from '../lib/types'

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function StaffDashboard() {
  const toast = useToast()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [overdueByClient, setOverdueByClient] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')

  async function load() {
    setLoading(true)
    const todayIso = new Date().toISOString().slice(0, 10)
    const [clientsRes, overdueRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('feed_posts').select('client_id').lt('post_date', todayIso).neq('status', 'postado'),
    ])
    if (!clientsRes.error && clientsRes.data) setClients(clientsRes.data as ClientRow[])
    if (!overdueRes.error && overdueRes.data) {
      const counts: Record<string, number> = {}
      for (const row of overdueRes.data as { client_id: string }[]) {
        counts[row.client_id] = (counts[row.client_id] ?? 0) + 1
      }
      setOverdueByClient(counts)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const visibleClients = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return clients.filter(
      (c) => (showArchived ? c.archived_at : !c.archived_at) && (!q || c.name.toLowerCase().includes(q))
    )
  }, [clients, showArchived, searchText])
  const archivedCount = useMemo(() => clients.filter((c) => c.archived_at).length, [clients])
  const totalOverdue = useMemo(
    () => clients.filter((c) => !c.archived_at).reduce((sum, c) => sum + (overdueByClient[c.id] ?? 0), 0),
    [clients, overdueByClient]
  )
  const clientsWithOverdue = useMemo(
    () => clients.filter((c) => !c.archived_at && (overdueByClient[c.id] ?? 0) > 0).length,
    [clients, overdueByClient]
  )

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    const slug = slugify(newName)
    const { error } = await supabase.from('clients').insert({ name: newName.trim(), slug })
    setCreating(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'Já existe um cliente com esse nome.' : error.message)
      return
    }
    setNewName('')
    load()
  }

  async function handleArchive(id: string) {
    if (!confirm('Arquivar este cliente? Ele some da lista principal, mas o cronograma continua salvo.')) return
    setBusyId(id)
    const { error } = await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setBusyId(null)
    if (error) return toast.error(error.message)
    toast.success('Cliente arquivado.')
    load()
  }

  async function handleRestore(id: string) {
    setBusyId(id)
    const { error } = await supabase.from('clients').update({ archived_at: null }).eq('id', id)
    setBusyId(null)
    if (error) return toast.error(error.message)
    toast.success('Cliente reativado.')
    load()
  }

  return (
    <div className="app-shell">
      <TopBar eyebrow="Cronograma de Clientes" title="Clientes" />
      <main className="page-content">
        <form className="new-client-form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Nome do novo cliente (ex.: Samhia Simão)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Criando…' : 'Adicionar cliente'}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}

        {!loading && totalOverdue > 0 && !showArchived && (
          <div className="overview-banner">
            <strong>{totalOverdue}</strong> post{totalOverdue === 1 ? '' : 's'} atrasado{totalOverdue === 1 ? '' : 's'} em{' '}
            <strong>{clientsWithOverdue}</strong> cliente{clientsWithOverdue === 1 ? '' : 's'}.
          </div>
        )}

        <div className="dashboard-toolbar">
          <input
            type="search"
            className="filter-search"
            placeholder="Buscar cliente…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {(archivedCount > 0 || showArchived) && (
            <button className="btn-ghost archive-toggle" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? '← Ver clientes ativos' : `Ver arquivados (${archivedCount})`}
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonTiles />
        ) : visibleClients.length === 0 ? (
          <EmptyState
            title={searchText ? 'Nenhum cliente encontrado' : showArchived ? 'Nenhum cliente arquivado' : 'Nenhum cliente ainda'}
            hint={searchText ? undefined : showArchived ? undefined : 'Use o campo acima pra adicionar o primeiro.'}
          />
        ) : (
          <div className="client-grid fade-in">
            {visibleClients.map((c) => (
              <div className="client-tile" key={c.id}>
                <Link to={`/clientes/${c.slug}`} className="client-tile-link">
                  <span className="client-tile-name">{c.name}</span>
                  <span className="client-tile-slug">/clientes/{c.slug}</span>
                  {!c.archived_at && (overdueByClient[c.id] ?? 0) > 0 && (
                    <span className="overdue-badge">{overdueByClient[c.id]} atrasado{overdueByClient[c.id] === 1 ? '' : 's'}</span>
                  )}
                </Link>
                {c.archived_at ? (
                  <button className="btn-ghost" disabled={busyId === c.id} onClick={() => handleRestore(c.id)}>
                    Reativar
                  </button>
                ) : (
                  <button className="btn-danger-ghost" disabled={busyId === c.id} onClick={() => handleArchive(c.id)}>
                    Arquivar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
