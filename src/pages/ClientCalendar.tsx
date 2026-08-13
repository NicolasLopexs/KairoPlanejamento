import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { Editable } from '../components/Editable'
import { ClientAccessPanel } from '../components/ClientAccessPanel'
import { FeedPostCard } from '../components/FeedPostCard'
import { FeedCalendar } from '../components/FeedCalendar'
import { FeedStats } from '../components/FeedStats'
import { ActivityLog } from '../components/ActivityLog'
import { weekOf, weekdayFromDate } from '../lib/weekday'
import { downloadCsv, feedToCsv } from '../lib/csv'
import {
  PILLAR_CLASS,
  PILLARS,
  STATUSES,
  type CaptureItem,
  type ClientRow,
  type FeedPost,
  type Pillar,
  type PostStatus,
  type StoryItem,
} from '../lib/types'

type Tab = 'feed' | 'stories' | 'captacao' | 'historico' | 'acesso'
type FeedView = 'lista' | 'calendario'

export function ClientCalendar() {
  const { slug } = useParams<{ slug: string }>()
  const { profile } = useAuth()
  const canManage = profile?.role === 'staff'

  const [client, setClient] = useState<ClientRow | null>(null)
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [stories, setStories] = useState<StoryItem[]>([])
  const [captacao, setCaptacao] = useState<CaptureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<Tab>('feed')
  const [feedView, setFeedView] = useState<FeedView>('lista')
  const [searchText, setSearchText] = useState('')
  const [activePillars, setActivePillars] = useState<Set<Pillar>>(new Set(PILLARS))
  const [activeStatuses, setActiveStatuses] = useState<Set<PostStatus>>(
    new Set(STATUSES.map((s) => s.value))
  )
  const [draggedStoryId, setDraggedStoryId] = useState<string | null>(null)
  const [draggedCaptureId, setDraggedCaptureId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setNotFound(false)
      const { data: clientRow, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return
      if (clientErr || !clientRow) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setClient(clientRow as ClientRow)

      const [feedRes, storiesRes, captacaoRes] = await Promise.all([
        supabase.from('feed_posts').select('*').eq('client_id', clientRow.id).order('post_date'),
        supabase.from('stories_template').select('*').eq('client_id', clientRow.id).order('sort_order'),
        supabase.from('capture_guide').select('*').eq('client_id', clientRow.id).order('sort_order'),
      ])
      if (cancelled) return
      setFeed((feedRes.data as FeedPost[]) ?? [])
      setStories((storiesRes.data as StoryItem[]) ?? [])
      setCaptacao((captacaoRes.data as CaptureItem[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  const filteredFeed = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return feed.filter(
      (p) =>
        activePillars.has(p.pillar) &&
        activeStatuses.has(p.status) &&
        (!q || p.tema.toLowerCase().includes(q) || p.legenda.toLowerCase().includes(q))
    )
  }, [feed, searchText, activePillars, activeStatuses])

  const weeks = useMemo(() => {
    const groups = new Map<string, { label: string; items: FeedPost[] }>()
    for (const post of filteredFeed) {
      const { key, label } = weekOf(post.post_date)
      if (!groups.has(key)) groups.set(key, { label, items: [] })
      groups.get(key)!.items.push(post)
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v }))
  }, [filteredFeed])

  function togglePillarFilter(p: Pillar) {
    setActivePillars((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function toggleStatusFilter(s: PostStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  async function updateFeedPost(id: string, patch: Partial<FeedPost>) {
    setFeed((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error } = await supabase.from('feed_posts').update(patch).eq('id', id)
    if (error) console.error(error.message)
  }

  async function addFeedPost(onDate?: string) {
    if (!client) return
    const post_date = onDate ?? new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        client_id: client.id,
        post_date,
        weekday: weekdayFromDate(post_date),
        week_label: '',
        format: 'Reels',
        pillar: 'Jogo',
        tema: 'Novo post',
        legenda: '',
        status: 'planejado',
      })
      .select()
      .single()
    if (error) return console.error(error.message)
    setFeed((prev) => [...prev, data as FeedPost])
  }

  async function deleteFeedPost(id: string) {
    if (!confirm('Remover este post do cronograma?')) return
    setFeed((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from('feed_posts').delete().eq('id', id)
    if (error) console.error(error.message)
  }

  async function updateStory(id: string, patch: Partial<StoryItem>) {
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    const { error } = await supabase.from('stories_template').update(patch).eq('id', id)
    if (error) console.error(error.message)
  }

  async function addStory() {
    if (!client) return
    const nextOrder = stories.length ? Math.max(...stories.map((s) => s.sort_order)) + 1 : 1
    const { data, error } = await supabase
      .from('stories_template')
      .insert({ client_id: client.id, weekday: 'Novo dia', tipo: '', ideia: '', sort_order: nextOrder })
      .select()
      .single()
    if (error) return console.error(error.message)
    setStories((prev) => [...prev, data as StoryItem])
  }

  async function deleteStory(id: string) {
    if (!confirm('Remover este dia do guia de stories?')) return
    setStories((prev) => prev.filter((s) => s.id !== id))
    const { error } = await supabase.from('stories_template').delete().eq('id', id)
    if (error) console.error(error.message)
  }

  function reorderStories(targetId: string) {
    const draggedId = draggedStoryId
    setDraggedStoryId(null)
    if (!draggedId || draggedId === targetId) return
    setStories((prev) => {
      const fromIdx = prev.findIndex((s) => s.id === draggedId)
      const toIdx = prev.findIndex((s) => s.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      next.forEach((item, i) => {
        supabase
          .from('stories_template')
          .update({ sort_order: i })
          .eq('id', item.id)
          .then(({ error }) => error && console.error(error.message))
      })
      return next.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  async function updateCapture(id: string, patch: Partial<CaptureItem>) {
    setCaptacao((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    const { error } = await supabase.from('capture_guide').update(patch).eq('id', id)
    if (error) console.error(error.message)
  }

  async function addCapture() {
    if (!client) return
    const nextOrder = captacao.length ? Math.max(...captacao.map((c) => c.sort_order)) + 1 : 1
    const { data, error } = await supabase
      .from('capture_guide')
      .insert({ client_id: client.id, momento: 'Novo momento', detalhe: '', sort_order: nextOrder })
      .select()
      .single()
    if (error) return console.error(error.message)
    setCaptacao((prev) => [...prev, data as CaptureItem])
  }

  async function deleteCapture(id: string) {
    if (!confirm('Remover este item da orientação de captação?')) return
    setCaptacao((prev) => prev.filter((c) => c.id !== id))
    const { error } = await supabase.from('capture_guide').delete().eq('id', id)
    if (error) console.error(error.message)
  }

  function reorderCapture(targetId: string) {
    const draggedId = draggedCaptureId
    setDraggedCaptureId(null)
    if (!draggedId || draggedId === targetId) return
    setCaptacao((prev) => {
      const fromIdx = prev.findIndex((c) => c.id === draggedId)
      const toIdx = prev.findIndex((c) => c.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      next.forEach((item, i) => {
        supabase
          .from('capture_guide')
          .update({ sort_order: i })
          .eq('id', item.id)
          .then(({ error }) => error && console.error(error.message))
      })
      return next.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  if (loading) return <div className="page-loading">Carregando cronograma…</div>
  if (notFound || !client) {
    return (
      <div className="page-loading">
        Cliente não encontrado, ou você não tem acesso a este cronograma.
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar eyebrow="Cronograma de Clientes" title={client.name} />
      <main className="page-content">
        <div className="tabs" role="tablist">
          <button className="tab" aria-selected={tab === 'feed'} onClick={() => setTab('feed')}>
            Cronograma — Feed
          </button>
          <button className="tab" aria-selected={tab === 'stories'} onClick={() => setTab('stories')}>
            Guia — Stories
          </button>
          <button className="tab" aria-selected={tab === 'captacao'} onClick={() => setTab('captacao')}>
            Orientações de Captação
          </button>
          {canManage && (
            <button className="tab" aria-selected={tab === 'historico'} onClick={() => setTab('historico')}>
              Histórico
            </button>
          )}
          {canManage && (
            <button className="tab" aria-selected={tab === 'acesso'} onClick={() => setTab('acesso')}>
              Acesso do Cliente
            </button>
          )}
        </div>

        {tab === 'feed' && (
          <section>
            <FeedStats feed={feed} />

            <div className="filters-row">
              <div className="legend">
                {PILLARS.map((p) => (
                  <button
                    key={p}
                    className={`chip chip-toggle ${activePillars.has(p) ? '' : 'chip-off'}`}
                    onClick={() => togglePillarFilter(p)}
                  >
                    <span className={`dot dot-${PILLAR_CLASS[p]}`} />
                    {p}
                  </button>
                ))}
              </div>
              <div className="legend">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    className={`chip chip-toggle ${activeStatuses.has(s.value) ? '' : 'chip-off'}`}
                    onClick={() => toggleStatusFilter(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <input
                type="search"
                className="filter-search"
                placeholder="Buscar por tema ou legenda…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div className="feed-toolbar">
              <div className="tabs feed-view-toggle" role="tablist">
                <button className="tab" aria-selected={feedView === 'lista'} onClick={() => setFeedView('lista')}>
                  Lista
                </button>
                <button className="tab" aria-selected={feedView === 'calendario'} onClick={() => setFeedView('calendario')}>
                  Calendário
                </button>
              </div>
              <div className="feed-toolbar-actions">
                {canManage && feedView === 'lista' && (
                  <button className="btn-secondary" onClick={() => addFeedPost()}>
                    + Novo post
                  </button>
                )}
                <button
                  className="btn-ghost"
                  onClick={() => downloadCsv(`cronograma-${client.slug}.csv`, feedToCsv(filteredFeed))}
                  disabled={filteredFeed.length === 0}
                >
                  Exportar CSV
                </button>
              </div>
            </div>

            {feed.length === 0 && <p className="muted">Nenhum post cadastrado ainda.</p>}
            {feed.length > 0 && filteredFeed.length === 0 && <p className="muted">Nenhum post encontrado com esses filtros.</p>}

            {feedView === 'lista' &&
              weeks.map((week) => (
                <div className="week" key={week.key}>
                  <div className="week-head">
                    <span className="wk-range">{week.label}</span>
                  </div>
                  <div className="cards">
                    {week.items.map((item) => (
                      <FeedPostCard key={item.id} post={item} canManage={canManage} onUpdate={updateFeedPost} onDelete={deleteFeedPost} />
                    ))}
                  </div>
                </div>
              ))}

            {feedView === 'calendario' && (
              <FeedCalendar
                feed={filteredFeed}
                canManage={canManage}
                onUpdate={updateFeedPost}
                onDelete={deleteFeedPost}
                onAddOnDate={(date) => addFeedPost(date)}
              />
            )}
          </section>
        )}

        {tab === 'stories' && (
          <section>
            <p className="sub">
              Padrão semanal — repetir todas as semanas, usando material de bastidores enviado pelo cliente.
              Arraste os cards pra reordenar.
            </p>
            {canManage && (
              <button className="btn-secondary" onClick={addStory}>
                + Novo dia
              </button>
            )}
            <div className="story-grid">
              {stories.map((item) => (
                <div
                  className={`story-card ${draggedStoryId === item.id ? 'dragging' : ''}`}
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedStoryId(item.id)}
                  onDragEnd={() => setDraggedStoryId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorderStories(item.id)}
                >
                  <Editable as="span" className="story-day" value={item.weekday} onSave={(v) => updateStory(item.id, { weekday: v })} />
                  <Editable as="span" className="story-type" value={item.tipo} onSave={(v) => updateStory(item.id, { tipo: v })} />
                  <Editable className="story-idea" value={item.ideia} onSave={(v) => updateStory(item.id, { ideia: v })} />
                  {canManage && (
                    <button className="btn-danger-ghost" onClick={() => deleteStory(item.id)}>
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'captacao' && (
          <section>
            <p className="sub">O que pedir para o cliente gravar/fotografar. Arraste as linhas pra reordenar.</p>
            {canManage && (
              <button className="btn-secondary" onClick={addCapture}>
                + Novo item
              </button>
            )}
            <div className="capture-list">
              {captacao.map((item) => (
                <div
                  className={`capture-row ${draggedCaptureId === item.id ? 'dragging' : ''}`}
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggedCaptureId(item.id)}
                  onDragEnd={() => setDraggedCaptureId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorderCapture(item.id)}
                >
                  <Editable as="span" className="moment" value={item.momento} onSave={(v) => updateCapture(item.id, { momento: v })} />
                  <Editable className="detail" value={item.detalhe} onSave={(v) => updateCapture(item.id, { detalhe: v })} />
                  {canManage && (
                    <button className="btn-danger-ghost" onClick={() => deleteCapture(item.id)}>
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'historico' && canManage && <ActivityLog clientId={client.id} />}

        {tab === 'acesso' && canManage && <ClientAccessPanel client={client} />}
      </main>
    </div>
  )
}
