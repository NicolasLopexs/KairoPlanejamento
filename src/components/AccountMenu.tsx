import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function AccountMenu() {
  const { profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(profile?.full_name ?? '')
  const [savingName, setSavingName] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  if (!profile) return null

  function toggle() {
    setOpen((v) => !v)
    setName(profile!.full_name ?? '')
    setPasswordError(null)
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() || null }).eq('id', profile!.id)
    setSavingName(false)
    if (error) {
      toast.error(error.message)
      return
    }
    await refreshProfile()
    toast.success('Nome atualizado.')
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
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
      toast.error(error.message)
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Senha alterada.')
  }

  return (
    <div className="account-menu">
      <button className="who who-button" onClick={toggle}>
        {profile.full_name || 'Sem nome'} · {profile.role === 'staff' ? 'equipe' : 'cliente'}
      </button>
      {open && (
        <div className="account-panel fade-in">
          {profile.role === 'staff' && (
            <form className="account-section" onSubmit={handleSaveName}>
              <span className="account-section-title">Meu nome</span>
              <div className="account-inline-field">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
                <button className="btn-ghost" type="submit" disabled={savingName}>
                  {savingName ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
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
            <button className="btn-secondary" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Alterando…' : 'Alterar senha'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
