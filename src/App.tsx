import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { StaffDashboard } from './pages/StaffDashboard'
import { ClientCalendar } from './pages/ClientCalendar'

function Home() {
  const { profile, loading } = useAuth()
  if (loading || !profile) return <div className="page-loading">Carregando…</div>
  if (profile.role === 'staff') return <StaffDashboard />
  if (profile.clients) return <Navigate to={`/clientes/${profile.clients.slug}`} replace />
  return (
    <div className="page-loading">
      Seu login ainda não está associado a nenhum cliente. Peça para a equipe configurar seu acesso.
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes/:slug"
                element={
                  <ProtectedRoute>
                    <ClientCalendar />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
