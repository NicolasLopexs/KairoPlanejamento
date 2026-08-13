import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { TopBar } from '../components/TopBar'
import { Editable } from '../components/Editable'
import { ClientAccessPanel } from '../components/ClientAccessPanel'
import { weekOf, weekdayFromDate } from '../lib/weekday'
import {
  PILLARS,
  STATUSES,
  type CaptureItem,
  type ClientRow,
  type FeedPost,
  type Pillar,
  type PostStatus,
  type StoryItem,
} from '../lib/types'

type Tab = 'feed' | 'stories' | 'captacao' | 'acesso'

const PILLAR_CLASS: Record<Pillar, string> = {
  Jogo: 'jogo',
  Lifestyle: 'lifestyle',
  Bastidores: 'bastidores',
  Engajamento: 'engajamento',
  Inspiração: 'inspiracao',
}

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

  const weeks = useMemo(() => {
    const groups = new Map<string, { label: string; items: FeedPost[] }>()
    for (const post of feed) {
      const { key, label } = weekOf(post.post_date)
      if (!groups.has(key)) groups.set(key, { label, items: [] })
      groups.get(key)!.items.push(post)
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v }))
  }, [feed])

  async function updateFeedPost(id: string, patch: Partial<FeedPost>) {
    setFeed((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    const { error } = await supabase.from('feed_posts').update(patch).eq('id', id)
    if (error) console.error(error.message)
  }

  async function addFeedPost() {
    if (!client) return
    const today = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        client_id: client.id,
        post_date: today,
        weekday: weekdayFromDate(today),
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
            <button className="tab" aria-selected={tab === 'acesso'} onClick={() => setTab('acesso')}>
              Acesso do Cliente
            </button>
          )}
        </div>

        {tab === 'feed' && (
          <section>
            <div className="legend">
              {PILLARS.map((p) => (
                <span className="chip" key={p}>
                  <span className={`dot dot-${PILLAR_CLASS[p]}`} />
                  {p}
                </span>
              ))}
            </div>

            {canManage && (
              <button className="btn-secondary" onClick={addFeedPost}>
                + Novo post
              </button>
            )}

            {weeks.length === 0 && <p className="muted">Nenhum post cadastrado ainda.</p>}

            {weeks.map((week) => (
              <div className="week" key={week.key}>
                <div className="week-head">
                  <span className="wk-range">{week.label}</span>
                </div>
                <div className="cards">
                  {week.items.map((item) => (
                    <div
                      className="card"
                      key={item.id}
                      style={
                        {
                          '--p-bg': `var(--p-${PILLAR_CLASS[item.pillar]}-bg)`,
                          '--p-fg': `var(--p-${PILLAR_CLASS[item.pillar]}-fg)`,
                          '--p-line': `var(--p-${PILLAR_CLASS[item.pillar]}-line)`,
                        } as React.CSSProperties
                      }
                    >
                      <div className="card-top">
                        <div className="date-badge">
                          <input
                            type="date"
                            className="date-input"
                            value={item.post_date}
                            onChange={(e) => {
                              const post_date = e.target.value
                              if (!post_date) return
                              updateFeedPost(item.id, { post_date, weekday: weekdayFromDate(post_date) })
                            }}
                          />
                          <span className="dow">{item.weekday}</span>
                        </div>
                        <div className="tag-row">
                          <Editable
                            as="span"
                            className="tag"
                            value={item.format}
                            onSave={(v) => updateFeedPost(item.id, { format: v })}
                          />
                          <select
                            className="pillar-select"
                            value={item.pillar}
                            style={
                              {
                                '--p-bg': `var(--p-${PILLAR_CLASS[item.pillar]}-bg)`,
                                '--p-fg': `var(--p-${PILLAR_CLASS[item.pillar]}-fg)`,
                              } as React.CSSProperties
                            }
                            onChange={(e) => updateFeedPost(item.id, { pillar: e.target.value as Pillar })}
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
                      <Editable
                        className="tema"
                        value={item.tema}
                        onSave={(v) => updateFeedPost(item.id, { tema: v })}
                      />

                      <div className="field-label">Legenda / CTA sugerida</div>
                      <Editable
                        className="legenda"
                        value={item.legenda}
                        onSave={(v) => updateFeedPost(item.id, { legenda: v })}
                      />

                      <div className="card-bottom">
                        <select
                          className={`status-select status-${item.status}`}
                          value={item.status}
                          onChange={(e) => updateFeedPost(item.id, { status: e.target.value as PostStatus })}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {canManage && (
                          <button className="btn-danger-ghost" onClick={() => deleteFeedPost(item.id)}>
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'stories' && (
          <section>
            <p className="sub">
              Padrão semanal — repetir todas as semanas, usando material de bastidores enviado pelo cliente.
            </p>
            {canManage && (
              <button className="btn-secondary" onClick={addStory}>
                + Novo dia
              </button>
            )}
            <div className="story-grid">
              {stories.map((item) => (
                <div className="story-card" key={item.id}>
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
            <p className="sub">O que pedir para o cliente gravar/fotografar.</p>
            {canManage && (
              <button className="btn-secondary" onClick={addCapture}>
                + Novo item
              </button>
            )}
            <div className="capture-list">
              {captacao.map((item) => (
                <div className="capture-row" key={item.id}>
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

        {tab === 'acesso' && canManage && <ClientAccessPanel client={client} />}
      </main>
    </div>
  )
}
