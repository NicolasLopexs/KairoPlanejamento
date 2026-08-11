import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TopBar } from '../components/TopBar'
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
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*').order('name')
    if (!error && data) setClients(data as ClientRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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

        {loading ? (
          <p className="muted">Carregando clientes…</p>
        ) : clients.length === 0 ? (
          <p className="muted">Nenhum cliente ainda. Adicione o primeiro acima.</p>
        ) : (
          <div className="client-grid">
            {clients.map((c) => (
              <Link key={c.id} to={`/clientes/${c.slug}`} className="client-tile">
                <span className="client-tile-name">{c.name}</span>
                <span className="client-tile-slug">/clientes/{c.slug}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
