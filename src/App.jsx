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
import RegistroJugador from './pages/RegistroJugador'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

// Componente que decide qué mostrar en "/" según el rol
function HomeRedirect() {
  const { usuario } = useAuth()

  // Los jugadores van directo a su carnet
  if (usuario?.rol === 'jugador') {
    return <Navigate to="/mi-carnet" replace />
  }

  // Los demás ven el Dashboard
  return <Dashboard />
}

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
        path="/registro"
        element={estaAutenticado ? <Navigate to="/" replace /> : <RegistroJugador />}
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <HomeRedirect />
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

      {/* Ruta del carnet - accesible para TODOS los roles */}
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