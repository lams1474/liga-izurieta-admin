import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Jugadores from './pages/Jugadores'
import ImportarJugadores from './pages/ImportarJugadores'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { estaAutenticado, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-liga-azul">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={estaAutenticado ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jugadores"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria']}>
            <Layout>
              <Jugadores />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/jugadores/importar"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria']}>
            <Layout>
              <ImportarJugadores />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App