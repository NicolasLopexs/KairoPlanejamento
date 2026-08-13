import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { generatePassword, suggestEmail } from '../lib/password'
import type { ClientRow } from '../lib/types'

interface AccessRow {
  id: string
  email: string | null
  full_name: string | null
  client_id: string | null
  created_at: string
}

async function callAccessFn(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-client-access', { body })
  if (error) {
    let message = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      try {
        const parsed = await ctx.clone().json()
        if (parsed?.error) message = parsed.error
      } catch {
        /* resposta sem corpo JSON, mantém a mensagem padrão */
      }
    }
    throw new Error(message)
  }
  return data as Record<string, unknown>
}

export function ClientAccessPanel({ client }: { client: ClientRow }) {
  const [accesses, setAccesses] = useState<AccessRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState(generatePassword())
  const [showPassword, setShowPassword] = useState(true)
  const [creating, setCreating] = useState(false)
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [accessesRes, clientsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, full_name, client_id, created_at')
        .eq('client_id', client.id)
        .eq('role', 'client'),
      supabase.from('clients').select('*').order('name'),
    ])
    setAccesses((accessesRes.data as AccessRow[]) ?? [])
    setClients((clientsRes.data as ClientRow[]) ?? [])
    setLoading(false)
  }, [client.id])

  useEffect(() => {
    setEmail(suggestEmail(client.slug))
    setLastCreated(null)
    load()
  }, [client.slug, load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      await callAccessFn({
        action: 'create',
        email: email.trim(),
        password,
        client_id: client.id,
        full_name: fullName.trim() || null,
      })
      setLastCreated({ email: email.trim(), password })
      setFullName('')
      setPassword(generatePassword())
      setEmail(suggestEmail(client.slug))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar acesso.')
    } finally {
      setCreating(false)
    }
  }

  async function handleResetPassword(id: string) {
    const newPassword = generatePassword()
    setBusyId(id)
    setError(null)
    try {
      await callAccessFn({ action: 'reset_password', user_id: id, password: newPassword })
      setResetPasswords((prev) => ({ ...prev, [id]: newPassword }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRelink(id: string, newClientId: string) {
    if (newClientId === client.id) return
    setBusyId(id)
    setError(null)
    try {
      await callAccessFn({ action: 'relink', user_id: id, client_id: newClientId })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mover acesso.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este acesso? O login deixará de funcionar.')) return
    setBusyId(id)
    setError(null)
    try {
      await callAccessFn({ action: 'delete', user_id: id })
      setResetPasswords((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover acesso.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <p className="sub">
        Crie um login pra este cliente acessar só o próprio cronograma. O e-mail não precisa ser real — só
        precisa ser único no sistema.
      </p>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="muted">Carregando acessos…</p>
      ) : accesses.length === 0 ? (
        <p className="muted">Nenhum acesso criado ainda para este cliente.</p>
      ) : (
        <div className="access-list">
          {accesses.map((a) => (
            <div className="access-row" key={a.id}>
              <div className="access-info">
                <span className="access-email">{a.email || '(sem e-mail salvo)'}</span>
                {a.full_name && <span className="access-name">{a.full_name}</span>}
              </div>
              <div className="access-actions">
                <select
                  className="access-move-select"
                  value={a.client_id ?? ''}
                  disabled={busyId === a.id}
                  onChange={(e) => handleRelink(a.id, e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost" disabled={busyId === a.id} onClick={() => handleResetPassword(a.id)}>
                  Redefinir senha
                </button>
                <button className="btn-danger-ghost" disabled={busyId === a.id} onClick={() => handleDelete(a.id)}>
                  Remover
                </button>
              </div>
              {resetPasswords[a.id] && (
                <p className="access-credential">
                  Nova senha: <code>{resetPasswords[a.id]}</code> — copie e envie pro cliente, ela não fica
                  salva aqui.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <form className="access-form" onSubmit={handleCreate}>
        <h3>Criar novo acesso</h3>
        <label>
          <span>E-mail de login (pode ser fictício)</span>
          <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Nome (opcional)</span>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label>
          <span>Senha</span>
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="btn-ghost" onClick={() => setPassword(generatePassword())}>
              Gerar outra
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </label>
        <button className="btn-primary" type="submit" disabled={creating}>
          {creating ? 'Criando…' : 'Criar acesso'}
        </button>
      </form>

      {lastCreated && (
        <p className="access-credential">
          Acesso criado! E-mail: <code>{lastCreated.email}</code> — Senha: <code>{lastCreated.password}</code>.
          Copie e envie pro cliente agora — essa senha não fica visível de novo depois.
        </p>
      )}
    </section>
  )
}
