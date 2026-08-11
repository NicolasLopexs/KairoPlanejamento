import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function TopBar({ title, eyebrow }: { title: string; eyebrow: string }) {
  const { profile, signOut } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div>
          <Link to={profile?.role === 'staff' ? '/' : '#'} className="eyebrow-link">
            {eyebrow}
          </Link>
          <h1>{title}</h1>
        </div>
        <div className="topbar-actions">
          {profile && (
            <span className="who">
              {profile.full_name || 'Sem nome'} · {profile.role === 'staff' ? 'equipe' : 'cliente'}
            </span>
          )}
          <button className="btn-ghost" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
