import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function AccountMenu() {
  const { profile, refreshProfile } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  if (!profile) return null

  function toggle() {
    setOpen((v) => !v)
    setName(profile!.full_name ?? '')
    setNameMsg(null)
    setPasswordMsg(null)
    setPasswordError(null)
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameMsg(null)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() || null }).eq('id', profile!.id)
    setSavingName(false)
    if (error) {
      setNameMsg(error.message)
      return
    }
    await refreshProfile()
    setNameMsg('Nome atualizado.')
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMsg(null)
    if (newPassword.length < 6) {
      setPasswordError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg('Senha alterada.')
  }

  return (
    <div className="account-menu">
      <button className="who who-button" onClick={toggle}>
        {profile.full_name || 'Sem nome'} · {profile.role === 'staff' ? 'equipe' : 'cliente'}
      </button>
      {open && (
        <div className="account-panel">
          {profile.role === 'staff' && (
            <form className="account-section" onSubmit={handleSaveName}>
              <span className="account-section-title">Meu nome</span>
              <div className="account-inline-field">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                <button className="btn-ghost" type="submit" disabled={savingName}>
                  {savingName ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
              {nameMsg && <p className="account-msg">{nameMsg}</p>}
            </form>
          )}

          <form className="account-section" onSubmit={handleChangePassword}>
            <span className="account-section-title">Trocar senha</span>
            <input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passwordError && <p className="account-msg account-msg-error">{passwordError}</p>}
            {passwordMsg && <p className="account-msg">{passwordMsg}</p>}
            <button className="btn-secondary" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Alterando…' : 'Alterar senha'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
