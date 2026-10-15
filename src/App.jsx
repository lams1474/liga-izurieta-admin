import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Jugadores from './pages/Jugadores'
import ImportarJugadores from './pages/ImportarJugadores'
import Usuarios from './pages/Usuarios'
import Equipos from './pages/Equipos'
import Pagos from './pages/Pagos'
import Calendario from './pages/Calendario'
import Sanciones from './pages/Sanciones'
import Actas from './pages/Actas'
import Reportes from './pages/Reportes'
import MiCarnet from './pages/MiCarnet'
import MisJugadores from './pages/MisJugadores'
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
        path="/reportes"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria']}>
            <Layout>
              <Reportes />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/actas"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria', 'vocal', 'arbitro', 'capitan']}>
            <Layout>
              <Actas />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/sanciones"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria', 'delegado']}>
            <Layout>
              <Sanciones />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendario"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria', 'delegado', 'vocal', 'arbitro']}>
            <Layout>
              <Calendario />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pagos"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria']}>
            <Layout>
              <Pagos />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/equipos"
        element={
          <ProtectedRoute rolesPermitidos={['admin', 'secretaria']}>
            <Layout>
              <Equipos />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rutas del admin/secretaría */}
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

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute rolesPermitidos={['admin']}>
            <Layout>
              <Usuarios />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rutas del jugador */}
      <Route
        path="/mi-carnet"
        element={
          <ProtectedRoute>
            <Layout>
              <MiCarnet />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/carnet-digital"
        element={
          <ProtectedRoute>
            <Layout>
              <MiCarnet />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Rutas del presidente */}
      <Route
        path="/mis-jugadores"
        element={
          <ProtectedRoute rolesPermitidos={['delegado']}>
            <Layout>
              <MisJugadores />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App